import csv
import math
import os
from datetime import datetime

from flask import g, request

from models.data_model import Data
from utils.helpers import calculate_risk_score, fail, get_mitigation_recommendation, jsonable, ok
from utils.validation import validate_water_quality_data

DATA_MASUK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_masuk")


def append_to_csv(row):
    try:
        os.makedirs(DATA_MASUK_DIR, exist_ok=True)
        path = os.path.join(DATA_MASUK_DIR, f"sensor_{datetime.now():%Y-%m-%d}.csv")
        baru = not os.path.exists(path)
        with open(path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if baru:
                writer.writerow(["id", "tanggal", "lokasi", "suhu", "pH", "salinitas", "kekeruhan"])
            writer.writerow(
                [row["id"], row["tanggal"], row["lokasi"], row["suhu"], row["pH"], row["salinitas"], row["kekeruhan"]]
            )
    except OSError as e:
        print(f"Gagal menulis CSV data_masuk: {e}")


def enrich(row):
    risk = calculate_risk_score(row["suhu"], row["pH"], row["salinitas"], row["kekeruhan"])
    return {**row, "skor_risiko": risk["skor"], "status": risk["status"]}


class DataController:
    @staticmethod
    def get_all():
        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 50, type=int)
        offset = (page - 1) * limit
        rows = Data.find_all(limit, offset, g.user["id"])
        total = Data.count(g.user["id"])
        return ok(
            {
                "success": True,
                "data": rows,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": math.ceil(total / limit) if limit else 0,
                },
            }
        )

    @staticmethod
    def get_latest():
        row = Data.find_latest(g.user["id"])
        if not row:
            return fail("Data tidak ditemukan", 404)
        risk = calculate_risk_score(row["suhu"], row["pH"], row["salinitas"], row["kekeruhan"])
        rekomendasi = get_mitigation_recommendation(risk["status"])
        return ok({"success": True, "data": {**row, "skor_risiko": risk["skor"], "status": risk["status"], "rekomendasi": rekomendasi}})

    @staticmethod
    def get_last_day():
        rows = Data.find_last_day(g.user["id"])
        enriched = []
        for r in rows:
            risk = calculate_risk_score(r["suhu"], r["pH"], r["salinitas"], r["kekeruhan"])
            enriched.append({**r, "skor_risiko": risk["skor"], "status": risk["status"]})
        return ok({"success": True, "data": enriched})

    @staticmethod
    def get_latest_per_lokasi():
        rows = Data.find_last_day(g.user["id"])
        worst = {}
        for r in rows:
            risk = calculate_risk_score(r["suhu"], r["pH"], r["salinitas"], r["kekeruhan"])
            rekomendasi = get_mitigation_recommendation(risk["status"])
            item = {**r, "skor_risiko": risk["skor"], "status": risk["status"], "rekomendasi": rekomendasi}
            if r["lokasi"] not in worst or item["skor_risiko"] < worst[r["lokasi"]]["skor_risiko"]:
                worst[r["lokasi"]] = item
        return ok({"success": True, "data": list(worst.values())})

    @staticmethod
    def get_by_id(row_id):
        row = Data.find_by_id(row_id, g.user["id"])
        if not row:
            return fail("Data tidak ditemukan", 404)
        risk = calculate_risk_score(row["suhu"], row["pH"], row["salinitas"], row["kekeruhan"])
        return ok({"success": True, "data": {**row, "skor_risiko": risk["skor"], "status": risk["status"]}})

    @staticmethod
    def create():
        body = request.get_json(silent=True) or {}
        errors = validate_water_quality_data(body)
        if errors:
            return fail(", ".join(errors), 400)
        new_id = Data.create({**body, "user_id": g.user["id"]})
        new_row = Data.find_by_id(new_id, g.user["id"])
        append_to_csv(new_row)
        return ok({"success": True, "data": new_row}, 201)

    @staticmethod
    def update(row_id):
        body = request.get_json(silent=True) or {}
        errors = validate_water_quality_data(body)
        if errors:
            return fail(", ".join(errors), 400)
        affected = Data.update(row_id, body, g.user["id"])
        if not affected:
            return fail("Data tidak ditemukan", 404)
        return ok({"success": True, "data": Data.find_by_id(row_id, g.user["id"])})

    @staticmethod
    def delete_row(row_id):
        affected = Data.delete(row_id, g.user["id"])
        if not affected:
            return fail("Data tidak ditemukan", 404)
        return ok({"success": True, "message": "Data dihapus"})

    @staticmethod
    def get_stats():
        stats = Data.get_stats(g.user["id"])
        return ok({"success": True, "data": stats})
