import math
from datetime import date, datetime
from decimal import Decimal

from flask import jsonify


def jsonable(value):
    if isinstance(value, Decimal):
        f = float(value)
        return int(f) if f.is_integer() and abs(f) < 1e15 else f
    if isinstance(value, (datetime, date)):
        return value.isoformat(sep=" ")
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    return value


def ok(payload, code=200):
    return jsonify(jsonable(payload)), code


def fail(message, code=500):
    return jsonify({"success": False, "message": message}), code


def calculate_risk_score(suhu, ph, salinitas, kekeruhan):
    ideal = {"suhu": 29, "pH": 7.8, "salinitas": 30, "kekeruhan": 1}
    mins = {"suhu": 26, "pH": 7.0, "salinitas": 10, "kekeruhan": 0}
    maks = {"suhu": 32, "pH": 8.5, "salinitas": 35, "kekeruhan": 5}

    def q(val, ideal_v, min_v, max_v):
        span = max_v - min_v
        return max(0.0, min(100.0, (1 - abs(float(val) - ideal_v) / span) * 100))

    q_suhu = q(suhu, ideal["suhu"], mins["suhu"], maks["suhu"])
    q_ph = q(ph, ideal["pH"], mins["pH"], maks["pH"])
    q_sal = q(salinitas, ideal["salinitas"], mins["salinitas"], maks["salinitas"])
    q_turb = q(kekeruhan, ideal["kekeruhan"], mins["kekeruhan"], maks["kekeruhan"])

    wqi = round((q_suhu + q_ph + q_sal + q_turb) / 4)
    if wqi >= 76:
        status = "Normal"
    elif wqi >= 51:
        status = "Waspada"
    else:
        status = "Bahaya"
    return {"skor": wqi, "status": status}


def get_mitigation_recommendation(status):
    if status == "Normal":
        return "Kondisi air optimal. Lakukan pemantauan rutin."
    if status == "Waspada":
        return "Kurangi pakan, tambah aerasi, cek salinitas."
    return "Segera pindahkan ikan, aerasi maksimal, hentikan pakan."


def finite(*values):
    return all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in values)


def clamp(value, lo, hi):
    return min(hi, max(lo, value))
