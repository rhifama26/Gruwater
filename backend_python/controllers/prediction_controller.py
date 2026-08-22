import json
import os
import random
import subprocess
from datetime import datetime, timedelta

from flask import g, request

from models.data_model import Data
from models.prediction_input_model import PredictionInput
from models.prediction_model import Prediction
from utils.helpers import calculate_risk_score, fail, finite, get_mitigation_recommendation, ok

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PYTHON = os.getenv("PYTHON_PATH") or os.path.join(PROJECT_ROOT, "Training", ".venv310", "Scripts", "python.exe")
PREDICT_SCRIPT = os.path.join(PROJECT_ROOT, "Training", "predict.py")
MODEL_FILE = os.path.join(PROJECT_ROOT, "Training", "saved_models", "best_gru_model.h5")

RANK = {"Normal": 0, "Waspada": 1, "Bahaya": 2}


def _run_python_prediction(window, steps):
    proc = subprocess.run(
        [PYTHON, PREDICT_SCRIPT, json.dumps({"history": window, "steps": steps})],
        timeout=120,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or "Prediksi gagal")
    parsed = json.loads(proc.stdout)
    if not parsed.get("success"):
        raise RuntimeError(parsed.get("error") or "Prediksi gagal")
    return parsed["predictions"]


def _fmt_local(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S")


class PredictionController:
    @staticmethod
    def get_all():
        return ok({"success": True, "data": Prediction.find_all(g.user["id"])})

    @staticmethod
    def get_latest():
        lokasi = request.args.get("lokasi") or None
        return ok({"success": True, "data": Prediction.find_latest(g.user["id"], lokasi)})

    @staticmethod
    def get_dashboard():
        predictions = Prediction.find_all(g.user["id"])

        by_lokasi = {}
        for p in predictions:
            key = p.get("lokasi") or "Tanpa Lokasi"
            by_lokasi.setdefault(key, []).append(p)

        per_lokasi = []
        for lokasi, rows in by_lokasi.items():
            worst = rows[0]
            for r in rows[1:]:
                if RANK.get(r["status"], 3) > RANK.get(worst["status"], 3) or (
                    RANK.get(r["status"], 3) == RANK.get(worst["status"], 3)
                    and float(r["skor_risiko"]) < float(worst["skor_risiko"])
                ):
                    worst = r
            per_lokasi.append(
                {
                    "lokasi": lokasi,
                    "suhu": worst["suhu"],
                    "pH": worst["pH"],
                    "salinitas": worst["salinitas"],
                    "kekeruhan": worst["kekeruhan"],
                    "skor_risiko": worst["skor_risiko"],
                    "status": worst["status"],
                    "rekomendasi": worst["rekomendasi"],
                }
            )

        n = len(predictions)

        def avg(key, items=None):
            items = items if items is not None else predictions
            return sum(float(p[key] or 0) for p in items) / n if n else 0

        stats = {
            "total_data": n,
            "avg_suhu": avg("suhu"),
            "avg_pH": avg("pH"),
            "avg_salinitas": avg("salinitas"),
            "avg_kekeruhan": avg("kekeruhan"),
            "normal_count": sum(1 for p in predictions if p["status"] == "Normal"),
            "waspada_count": sum(1 for p in predictions if p["status"] == "Waspada"),
            "bahaya_count": sum(1 for p in predictions if p["status"] == "Bahaya"),
        }

        max_steps = max((len(v) for v in by_lokasi.values()), default=0)
        series = []
        for i in range(1, max_steps + 1):
            steps = [p for p in predictions if int(p["step_ke"]) == i]
            if not steps:
                continue

            def avg2(key):
                return sum(float(p[key] or 0) for p in steps) / len(steps)

            series.append(
                {
                    "step_ke": i,
                    "suhu": round(avg2("suhu"), 2),
                    "pH": round(avg2("pH"), 2),
                    "salinitas": round(avg2("salinitas"), 2),
                    "kekeruhan": round(avg2("kekeruhan"), 2),
                }
            )

        return ok({"success": True, "data": {"stats": stats, "perLokasi": per_lokasi, "series": series}})

    @staticmethod
    def run_prediction():
        body = request.get_json(silent=True) or {}
        suhu, ph = body.get("suhu"), body.get("pH")
        salinitas, kekeruhan = body.get("salinitas"), body.get("kekeruhan")
        waktu, lokasi = body.get("waktu"), body.get("lokasi") or None

        if suhu is None or ph is None or salinitas is None or kekeruhan is None:
            latest = Data.find_latest(g.user["id"], lokasi)
            if not latest:
                return fail("Tidak ada data terbaru. Isi nilai parameter manual.", 400)
            suhu, ph = latest["suhu"], latest["pH"]
            salinitas, kekeruhan = latest["salinitas"], latest["kekeruhan"]

        try:
            suhu, ph = float(suhu), float(ph)
            salinitas, kekeruhan = float(salinitas), float(kekeruhan)
        except (TypeError, ValueError):
            return fail("Semua parameter (suhu, pH, salinitas, kekeruhan) harus diisi dengan angka yang valid", 400)
        if not finite(suhu, ph, salinitas, kekeruhan):
            return fail("Semua parameter (suhu, pH, salinitas, kekeruhan) harus diisi dengan angka yang valid", 400)

        input_params = {"suhu": suhu, "pH": ph, "salinitas": salinitas, "kekeruhan": kekeruhan}
        try:
            start_date = datetime.fromisoformat(str(waktu)) if waktu else datetime.now()
        except ValueError:
            start_date = datetime.now()

        Prediction.delete_all(g.user["id"], lokasi)

        input_provided = all(k in body and body[k] is not None for k in ("suhu", "pH", "salinitas", "kekeruhan"))
        if input_provided:
            window = [[suhu, ph, salinitas, kekeruhan]] * 24
        else:
            history_rows = Data.find_all(23, 0, g.user["id"], lokasi)
            history_rows.reverse()
            window = [[r["suhu"], r["pH"], r["salinitas"], r["kekeruhan"]] for r in history_rows]
            while len(window) < 23:
                window.insert(0, [suhu, ph, salinitas, kekeruhan])
            window.append([suhu, ph, salinitas, kekeruhan])

        raw_predictions = None
        if os.path.exists(PYTHON) and os.path.exists(PREDICT_SCRIPT) and os.path.exists(MODEL_FILE):
            try:
                raw_predictions = _run_python_prediction(window, 96)
                print("Prediksi menggunakan model GRU (PSO)")
            except Exception as e:
                print(f"Python prediction error, fallback ke simulasi: {e}")
        else:
            print("Model GRU tidak ditemukan, fallback ke simulasi")

        predictions = []
        cur_suhu, cur_ph = suhu, ph
        cur_sal, cur_turb = salinitas, kekeruhan
        for i in range(1, 97):
            if raw_predictions and raw_predictions[i - 1]:
                cur_suhu = round(float(raw_predictions[i - 1][0]), 2)
                cur_ph = round(float(raw_predictions[i - 1][1]), 2)
                cur_sal = round(float(raw_predictions[i - 1][2]), 2)
                cur_turb = round(float(raw_predictions[i - 1][3]), 2)
            else:
                cur_suhu = round(cur_suhu + (random.random() - 0.5) * 0.2, 2)
                cur_ph = round(cur_ph + (random.random() - 0.5) * 0.03, 2)
                cur_sal = round(cur_sal + (random.random() - 0.5) * 0.15, 2)
                cur_turb = round(cur_turb + (random.random() - 0.5) * 0.15, 2)
                cur_suhu = min(32, max(26, cur_suhu))
                cur_ph = min(8.5, max(7.0, cur_ph))
                cur_sal = min(35, max(10, cur_sal))
                cur_turb = min(5, max(0, cur_turb))

            risk = calculate_risk_score(cur_suhu, cur_ph, cur_sal, cur_turb)
            rekomendasi = get_mitigation_recommendation(risk["status"])
            date_i = start_date + timedelta(minutes=15 * (i - 1))
            predictions.append(
                {
                    "user_id": g.user["id"],
                    "lokasi": lokasi,
                    "tanggal_prediksi": _fmt_local(date_i),
                    "step_ke": i,
                    "suhu": cur_suhu,
                    "pH": cur_ph,
                    "salinitas": cur_sal,
                    "kekeruhan": cur_turb,
                    "skor_risiko": risk["skor"],
                    "status": risk["status"],
                    "rekomendasi": rekomendasi,
                    "model_log_id": None,
                }
            )

        Prediction.create_batch(predictions)
        PredictionInput.create(
            {
                "user_id": g.user["id"],
                "lokasi": lokasi,
                "tanggal_prediksi": start_date,
                "nilai_parameter": input_params,
            }
        )
        saved = Prediction.find_latest(g.user["id"], lokasi)
        return ok({"success": True, "data": saved})
