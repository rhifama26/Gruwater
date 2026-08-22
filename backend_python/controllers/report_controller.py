import time
from io import BytesIO

from flask import g, request
from openpyxl import Workbook

from models.data_model import Data
from models.prediction_input_model import PredictionInput
from models.prediction_model import Prediction
from utils.helpers import calculate_risk_score, fail, jsonable, ok


class ReportController:
    @staticmethod
    def get_full_report():
        rows = Data.find_all(10000, 0, g.user["id"])
        predictions = Prediction.find_all(g.user["id"])
        history = PredictionInput.find_all(g.user["id"])
        stats = Data.get_stats(g.user["id"])
        pred_stats = Prediction.get_stats(g.user["id"])
        hist_stats = PredictionInput.get_stats(g.user["id"])

        enriched = []
        for d in rows:
            risk = calculate_risk_score(d["suhu"], d["pH"], d["salinitas"], d["kekeruhan"])
            enriched.append({**d, "skor_risiko": risk["skor"], "status": risk["status"]})

        summary = {**(stats or {}), **(hist_stats or {}), **(pred_stats or {})}
        payload = {
            "success": True,
            "data": {
                "summary": summary,
                "data": enriched,
                "predictions": predictions,
                "history": history,
            },
        }
        from flask import jsonify

        return jsonify(jsonable(payload))

    @staticmethod
    def export_excel():
        lokasi = request.args.get("lokasi", "")
        include_prediksi = request.args.get("prediksi") != "false"

        wb = Workbook()

        if include_prediksi:
            predictions = Prediction.find_all(g.user["id"])
            filtered = [p for p in predictions if p.get("lokasi") == lokasi] if lokasi else predictions
            sorted_rows = sorted(
                filtered,
                key=lambda p: ((p.get("lokasi") or ""), int(p["step_ke"])),
            )
            ws = wb.active
            ws.title = "Prediksi"
            headers = ["Tanggal Prediksi", "Lokasi", "Step Ke", "Suhu", "pH", "Salinitas", "Kekeruhan", "Skor Risiko", "Status"]
            ws.append(headers)
            for p in sorted_rows:
                ws.append(
                    [
                        str(p["tanggal_prediksi"]),
                        p["lokasi"],
                        p["step_ke"],
                        float(p["suhu"]),
                        float(p["pH"]),
                        float(p["salinitas"]),
                        float(p["kekeruhan"]),
                        float(p["skor_risiko"]),
                        p["status"],
                    ]
                )

        data = Data.find_all_export(g.user["id"], lokasi or None)
        ws2 = wb.create_sheet("Data Kualitas Air")
        ws2.append(["Tanggal", "Lokasi", "Suhu", "pH", "Salinitas", "Kekeruhan"])
        if data:
            for d in data:
                tanggal = d["tanggal"]
                ws2.append(
                    [
                        str(tanggal),
                        d["lokasi"],
                        float(d["suhu"]),
                        float(d["pH"]),
                        float(d["salinitas"]),
                        float(d["kekeruhan"]),
                    ]
                )
        else:
            ws2.append(["Tidak ada data kualitas air"])

        buffer = BytesIO()
        wb.save(buffer)
        body = buffer.getvalue()
        filename = f"laporan_{int(time.time() * 1000)}.xlsx"

        from flask import Response

        response = Response(body)
        response.headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response
