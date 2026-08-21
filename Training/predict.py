import json
import sys
import os
import numpy as np
import joblib
from tensorflow.keras.models import load_model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'saved_models', 'best_gru_model.h5')
SCALER_PATH = os.path.join(BASE_DIR, 'saved_models', 'scaler.pkl')
TIMESTEPS = 24
FEATURES = 4


def main():
    try:
        payload = json.loads(sys.argv[1])
    except IndexError:
        payload = json.load(sys.stdin)

    history = np.array(payload['history'], dtype=float)  # (n, 4) terakhir = paling baru
    steps = int(payload.get('steps', 96))

    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        print(json.dumps({'success': False, 'error': 'Model atau scaler tidak ditemukan'}))
        return

    model = load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    scaled = scaler.transform(history)

    window = scaled[-TIMESTEPS:].reshape(1, TIMESTEPS, FEATURES)
    results = []
    for _ in range(steps):
        pred_scaled = model.predict(window, verbose=0)
        pred_denorm = scaler.inverse_transform(pred_scaled)[0]
        results.append([float(x) for x in pred_denorm])
        window = np.concatenate([window[:, 1:, :], pred_scaled.reshape(1, 1, FEATURES)], axis=1)

    print(json.dumps({'success': True, 'predictions': results}))


if __name__ == '__main__':
    main()
