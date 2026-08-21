# Gruwater

Multi-package water quality prediction app (GRU + PSO for vannamei shrimp ponds). Three independent packages, no shared tooling.

## Quick Start

```bash
# 1. Ensure XAMPP MySQL is running (root, no password)
# 2. Create database manually: CREATE DATABASE water_quality_db;

# Backend (Express 5 + mysql2)
cd Backend && npm install && npm run dev   # :5000

# Frontend (React 18 + Vite)
cd Frontend && npm install && npm run dev  # :5173

# Training (Python 3.10 GRU + PSO)
cd Training
python -m venv .venv310
.venv310\Scripts\activate
pip install -r requirements.txt
python train.py
```

No lint, typecheck, or test commands exist. Root has an empty `package-lock.json` (no root package.json). `skp-peramalan.drawio.xml` is an architecture diagram (draw.io).

## Packages

| Dir | Stack | Port | Entry |
|-----|-------|------|-------|
| `Backend/` | Express 5, mysql2, JWT | 5000 | `server.js` |
| `Frontend/` | React 18, Vite 5, Tailwind 3, React Router 6 | 5173 | `src/main.jsx` |
| `Training/` | Python, TensorFlow/Keras GRU, custom PSO | — | `train.py` |

Frontend proxies `/api` → `localhost:5000` (`Frontend/vite.config.js:8`). `Frontend/.env` and `Training/.env` are empty; only `Backend/.env` is used.

## Gotchas

- **Express 5** (not 4): 4-arg error middleware `(err, req, res, next)` required. No `app.del()`. Error middleware is registered in `server.js:35`.
- **DB schema file**: `Backend/db/schema.sql` — complete DDL for all tables + seed admin (`admin` / `admin123`) + TFT/GRU comparison metrics. This is the source of truth. `Backend/db/migrations/` (3 files) is legacy; **migration 001 references a `history` table that does not exist** in schema.sql — do not run it. Rebuild with: `mysql -uroot < Backend/db/schema.sql`.
- **Prediction IS real ML, with simulation fallback**: `predictionController.js:160` shells out to `Training/.venv310/Scripts/python.exe Training/predict.py` (via `execFile`, 120s timeout). Falls back to a random walk only if Python/model files are missing or the call errors. Override the interpreter with `PYTHON_PATH`.
- **`POST /api/prediction/run` always produces 96 steps** (15-min intervals = 1 day ahead) and **deletes prior predictions for the same user+lokasi first** (`Prediction.deleteAll`). Rerunning a prediction wipes history for that location.
- **`POST /api/model/optimize` does NOT train** (comment in `modelController.js:44`): it reads `Training/saved_models/best_params.json` + `outputs/metrics.json` and syncs them into `model_logs` / `comparison_metrics`. Run `python train.py` manually first, then hit this endpoint.
- **Cross-package dep**: `modelController.getCurrentConfig` (`modelController.js:126`) falls back to reading `Training/saved_models/best_params.json` + `best_gru_model.h5` directly, creating a `model_logs` row from the file if no DB model exists.
- **DB_PASSWORD empty** (`Backend/.env`): MySQL root, no password (XAMPP default). JWT secret also lives here.
- **CORS**: only `localhost:5173`, `localhost:3000` allowed (`server.js:18`).
- **All API responses**: `{ success: boolean, data?: any, message?: string }`.
- **Indonesian** for error messages and UI strings.
- **All `water_quality_data` / `predictions` rows are per-user** (`user_id` column); every model query filters by `req.user.id`. `req.user` is the decoded JWT payload from `middlewares/auth.js`.
- **`Backend/genHash.js`**: bcrypt hash generator; run `node genHash.js` to mint a password hash (e.g. for new seed users).

## Database Tables

| Table | Key Columns |
|-------|-------------|
| `users` | id, username, email, password (bcrypt), role (admin/user) |
| `water_quality_data` | id, **user_id**, tanggal, lokasi, suhu, pH, salinitas, kekeruhan |
| `predictions` | id, **user_id**, lokasi, tanggal_prediksi, step_ke, suhu, pH, salinitas, kekeruhan, skor_risiko, status, rekomendasi, model_log_id |
| `model_logs` | id, units, learning_rate, dropout_rate, batch_size, epochs, rmse, status, created_at, completed_at |
| `prediction_inputs` | id, user_id, lokasi, tanggal_prediksi, nilai_parameter (JSON input) — the "History" feature lives here; no skor_risiko/status column |
| `lokasi_tambak` | id, user_id, nama_lokasi, keterangan |
| `comparison_metrics` | id, model_type (UNIQUE, `tft`/`gru`), mape, rmse, mae, r2 |

## API Routes

All under `/api`. Auth routes public; all others require Bearer token (`Authorization` header). Write routes need a role (see below).

| Route | Notes |
|-------|-------|
| `POST /api/auth/login` | returns `{ token, user }`; `/register` also exists |
| `GET /api/auth/profile` | current user |
| `/api/data` | CRUD; write needs admin **or** user; also `/latest-per-lokasi`, `/latest`, `/lastday`, `/stats` |
| `/api/lokasi` | admin-managed pond locations; GET public, write = admin only |
| `/api/model` | `/logs`, `/best`, `/latest`, `/config`, `/compare` (GET); `/optimize` (POST, admin) |
| `/api/prediction` | `/`, `/latest`, `/dashboard` (GET); `/run` (POST, admin or user) |
| `/api/prediction-inputs` | `/`, `/stats`; GET only, per user (admin sees all via `userId=null`) |
| `/api/report` | `/full`, `/export/excel?lokasi=...&prediksi=false` |
| `/api/users` | admin only |
| `GET /api/health` | `{ success, message, timestamp }` |

## Frontend Routes

```
/login, /register
/admin/*  → dashboard, lokasi, perbandingan, prediction, history, report, users
/user/*   → dashboard, prediction, history, report
```

**ProtectedRoute** (`App.jsx:17`): redirects unauthenticated to `/login`. If `requiredRole` is set, users without matching role (except admin) redirect to `/dashboard`. Admin bypasses all role checks. There is **no frontend `data` page** — `water_quality_data` CRUD is only reachable via the API.

## Auth Flow

1. Frontend stores JWT in `localStorage`.
2. Axios interceptor (`src/services/api.js`) sets `Authorization: Bearer <token>`.
3. Backend `auth.js` middleware decodes JWT → `req.user`.
4. `role.js` checks `req.user.role` against allowed roles.
5. 401 response → auto-redirect to `/login`.

## Training

- **Input**: `data/water_quality.xlsx` (Timestamp, Temperature, pH, Salinity, Turbidity). Negative `kekeruhan` rows are dropped; outliers removed via IQR; split 70/10/20 before scaling (scaler fit on train only).
- **PSO config**: `SWARM_SIZE = 2`, `MAX_ITER = 5`, random seed 42 — fast-test defaults hardcoded in `train.py:26`.
- **`requirements.txt` ends with a commented `df = df.iloc[:500]`** (fast-test subset) — uncomment for a quick run.
- **Other scripts**: `predict.py` (called by the backend; takes `{history, steps}` JSON as argv/stdin, prints `{success, predictions}` JSON), `reevaluate_filtered.py`, `plot_scatter.py`.
- **Outputs**:
  - `saved_models/best_gru_model.h5`, `saved_models/scaler.pkl`, `saved_models/best_params.json`
  - `outputs/metrics.json`, `outputs/metrics_filtered.json`
  - `outputs/predictions.csv`, `outputs/predictions_final.csv`
  - `outputs/scatter_plot.png`, `outputs/loss_curve.png`
- **Python 3.10 venv** at `Training/.venv310/`; backend resolves it as its default Python interpreter.

## Key Files

- `Backend/server.js` — Express app setup, route mounting, error middleware
- `Backend/utils/helpers.js` — WQI calculation (`calculateRiskScore`), risk scoring, mitigation recommendations
- `Backend/controllers/modelController.js:126` — reads Training/saved_models cross-package
- `Backend/controllers/predictionController.js:160` — Python bridge + simulation fallback
- `Backend/db/schema.sql` — single source of truth for the DB
- `Frontend/src/App.jsx` — all routes + ProtectedRoute definition
- `Frontend/src/services/api.js` — Axios instance with /api base + 401 interceptor
