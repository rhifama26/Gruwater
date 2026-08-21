import pandas as pd
import numpy as np
import json

df = pd.read_csv('outputs/predictions.csv')

params = ['suhu', 'pH', 'salinitas', 'kekeruhan']
y_true = df[[f'{p}_actual' for p in params]].values
y_pred = df[[f'{p}_pred' for p in params]].values

# 🔥 Filter: buang data dengan kekeruhan aktual = 0
filter_idx = y_true[:, 3] > 0.0
y_true_filtered = y_true[filter_idx]
y_pred_filtered = y_pred[filter_idx]

print(f"Data asli: {len(y_true)} baris")
print(f"Data setelah filter (kekeruhan > 0): {len(y_true_filtered)} baris")

# Hitung ulang MAPE dengan epsilon normal
epsilon = 1e-8

def calc_metrics(y_true, y_pred):
    mape = np.mean(np.abs((y_true - y_pred) / (y_true + epsilon))) * 100
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    mae = np.mean(np.abs(y_true - y_pred))
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2 = 1 - (ss_res / (ss_tot + epsilon))
    return {'mape': mape, 'rmse': rmse, 'mae': mae, 'r2': r2}

print("=" * 60)
print("📊 RE-EVALUASI (setelah filter kekeruhan > 0)")
print("=" * 60)

for i, name in enumerate(params):
    m = calc_metrics(y_true_filtered[:, i], y_pred_filtered[:, i])
    print(f"{name:12s}: MAPE={m['mape']:.2f}%, RMSE={m['rmse']:.4f}, MAE={m['mae']:.4f}, R²={m['r2']:.4f}")

# Total (flatten)
total = calc_metrics(y_true_filtered.flatten(), y_pred_filtered.flatten())
print(f"\nTOTAL (rata-rata): MAPE={total['mape']:.2f}%, RMSE={total['rmse']:.4f}, MAE={total['mae']:.4f}, R²={total['r2']:.4f}")