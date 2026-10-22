"""
Multi-Model Vital Signs Anomaly Detection Service.
Loads and runs the three trained models:
  1. models/isolation_forest_model.pkl
  2. models/one_class_svm_model.pkl
  3. models/autoencoder_model.pt

Original 5-feature input order:
  [heart_rate, spo2, ecg, bp_systolic, bp_diastolic]
"""

from pathlib import Path
import pickle
import numpy as np

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    nn = None
    TORCH_AVAILABLE = False

from app.config import settings

# Base directory of the backend
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

ISO_PATH = MODELS_DIR / "isolation_forest_model.pkl"
SVM_PATH = MODELS_DIR / "one_class_svm_model.pkl"
AE_PATH = MODELS_DIR / "autoencoder_model.pt"

FIVE_FEATURES = ["heart_rate", "spo2", "ecg", "bp_systolic", "bp_diastolic"]


if TORCH_AVAILABLE:
    class PyTorchAutoencoder(nn.Module):
        """Original Deep Autoencoder architecture from ml/train_model.py."""
        def __init__(self, input_dim=5):
            super(PyTorchAutoencoder, self).__init__()
            # Encoder: input_dim -> 16 -> 8 -> 4
            self.encoder = nn.Sequential(
                nn.Linear(input_dim, 16),
                nn.ReLU(),
                nn.Linear(16, 8),
                nn.ReLU(),
                nn.Linear(8, 4),
                nn.ReLU()
            )
            # Decoder: 4 -> 8 -> 16 -> input_dim
            self.decoder = nn.Sequential(
                nn.Linear(4, 8),
                nn.ReLU(),
                nn.Linear(8, 16),
                nn.ReLU(),
                nn.Linear(16, input_dim)
            )

        def forward(self, x):
            encoded = self.encoder(x)
            decoded = self.decoder(encoded)
            return decoded
else:
    class PyTorchAutoencoder:
        def __init__(self, *args, **kwargs):
            pass


class ModelRegistry:
    def __init__(self):
        self.isolation_forest = None
        self.one_class_svm = None
        self.autoencoder = None
        self.ae_scaler = None
        self.ae_threshold = None
        self._load_all()

    def _load_all(self):
        # 1. Isolation Forest
        if ISO_PATH.exists():
            try:
                with open(ISO_PATH, "rb") as f:
                    self.isolation_forest = pickle.load(f)
            except Exception:
                self.isolation_forest = None

        # 2. One-Class SVM
        if SVM_PATH.exists():
            try:
                with open(SVM_PATH, "rb") as f:
                    self.one_class_svm = pickle.load(f)
            except Exception:
                self.one_class_svm = None

        # 3. PyTorch Autoencoder
        if AE_PATH.exists() and TORCH_AVAILABLE and torch is not None:
            try:
                checkpoint = torch.load(AE_PATH, map_location="cpu")
                input_dim = checkpoint.get("input_dim", 5)
                self.ae_threshold = float(checkpoint.get("threshold", 0.9226855874061586))
                self.ae_scaler = checkpoint.get("scaler")

                ae_net = PyTorchAutoencoder(input_dim=input_dim)
                ae_net.load_state_dict(checkpoint["model_state_dict"])
                ae_net.eval()
                self.autoencoder = ae_net
            except Exception:
                self.autoencoder = None


registry = ModelRegistry()


def get_model():
    """Backward-compatible helper returning the primary Isolation Forest model."""
    return registry.isolation_forest


def get_models_status():
    """Return loading status and configuration for all three models."""
    return {
        "all_loaded": bool(
            registry.isolation_forest is not None
            and registry.one_class_svm is not None
            and registry.autoencoder is not None
        ),
        "models": {
            "isolation_forest": {
                "loaded": registry.isolation_forest is not None,
                "path": str(ISO_PATH),
                "features_expected": FIVE_FEATURES
            },
            "one_class_svm": {
                "loaded": registry.one_class_svm is not None,
                "path": str(SVM_PATH),
                "features_expected": FIVE_FEATURES
            },
            "autoencoder": {
                "loaded": registry.autoencoder is not None,
                "path": str(AE_PATH),
                "input_dim": 5,
                "threshold": registry.ae_threshold,
                "scaler_loaded": registry.ae_scaler is not None
            }
        }
    }


def analyze_values(hr, spo2, temp=None, ecg=None, bp_systolic=None, bp_diastolic=None):
    """
    Evaluates incoming vital signs against physiological bounds and AI models.
    
    - Rejects missing basic sensor telemetry with INSUFFICIENT_DATA.
    - Rejects unphysical or disconnected readings with INVALID_OR_SUSPECT_DATA.
    - If hardware telemetry is provided (HR, SpO2, Temp) but lacks ECG and BP:
      Explains clearly that 5 features are required by the AI models and rejects
      inference without inventing dummy readings or misusing temperature.
    - If all 5 features are provided:
      Evaluates all 3 models separately and returns predictions, scores, and ensemble.
    """
    # 1. Essential telemetry presence check
    if hr is None or spo2 is None:
        return {
            "result": "INSUFFICIENT_DATA",
            "anomaly_score": None,
            "explanation": "Missing required sensor readings (heart rate or SpO2).",
            "data_quality_status": "incomplete",
            "predictions": None
        }

    # 2. Physiological plausibility checks
    if not (25 <= hr <= 240 and 50 <= spo2 <= 100):
        return {
            "result": "INVALID_OR_SUSPECT_DATA",
            "anomaly_score": None,
            "explanation": "Heart rate or SpO2 outside plausible physiological bounds. Check sensor placement.",
            "data_quality_status": "suspect",
            "predictions": None
        }

    if temp is not None and not (25.0 <= temp <= 45.0):
        return {
            "result": "INVALID_OR_SUSPECT_DATA",
            "anomaly_score": None,
            "explanation": "Body temperature outside plausible range (25.0°C - 45.0°C). Check probe contact.",
            "data_quality_status": "suspect",
            "predictions": None
        }

    # 3. Check for the remaining 5-feature vital signs
    missing_features = []
    if ecg is None:
        missing_features.append("ecg")
    if bp_systolic is None:
        missing_features.append("bp_systolic")
    if bp_diastolic is None:
        missing_features.append("bp_diastolic")

    if missing_features:
        return {
            "result": "INCOMPLETE_FEATURES",
            "anomaly_score": None,
            "explanation": (
                f"Hardware telemetry contains heart rate, SpO2, and temperature, but lacks: {missing_features}. "
                "The 3 trained AI models strictly require all 5 features (heart_rate, spo2, ecg, bp_systolic, bp_diastolic). "
                "Temperature is preserved for database storage and physiological monitoring, but cannot be substituted into ECG or blood pressure fields."
            ),
            "data_quality_status": "valid_hardware_telemetry",
            "temperature_c": temp,
            "predictions": None
        }

    # 4. Verify models are loaded
    status = get_models_status()
    if not status["all_loaded"]:
        return {
            "result": "MODELS_NOT_LOADED",
            "anomaly_score": None,
            "explanation": "One or more 5-feature AI models are not loaded. Ensure model files are present.",
            "data_quality_status": "valid",
            "models_status": status
        }

    # 5. Full 5-feature input evaluation
    import pandas as pd
    raw_5 = pd.DataFrame(
        [[float(hr), float(spo2), float(ecg), float(bp_systolic), float(bp_diastolic)]],
        columns=FIVE_FEATURES
    )

    # Model 1: Isolation Forest
    iso_pred = int(registry.isolation_forest.predict(raw_5)[0])
    iso_score = float(registry.isolation_forest.decision_function(raw_5)[0])

    # Model 2: One-Class SVM
    svm_pred = int(registry.one_class_svm.predict(raw_5)[0])
    svm_score = float(registry.one_class_svm.decision_function(raw_5)[0])

    # Model 3: PyTorch Autoencoder
    if registry.autoencoder is not None and TORCH_AVAILABLE and torch is not None:
        scaled_5 = registry.ae_scaler.transform(raw_5)
        tensor_5 = torch.tensor(scaled_5, dtype=torch.float32)
        with torch.no_grad():
            recon_5 = registry.autoencoder(tensor_5)
            recon_mse = float(torch.mean((tensor_5 - recon_5) ** 2).item())
        ae_pred = -1 if recon_mse > registry.ae_threshold else 1
    else:
        recon_mse = 0.0
        ae_pred = iso_pred

    # Ensemble decision: Flag as anomaly if at least 2 models flag -1
    votes = [iso_pred, svm_pred, ae_pred]
    is_anomaly = votes.count(-1) >= 2

    return {
        "result": "UNUSUAL_PATTERN" if is_anomaly else "NO_UNUSUAL_PATTERN",
        "anomaly_score": iso_score,
        "explanation": "Multi-model vital sign anomaly screening completed across Isolation Forest, One-Class SVM, and PyTorch Autoencoder.",
        "data_quality_status": "valid",
        "temperature_c": temp,
        "ensemble_anomaly": is_anomaly,
        "models": {
            "isolation_forest": {
                "prediction": "anomaly" if iso_pred == -1 else "normal",
                "label": iso_pred,
                "score": iso_score
            },
            "one_class_svm": {
                "prediction": "anomaly" if svm_pred == -1 else "normal",
                "label": svm_pred,
                "score": svm_score
            },
            "autoencoder": {
                "prediction": "anomaly" if ae_pred == -1 else "normal",
                "label": ae_pred,
                "reconstruction_mse": recon_mse,
                "threshold": registry.ae_threshold
            }
        }
    }
