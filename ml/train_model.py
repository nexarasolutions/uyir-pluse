#!/usr/bin/env python3
"""
Model Training Pipeline for Remote Patient Monitoring Vitals Anomaly Detection.
Supports Isolation Forest, One-Class SVM, and PyTorch Autoencoder.
"""

import os
import sys
import argparse
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset


class PyTorchAutoencoder(nn.Module):
    """Deep Autoencoder for vital signs anomaly detection."""
    def __init__(self, input_dim):
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


def resolve_data_path(csv_path):
    """Resolve the dataset file path with sensible fallbacks."""
    if csv_path and os.path.exists(csv_path):
        return csv_path
    
    candidates = [
        csv_path,
        'data/vitals.csv',
        'data/sample_vitals_large.csv',
        'data/sample_vitals.csv',
        'data.csv'
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
            
    raise FileNotFoundError(
        f"Could not find dataset at '{csv_path}' or any default fallback paths {candidates}"
    )


def load_and_preprocess_data(file_path):
    """Load vitals CSV data and preprocess numeric features."""
    resolved_path = resolve_data_path(file_path)
    print(f"Loading vitals dataset from: {resolved_path}")
    data = pd.read_csv(resolved_path)
    
    # Handle missing values
    data = data.ffill().bfill()
    
    # Select numeric features
    features_df = data.select_dtypes(include=['float64', 'int64', 'float32', 'int32'])
    print(f"Loaded {len(features_df)} records with features: {list(features_df.columns)}")
    return data, features_df


def train_isolation_forest(features, contamination=0.1, random_state=42):
    """Train Isolation Forest model."""
    print("\n--- Training Isolation Forest ---")
    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=random_state
    )
    model.fit(features)
    preds = model.predict(features)
    normal_count = np.sum(preds == 1)
    anomaly_count = np.sum(preds == -1)
    print(f"Isolation Forest completed: {normal_count} normal, {anomaly_count} anomalies ({anomaly_count/len(features)*100:.1f}%)")
    return model


def train_one_class_svm(features, nu=0.1):
    """Train One-Class SVM model."""
    print("\n--- Training One-Class SVM ---")
    model = OneClassSVM(kernel='rbf', gamma='auto', nu=nu)
    model.fit(features)
    preds = model.predict(features)
    normal_count = np.sum(preds == 1)
    anomaly_count = np.sum(preds == -1)
    print(f"One-Class SVM completed: {normal_count} normal, {anomaly_count} anomalies ({anomaly_count/len(features)*100:.1f}%)")
    return model


def train_autoencoder(features, epochs=25, batch_size=32, lr=0.001):
    """Train PyTorch Autoencoder model."""
    print("\n--- Training PyTorch Autoencoder ---")
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(features)
    
    tensor_data = torch.tensor(scaled_data, dtype=torch.float32)
    dataset = TensorDataset(tensor_data, tensor_data)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    input_dim = features.shape[1]
    model = PyTorchAutoencoder(input_dim)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    
    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for batch_x, batch_y in loader:
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(batch_x)
        
        avg_loss = total_loss / len(dataset)
        if epoch % 5 == 0 or epoch == 1 or epoch == epochs:
            print(f"Epoch [{epoch}/{epochs}] - Loss: {avg_loss:.6f}")
    
    # Calculate reconstruction errors and threshold
    model.eval()
    with torch.no_grad():
        reconstructions = model(tensor_data)
        mse = torch.mean((tensor_data - reconstructions) ** 2, dim=1).numpy()
        threshold = np.percentile(mse, 95)
        anomalies = mse > threshold
        print(f"Autoencoder Reconstruction Error 95th Percentile Threshold: {threshold:.4f}")
        print(f"Autoencoder detected {np.sum(anomalies)} anomalies ({np.sum(anomalies)/len(mse)*100:.1f}%)")
        
    return model, scaler, threshold


def main():
    parser = argparse.ArgumentParser(description="Train vital signs anomaly detection models.")
    parser.add_argument(
        '--csv',
        type=str,
        default='data/vitals.csv',
        help='Path to the vitals CSV dataset (default: data/vitals.csv)'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='models',
        help='Directory to save trained model artifacts (default: models)'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=25,
        help='Training epochs for the Autoencoder (default: 25)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=32,
        help='Batch size for Autoencoder (default: 32)'
    )
    parser.add_argument(
        '--contamination',
        type=float,
        default=0.1,
        help='Contamination rate for Isolation Forest (default: 0.1)'
    )
    parser.add_argument(
        '--nu',
        type=float,
        default=0.1,
        help='Nu parameter for One-Class SVM (default: 0.1)'
    )

    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    # 1. Load Data
    _, features = load_and_preprocess_data(args.csv)

    # 2. Train Isolation Forest
    iso_model = train_isolation_forest(features, contamination=args.contamination)
    iso_path = os.path.join(args.output_dir, 'isolation_forest_model.pkl')
    with open(iso_path, 'wb') as f:
        pickle.dump(iso_model, f)
    # Also save to root for backwards compatibility
    with open('isolation_forest_model.pkl', 'wb') as f:
        pickle.dump(iso_model, f)
    print(f"Saved Isolation Forest to: {iso_path}")

    # 3. Train One-Class SVM
    svm_model = train_one_class_svm(features, nu=args.nu)
    svm_path = os.path.join(args.output_dir, 'one_class_svm_model.pkl')
    with open(svm_path, 'wb') as f:
        pickle.dump(svm_model, f)
    # Also save to root for backwards compatibility
    with open('one_class_svm_model.pkl', 'wb') as f:
        pickle.dump(svm_model, f)
    print(f"Saved One-Class SVM to: {svm_path}")

    # 4. Train Autoencoder
    ae_model, scaler, threshold = train_autoencoder(
        features,
        epochs=args.epochs,
        batch_size=args.batch_size
    )
    ae_path = os.path.join(args.output_dir, 'autoencoder_model.pt')
    torch.save({
        'model_state_dict': ae_model.state_dict(),
        'input_dim': features.shape[1],
        'threshold': threshold,
        'scaler': scaler
    }, ae_path)
    print(f"Saved PyTorch Autoencoder to: {ae_path}")

    print("\n==========================================")
    print("All models successfully trained and saved!")
    print(f"Artifacts saved in: {args.output_dir}/")
    print("==========================================")


if __name__ == '__main__':
    main()
