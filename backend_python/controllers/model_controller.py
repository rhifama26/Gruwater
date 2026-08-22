import json
import os
from datetime import datetime

from flask import request

from models.model_log_model import Comparison, ModelLog
from utils.helpers import fail, ok

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PARAMS_PATH = os.path.join(PROJECT_ROOT, "Training", "saved_models", "best_params.json")
METRICS_PATH = os.path.join(PROJECT_ROOT, "Training", "outputs", "metrics_filtered.json")
METRICS_TOTAL_PATH = os.path.join(PROJECT_ROOT, "Training", "outputs", "metrics.json")
MODEL_PATH = os.path.join(PROJECT_ROOT, "Training", "saved_models", "best_gru_model.h5")

DEFAULT_TFT = {"model_type": "tft", "mape": 57.08, "rmse": 0.908, "mae": 0.792, "r2": -0.075}
DEFAULT_GRU = {"model_type": "gru", "mape": 22.85, "rmse": 0.4848, "mae": 0.3437, "r2": 0.8174}


def _read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


class ModelController:
    @staticmethod
    def get_all_logs():
        return ok({"success": True, "data": ModelLog.find_all()})

    @staticmethod
    def get_best_model():
        best = ModelLog.find_best()
        if not best:
            return fail("Belum ada model", 404)
        return ok({"success": True, "data": best})

    @staticmethod
    def get_latest_log():
        latest = ModelLog.find_latest()
        if not latest:
            return fail("Belum ada log", 404)
        return ok({"success": True, "data": latest})

    @staticmethod
    def run_optimization():
        if not os.path.exists(PARAMS_PATH):
            return fail("Hasil training tidak ditemukan. Jalankan train.py terlebih dahulu.", 400)

        params = _read_json(PARAMS_PATH)
        hp = params.get("hyperparameters") or {}

        rmse = None
        if os.path.exists(METRICS_TOTAL_PATH):
            metrics = _read_json(METRICS_TOTAL_PATH)
            rmse = (metrics.get("metrics") or {}).get("total", {}).get("rmse")

        log_id = ModelLog.create(
            {
                "units": hp.get("units", 64),
                "learning_rate": hp.get("learning_rate", 0.001),
                "dropout_rate": hp.get("dropout_rate", 0.2),
                "batch_size": hp.get("batch_size", 32),
                "epochs": hp.get("epochs", 100),
                "rmse": rmse,
                "status": "completed",
                "completed_at": datetime.now(),
            }
        )

        if os.path.exists(METRICS_PATH):
            data = _read_json(METRICS_PATH)
            kekeruhan = (data.get("metrics") or {}).get("per_parameter", {}).get("Kekeruhan")
            if kekeruhan:
                Comparison.upsert("gru", kekeruhan)

        return ok({"success": True, "message": "Hasil training berhasil disinkronkan", "logId": log_id})

    @staticmethod
    def get_comparison():
        if os.path.exists(METRICS_PATH):
            data = _read_json(METRICS_PATH)
            kekeruhan = (data.get("metrics") or {}).get("per_parameter", {}).get("Kekeruhan")
            if kekeruhan:
                Comparison.upsert("gru", kekeruhan)

        tft = None
        gru = None
        try:
            tft = Comparison.find_by_type("tft")
            gru = Comparison.find_by_type("gru")
        except Exception as e:
            print(f"Tabel comparison_metrics belum ada: {e}")

        if not tft:
            tft = DEFAULT_TFT
        if not gru:
            gru = DEFAULT_GRU

        return ok({"success": True, "data": {"tft": tft, "gru": gru}})

    @staticmethod
    def get_current_config():
        best = ModelLog.find_best()

        if not best and os.path.exists(MODEL_PATH) and os.path.exists(PARAMS_PATH):
            params = _read_json(PARAMS_PATH)
            hp = params.get("hyperparameters") or {}
            metrics = (params.get("metrics") or {}).get("total") or {}
            log_id = ModelLog.create(
                {
                    "units": hp.get("units", 64) or 64,
                    "learning_rate": hp.get("learning_rate", 0.001) or 0.001,
                    "dropout_rate": hp.get("dropout_rate", 0.2) or 0.2,
                    "batch_size": hp.get("batch_size", 32) or 32,
                    "epochs": hp.get("epochs", 100) or 100,
                    "rmse": metrics.get("rmse"),
                    "status": "completed",
                    "completed_at": datetime.now(),
                }
            )
            best = ModelLog.find_by_id(log_id)

        if not best:
            return ok({"success": True, "data": {"is_optimized": False}})
        best = dict(best)
        best["is_optimized"] = True
        return ok({"success": True, "data": best})
