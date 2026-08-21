import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import GRU, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.optimizers import Adam
import joblib
import json
import os
import time  # Added for timing
import warnings
warnings.filterwarnings('ignore')

# ============================================
# KONFIGURASI
# ============================================
DATA_FILE = 'data/water_quality.xlsx'
TIMESTEPS = 24
FEATURES = 4
RANDOM_SEED = 42

# PSO Configuration
SWARM_SIZE = 2
MAX_ITER = 5

# Batas hyperparameter
BOUNDS = {
    'units': (20, 200),
    'learning_rate': (0.0005, 0.001),
    'dropout_rate': (0.0, 0.2),
    'batch_size': (32, 64),
    'epochs': (15, 30)
}

# Buat folder jika belum ada
os.makedirs('saved_models', exist_ok=True)
os.makedirs('outputs', exist_ok=True)

# ============================================
# 1. LOAD DATA
# ============================================
def load_data():
    print("Loading data...")
    if DATA_FILE.endswith('.csv'):
        df = pd.read_csv(DATA_FILE)
    else:
        df = pd.read_excel(DATA_FILE)

    df.rename(columns={
        'Timestamp': 'tanggal',
        'Temperature': 'suhu',
        'Salinity': 'salinitas',
        'Turbidity': 'kekeruhan'
    }, inplace=True)

    df['tanggal'] = pd.to_datetime(df['tanggal'], utc=True)
    df = df.sort_values('tanggal')

    neg_turb = (df['kekeruhan'] < 0).sum()
    if neg_turb > 0:
        print(f"Removing {neg_turb} rows with kekeruhan < 0 (sensor noise)")
        df = df[df['kekeruhan'] >= 0]

    data = df[['suhu', 'pH', 'salinitas', 'kekeruhan']].values
    print(f"Loaded {len(data)} rows")
    return data, df

# ============================================
# 2. PREPROCESSING
# ============================================
def remove_outliers(data, method='iqr', threshold=1.5):
    Q1 = np.percentile(data, 25, axis=0)
    Q3 = np.percentile(data, 75, axis=0)
    IQR = Q3 - Q1
    lower = Q1 - threshold * IQR
    upper = Q3 + threshold * IQR
    mask = np.all((data >= lower) & (data <= upper), axis=1)
    return data[mask]

def create_sequences(data, timesteps):
    X, y = [], []
    for i in range(timesteps, len(data)):
        X.append(data[i-timesteps:i])
        y.append(data[i])
    return np.array(X), np.array(y)

def preprocess_data(data, timesteps=TIMESTEPS):
    print("Preprocessing data...")
    data_clean = remove_outliers(data)
    print(f"After outlier removal: {len(data_clean)} rows")

    # Split dulu 70% train, 10% validation, 20% test (sebelum scaling)
    total = len(data_clean)
    train_end = int(total * 0.7)
    val_end = int(total * 0.8)

    raw_train = data_clean[:train_end]
    raw_val = data_clean[train_end:val_end]
    raw_test = data_clean[val_end:]

    # Fit scaler HANYA di train, transform val & test (tanpa data leakage)
    scaler = MinMaxScaler()
    scaled_train = scaler.fit_transform(raw_train)
    scaled_val = scaler.transform(raw_val)
    scaled_test = scaler.transform(raw_test)

    # Buat sequence per split agar tidak bocor antar split
    X_train, y_train = create_sequences(scaled_train, timesteps)
    X_val, y_val = create_sequences(scaled_val, timesteps)
    X_test, y_test = create_sequences(scaled_test, timesteps)

    print(f"Train: {len(X_train)} samples, Val: {len(X_val)} samples, Test: {len(X_test)} samples")
    return X_train, X_val, X_test, y_train, y_val, y_test, scaler

# ============================================
# 3. BUILD GRU MODEL
# ============================================
def build_gru_model(units, learning_rate, dropout_rate, input_shape):
    model = Sequential([
        GRU(int(units), input_shape=input_shape, return_sequences=False, implementation=1),
        Dropout(dropout_rate),
        Dense(FEATURES)
    ])
    optimizer = Adam(learning_rate=learning_rate)
    model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
    return model

# ============================================
# 4. FITNESS FUNCTION (RMSE) menggunakan Validation Set
# ============================================
def fitness_function(params, X_train, X_val, X_test, y_train, y_val, y_test):
    units, lr, dropout_rate, batch_size, epochs = params
    units, batch_size, epochs = int(units), int(batch_size), int(epochs)
    try:
        model = build_gru_model(units, lr, dropout_rate, (X_train.shape[1], X_train.shape[2]))
        early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
        model.fit(X_train, y_train,
                  batch_size=batch_size,
                  epochs=epochs,
                  validation_data=(X_val, y_val),
                  callbacks=[early_stop],
                  verbose=0)
        y_pred = model.predict(X_val, verbose=0)
        rmse = np.sqrt(np.mean((y_val - y_pred) ** 2))
        return rmse
    except Exception as e:
        print(f"Error: {e}")
        return 999.0

# ============================================
# 5. PSO MANUAL
# ============================================
def pso_manual(fitness_func, lb, ub, swarmsize=4, maxiter=10, c1=2.0, c2=2.0, w=0.8, args=()):
    lb = np.array(lb)
    ub = np.array(ub)

    dim = len(lb)
    positions = np.random.uniform(lb, ub, (swarmsize, dim))
    velocities = np.random.uniform(-1, 1, (swarmsize, dim)) * (ub - lb) * 0.1
    pbest = positions.copy()
    pbest_fitness = np.array([fitness_func(p, *args) for p in positions])
    gbest_idx = np.argmin(pbest_fitness)
    gbest = positions[gbest_idx].copy()
    gbest_fitness = pbest_fitness[gbest_idx]
    print(f"Initial best fitness (RMSE): {gbest_fitness:.4f}")
    for it in range(maxiter):
        for i in range(swarmsize):
            r1, r2 = np.random.rand(dim), np.random.rand(dim)
            velocities[i] = (w * velocities[i] +
                             c1 * r1 * (pbest[i] - positions[i]) +
                             c2 * r2 * (gbest - positions[i]))
            positions[i] = positions[i] + velocities[i]
            positions[i] = np.clip(positions[i], lb, ub)
            current_fitness = fitness_func(positions[i], *args)
            if current_fitness < pbest_fitness[i]:
                pbest[i] = positions[i].copy()
                pbest_fitness[i] = current_fitness
                if current_fitness < gbest_fitness:
                    gbest = positions[i].copy()
                    gbest_fitness = current_fitness
        print(f"Iter {it+1:2d} best (RMSE) = {gbest_fitness:.4f}")
    return gbest, gbest_fitness

# ============================================
# 6. EVALUATION METRICS
# ============================================
def calculate_metrics(y_true, y_pred):
    epsilon = 1e-8
    mape = np.mean(np.abs((y_true - y_pred) / (y_true + epsilon))) * 100
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    mae = np.mean(np.abs(y_true - y_pred))
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2 = 1 - (ss_res / (ss_tot + epsilon))
    return {'mape': mape, 'rmse': rmse, 'mae': mae, 'r2': r2}

# ============================================
# 7. VISUALIZATION
# ============================================
def plot_results(y_test_denorm, y_pred_denorm, mape_per_param, param_names, history):
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    axes = axes.flatten()
    for i in range(FEATURES):
        ax = axes[i]
        ax.scatter(y_test_denorm[:, i], y_pred_denorm[:, i], alpha=0.5, s=10)
        min_val = min(y_test_denorm[:, i].min(), y_pred_denorm[:, i].min())
        max_val = max(y_test_denorm[:, i].max(), y_pred_denorm[:, i].max())
        ax.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2)
        ax.set_xlabel('Actual')
        ax.set_ylabel('Predicted')
        ax.set_title(f'{param_names[i]}\nMAPE = {mape_per_param[i]:.2f}%')
        ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('outputs/scatter_plot.png', dpi=150)
    plt.close()
    print("Scatter plot saved: outputs/scatter_plot.png")

    plt.figure(figsize=(8, 4))
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.xlabel('Epochs')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.savefig('outputs/loss_curve.png', dpi=150)
    plt.close()
    print("Loss curve saved: outputs/loss_curve.png")

# ============================================
# 8. MAIN
# ============================================
if __name__ == "__main__":
    # Record start time
    start_time = time.time()

    print("=" * 60)
    print("TRAINING GRU + PSO (MULTITARGET)")
    print("=" * 60)
    print(f"TIMESTEPS: {TIMESTEPS}")
    print(f"Jumlah Partikel: {SWARM_SIZE}")
    print(f"Max Iterasi: {MAX_ITER}")
    print("=" * 60)

    np.random.seed(RANDOM_SEED)
    tf.random.set_seed(RANDOM_SEED)

    data, df = load_data()
    X_train, X_val, X_test, y_train, y_val, y_test, scaler = preprocess_data(data, TIMESTEPS)

    lb = [BOUNDS['units'][0], BOUNDS['learning_rate'][0],
          BOUNDS['dropout_rate'][0], BOUNDS['batch_size'][0],
          BOUNDS['epochs'][0]]
    ub = [BOUNDS['units'][1], BOUNDS['learning_rate'][1],
          BOUNDS['dropout_rate'][1], BOUNDS['batch_size'][1],
          BOUNDS['epochs'][1]]

    print("=" * 60)
    print("Menjalankan PSO Optimization...")
    print("=" * 60)

    best_params, best_mape = pso_manual(
        fitness_function, lb, ub,
        swarmsize=SWARM_SIZE,
        maxiter=MAX_ITER,
        args=(X_train, X_val, X_test, y_train, y_val, y_test)
    )

    print("=" * 60)
    print("HASIL OPTIMASI PSO")
    print("=" * 60)
    print(f"Fitness Terbaik (RMSE): {best_mape:.4f}")
    units = int(best_params[0])
    lr = best_params[1]
    dropout = best_params[2]
    batch_size = int(best_params[3])
    epochs = int(best_params[4])
    print(f"  Units: {units}")
    print(f"  Learning Rate: {lr:.6f}")
    print(f"  Dropout Rate: {dropout:.4f}")
    print(f"  Batch Size: {batch_size}")
    print(f"  Epochs: {epochs}")
    print("=" * 60)

    print("\nTraining model final...")
    final_model = build_gru_model(units, lr, dropout, (X_train.shape[1], X_train.shape[2]))
    early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    history = final_model.fit(X_train, y_train,
                              batch_size=batch_size,
                              epochs=epochs,
                              validation_data=(X_val, y_val),
                              callbacks=[early_stop],
                              verbose=1)

    y_pred = final_model.predict(X_test, verbose=0)
    y_test_denorm = scaler.inverse_transform(y_test)
    y_pred_denorm = scaler.inverse_transform(y_pred)

    print("\nEvaluasi Model (tanpa filter):")
    param_names = ['Suhu', 'pH', 'Salinitas', 'Kekeruhan']
    metrics_total = calculate_metrics(y_test_denorm, y_pred_denorm)
    metrics_per_param = []
    for i in range(FEATURES):
        m = calculate_metrics(y_test_denorm[:, i], y_pred_denorm[:, i])
        metrics_per_param.append(m)
        print(f"  {param_names[i]}: MAPE={m['mape']:.2f}%, RMSE={m['rmse']:.4f}, MAE={m['mae']:.4f}, R2={m['r2']:.4f}")
    print(f"\n  TOTAL (rata-rata): MAPE={metrics_total['mape']:.2f}%, RMSE={metrics_total['rmse']:.4f}, MAE={metrics_total['mae']:.4f}, R2={metrics_total['r2']:.4f}")

    # Re-evaluasi dengan filter kekeruhan > 0
    print("\nRe-evaluasi dengan filter (kekeruhan > 0)...")
    filter_idx = y_test_denorm[:, 3] > 0.0
    y_test_filtered = y_test_denorm[filter_idx]
    y_pred_filtered = y_pred_denorm[filter_idx]

    print(f"  Data asli: {len(y_test_denorm)} baris")
    print(f"  Data setelah filter (kekeruhan > 0): {len(y_test_filtered)} baris")

    metrics_total_filtered = calculate_metrics(y_test_filtered.flatten(), y_pred_filtered.flatten())
    metrics_per_param_filtered = []
    for i in range(FEATURES):
        m = calculate_metrics(y_test_filtered[:, i], y_pred_filtered[:, i])
        metrics_per_param_filtered.append(m)

    print("\nHASIL RE-EVALUASI (setelah filter kekeruhan > 0):")
    for i, name in enumerate(param_names):
        print(f"  {name:12s}: MAPE={metrics_per_param_filtered[i]['mape']:.2f}%, RMSE={metrics_per_param_filtered[i]['rmse']:.4f}, MAE={metrics_per_param_filtered[i]['mae']:.4f}, R2={metrics_per_param_filtered[i]['r2']:.4f}")
    print(f"\n  TOTAL (rata-rata): MAPE={metrics_total_filtered['mape']:.2f}%, RMSE={metrics_total_filtered['rmse']:.4f}, MAE={metrics_total_filtered['mae']:.4f}, R2={metrics_total_filtered['r2']:.4f}")

    # Simpan model dan scaler
    print("\nMenyimpan hasil...")
    final_model.save('saved_models/best_gru_model.h5')
    joblib.dump(scaler, 'saved_models/scaler.pkl')

    # Simpan predictions.csv
    pred_df = pd.DataFrame({
        'tanggal': df['tanggal'].iloc[-len(y_test):].values,
        'suhu_actual': y_test_denorm[:, 0],
        'suhu_pred': y_pred_denorm[:, 0],
        'pH_actual': y_test_denorm[:, 1],
        'pH_pred': y_pred_denorm[:, 1],
        'salinitas_actual': y_test_denorm[:, 2],
        'salinitas_pred': y_pred_denorm[:, 2],
        'kekeruhan_actual': y_test_denorm[:, 3],
        'kekeruhan_pred': y_pred_denorm[:, 3]
    })
    pred_df.to_csv('outputs/predictions.csv', index=False)
    print("Predictions (aktual + prediksi) saved: outputs/predictions.csv")

    # Simpan metrik tanpa filter
    result = {
        'hyperparameters': {
            'units': units,
            'learning_rate': lr,
            'dropout_rate': dropout,
            'batch_size': batch_size,
            'epochs': epochs
        },
        'metrics': {
            'total': metrics_total,
            'per_parameter': {
                param_names[i]: metrics_per_param[i] for i in range(FEATURES)
            }
        }
    }
    with open('saved_models/best_params.json', 'w') as f:
        json.dump(result, f, indent=2)
    print("Hyperparameters saved: saved_models/best_params.json")

    with open('outputs/metrics.json', 'w') as f:
        json.dump(result, f, indent=2)
    print("Metrics (tanpa filter) saved: outputs/metrics.json")

    # Simpan metrik dengan filter
    result_filtered = {
        'hyperparameters': {
            'units': units,
            'learning_rate': lr,
            'dropout_rate': dropout,
            'batch_size': batch_size,
            'epochs': epochs
        },
        'metrics': {
            'total': metrics_total_filtered,
            'per_parameter': {
                param_names[i]: metrics_per_param_filtered[i] for i in range(FEATURES)
            }
        }
    }
    with open('outputs/metrics_filtered.json', 'w') as f:
        json.dump(result_filtered, f, indent=2)
    print("Metrics (dengan filter) saved: outputs/metrics_filtered.json")

    # Generate final CSV dengan WQI
    print("\nMenghitung WQI, Status, dan Rekomendasi...")

    def calculate_wqi(row):
        suhu = row['Temperature']
        pH_val = row['pH']
        salinitas = row['Salinity']
        kekeruhan = row['Turbidity']

        ideal = {'suhu': 29, 'pH': 7.8, 'salinitas': 30, 'kekeruhan': 1}
        min_val = {'suhu': 26, 'pH': 7.0, 'salinitas': 10, 'kekeruhan': 0}
        max_val = {'suhu': 32, 'pH': 8.5, 'salinitas': 35, 'kekeruhan': 5}

        q_suhu = max(0, min(100, (1 - abs(suhu - ideal['suhu']) / (max_val['suhu'] - min_val['suhu'])) * 100))
        q_pH = max(0, min(100, (1 - abs(pH_val - ideal['pH']) / (max_val['pH'] - min_val['pH'])) * 100))
        q_salinitas = max(0, min(100, (1 - abs(salinitas - ideal['salinitas']) / (max_val['salinitas'] - min_val['salinitas'])) * 100))
        q_kekeruhan = max(0, min(100, (1 - abs(kekeruhan - ideal['kekeruhan']) / (max_val['kekeruhan'] - min_val['kekeruhan'])) * 100))

        wqi = round((q_suhu + q_pH + q_salinitas + q_kekeruhan) / 4)
        return wqi

    def get_status_rekomendasi(wqi):
        if wqi >= 76:
            return 'Normal', 'Kondisi air dalam batas optimal. Lakukan pemantauan rutin.'
        elif 51 <= wqi <= 75:
            return 'Waspada', 'Kurangi pakan, tambah aerasi, cek salinitas, pantau intensif.'
        else:
            return 'Bahaya', 'Segera pindahkan ikan, aerasi maksimal, hentikan pakan sementara, hubungi ahli perikanan.'

    pred_final = pd.DataFrame({
        'Timestamp': df['tanggal'].iloc[-len(y_test):].values,
        'Temperature': y_pred_denorm[:, 0],
        'pH': y_pred_denorm[:, 1],
        'Salinity': y_pred_denorm[:, 2],
        'Turbidity': y_pred_denorm[:, 3]
    })

    pred_final['WQI'] = pred_final.apply(calculate_wqi, axis=1)
    pred_final[['risk', 'recommend']] = pred_final['WQI'].apply(
        lambda x: pd.Series(get_status_rekomendasi(x))
    )

    pred_final.to_csv('outputs/predictions_final.csv', index=False)
    print("Final CSV (Timestamp, Temperature, pH, Salinity, Turbidity, WQI, risk, recommend): outputs/predictions_final.csv")

    plot_results(y_test_denorm, y_pred_denorm, [m['mape'] for m in metrics_per_param_filtered], param_names, history)

    # End time and calculate duration
    end_time = time.time()
    elapsed = end_time - start_time
    hours = int(elapsed // 3600)
    minutes = int((elapsed % 3600) // 60)
    seconds = int(elapsed % 60)

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"Total training time: {hours}h {minutes}m {seconds}s")
    print("=" * 60)