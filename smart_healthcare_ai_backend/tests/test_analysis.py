import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.analysis import analyze_values, get_models_status


def test_model_loading_and_status():
    """Verify that all three original models are successfully loaded from disk."""
    status = get_models_status()
    assert status["all_loaded"] is True
    
    # 1. Isolation Forest
    iso = status["models"]["isolation_forest"]
    assert iso["loaded"] is True
    assert iso["features_expected"] == ["heart_rate", "spo2", "ecg", "bp_systolic", "bp_diastolic"]
    
    # 2. One-Class SVM
    svm = status["models"]["one_class_svm"]
    assert svm["loaded"] is True
    assert svm["features_expected"] == ["heart_rate", "spo2", "ecg", "bp_systolic", "bp_diastolic"]
    
    # 3. PyTorch Autoencoder
    ae = status["models"]["autoencoder"]
    assert ae["loaded"] is True
    assert ae["input_dim"] == 5
    assert ae["threshold"] > 0.0
    assert ae["scaler_loaded"] is True

def test_missing_data():
    """Missing essential hardware sensor values should return INSUFFICIENT_DATA."""
    res1 = analyze_values(None, 98.0, 36.5)
    assert res1["result"] == "INSUFFICIENT_DATA"
    
    res2 = analyze_values(75.0, None, 36.5)
    assert res2["result"] == "INSUFFICIENT_DATA"

def test_implausible_data():
    """Unphysical sensor artifacts should return INVALID_OR_SUSPECT_DATA."""
    # Implausible heart rate
    assert analyze_values(0, 98.0, 36.5)["result"] == "INVALID_OR_SUSPECT_DATA"
    assert analyze_values(300, 98.0, 36.5)["result"] == "INVALID_OR_SUSPECT_DATA"
    
    # Implausible SpO2
    assert analyze_values(75.0, 45.0, 36.5)["result"] == "INVALID_OR_SUSPECT_DATA"
    assert analyze_values(75.0, 105.0, 36.5)["result"] == "INVALID_OR_SUSPECT_DATA"
    
    # Implausible body temperature
    assert analyze_values(75.0, 98.0, 20.0)["result"] == "INVALID_OR_SUSPECT_DATA"
    assert analyze_values(75.0, 98.0, 50.0)["result"] == "INVALID_OR_SUSPECT_DATA"

def test_hardware_telemetry_missing_features():
    """Hardware provides HR, SpO2, and Temp, but lacks ECG and BP. Should reject gracefully without inventing data."""
    res = analyze_values(hr=76.0, spo2=98.0, temp=36.7)
    assert res["result"] == "INCOMPLETE_FEATURES"
    assert res["data_quality_status"] == "valid_hardware_telemetry"
    assert res["temperature_c"] == 36.7
    assert res["predictions"] is None
    assert "lacks: ['ecg', 'bp_systolic', 'bp_diastolic']" in res["explanation"]
    assert "cannot be substituted" in res["explanation"]

def test_full_five_feature_normal_inference():
    """When all 5 features are provided, all 3 models must return separate predictions and scores."""
    res = analyze_values(
        hr=75.0,
        spo2=98.0,
        temp=36.6,
        ecg=0.1,
        bp_systolic=115.0,
        bp_diastolic=75.0
    )
    assert res["result"] in ["NO_UNUSUAL_PATTERN", "UNUSUAL_PATTERN"]
    assert res["data_quality_status"] == "valid"
    assert res["temperature_c"] == 36.6
    assert "models" in res
    
    # Isolation Forest
    iso_res = res["models"]["isolation_forest"]
    assert iso_res["prediction"] in ["normal", "anomaly"]
    assert iso_res["label"] in [1, -1]
    assert isinstance(iso_res["score"], float)
    
    # One-Class SVM
    svm_res = res["models"]["one_class_svm"]
    assert svm_res["prediction"] in ["normal", "anomaly"]
    assert svm_res["label"] in [1, -1]
    assert isinstance(svm_res["score"], float)
    
    # PyTorch Autoencoder
    ae_res = res["models"]["autoencoder"]
    assert ae_res["prediction"] in ["normal", "anomaly"]
    assert ae_res["label"] in [1, -1]
    assert ae_res["reconstruction_mse"] >= 0.0
    assert ae_res["threshold"] > 0.0

def test_full_five_feature_extreme_anomaly():
    """Extreme out-of-distribution values should be flagged by the models."""
    res = analyze_values(
        hr=220.0,
        spo2=55.0,
        temp=39.5,
        ecg=-0.95,
        bp_systolic=220.0,
        bp_diastolic=135.0
    )
    assert res["result"] == "UNUSUAL_PATTERN"
    assert res["ensemble_anomaly"] is True
    # At least two models should flag an anomaly (-1)
    votes = [
        res["models"]["isolation_forest"]["label"],
        res["models"]["one_class_svm"]["label"],
        res["models"]["autoencoder"]["label"]
    ]
    assert votes.count(-1) >= 2


def test_health_endpoints():
    """Verify that /, /health, /healthz, and /api/v1/health return 200 OK."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    for path in ["/", "/health", "/healthz", "/api/v1/health"]:
        resp = client.get(path)
        assert resp.status_code == 200
        assert "status" in resp.json() or "message" in resp.json()


def test_readiness_endpoint():
    """Verify that /ready returns models and database status."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    resp = client.get("/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "models" in data
    assert data["models"] == "all_loaded"
