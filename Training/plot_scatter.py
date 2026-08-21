import json
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRED_PATH = os.path.join(BASE_DIR, 'outputs', 'predictions.csv')
METRICS_PATH = os.path.join(BASE_DIR, 'outputs', 'metrics_filtered.json')
OUT_PATH = os.path.join(BASE_DIR, 'outputs', 'scatter_plot.png')

PARAMS = ['suhu', 'pH', 'salinitas', 'kekeruhan']
PARAM_NAMES = ['Suhu', 'pH', 'Salinitas', 'Kekeruhan']

df = pd.read_csv(PRED_PATH)
y_test_denorm = df[[f'{p}_actual' for p in PARAMS]].values
y_pred_denorm = df[[f'{p}_pred' for p in PARAMS]].values

with open(METRICS_PATH, 'r') as f:
    metrics = json.load(f)

mape_per_param = [metrics['metrics']['per_parameter'][name]['mape'] for name in PARAM_NAMES]

fig, axes = plt.subplots(2, 2, figsize=(12, 10))
axes = axes.flatten()
for i in range(4):
    ax = axes[i]
    ax.scatter(y_test_denorm[:, i], y_pred_denorm[:, i], alpha=0.5, s=10)
    min_val = min(y_test_denorm[:, i].min(), y_pred_denorm[:, i].min())
    max_val = max(y_test_denorm[:, i].max(), y_pred_denorm[:, i].max())
    ax.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2)
    ax.set_xlabel('Actual')
    ax.set_ylabel('Predicted')
    ax.set_title(f'{PARAM_NAMES[i]}\nMAPE = {mape_per_param[i]:.2f}%')
    ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUT_PATH, dpi=150)
plt.close()
print(f"Scatter plot regenerated: {OUT_PATH}")
for name, mape in zip(PARAM_NAMES, mape_per_param):
    print(f"  {name:10s}: MAPE = {mape:.2f}%")
