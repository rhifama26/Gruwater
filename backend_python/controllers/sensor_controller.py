import json
import os
import re
from datetime import datetime

from flask import request
from dotenv import load_dotenv

from config.database import BASE_DIR
from utils.helpers import fail, ok

load_dotenv(os.path.join(BASE_DIR, ".env"))
INGEST_TOKEN = os.getenv("SENSOR_INGEST_TOKEN", "")
DATA_MASUK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_masuk")
HEADER = ["kja_id", "ph", "salinitas", "suhu", "kekeruhan", "status", "timestamp"]
TS_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$")


def _parse_timestamp(ts):
    if isinstance(ts, str) and TS_PATTERN.match(ts.strip()):
        return ts.strip()
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def ingest():
    auth = request.headers.get("Authorization", "")
    if not INGEST_TOKEN or auth != f"Bearer {INGEST_TOKEN}":
        return fail("Token tidak valid", 401)

    body = request.get_json(silent=True) or {}
    nilai = []
    for k in ("ph", "salinitas", "suhu", "kekeruhan"):
        try:
            v = float(body.get(k))
            if v != v:
                raise ValueError
            nilai.append(f"{v:.2f}")
        except (TypeError, ValueError):
            return fail(f"Field {k} tidak valid", 400)
    if body.get("kja_id") is None:
        return fail("kja_id wajib ada", 400)

    ts = _parse_timestamp(body.get("timestamp"))
    os.makedirs(DATA_MASUK_DIR, exist_ok=True)
    path = os.path.join(DATA_MASUK_DIR, f"sensor_{ts[:10]}.csv")
    baru = not os.path.exists(path)
    with open(path, "a", encoding="utf-8") as f:
        if baru:
            f.write(",".join(HEADER) + "\n")
        f.write(
            f"{body['kja_id']},{nilai[0]},{nilai[1]},{nilai[2]},{nilai[3]},{body.get('status', '')},{ts}\n"
        )
    row = {
        "kja_id": body["kja_id"],
        "ph": nilai[0],
        "salinitas": nilai[1],
        "suhu": nilai[2],
        "kekeruhan": nilai[3],
        "status": str(body.get("status", "")),
        "timestamp": ts,
    }
    print(f"[DATA] kja_id={row['kja_id']} -> {os.path.basename(path)}")
    payload = {"success": True, "message": "Data tersimpan", "data": row}
    from flask import jsonify

    return jsonify(payload), 201
