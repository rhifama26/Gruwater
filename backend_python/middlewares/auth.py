import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, jsonify, request
from dotenv import load_dotenv

from config.database import BASE_DIR

load_dotenv(os.path.join(BASE_DIR, ".env"))
JWT_SECRET = os.getenv("JWT_SECRET", "rahasia_super_rahasia")
JWT_EXPIRES_IN = os.getenv("JWT_EXPIRES_IN", "7d")


def parse_expiry(value):
    value = str(value).strip().lower()
    units = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    if value and value[-1] in units and value[:-1].isdigit():
        return int(value[:-1]) * units[value[-1]]
    try:
        return int(value)
    except ValueError:
        return 7 * 86400


def sign_token(user):
    payload = {"id": user["id"], "username": user["username"], "email": user["email"], "role": user["role"]}
    expires = datetime.now(timezone.utc) + timedelta(seconds=parse_expiry(JWT_EXPIRES_IN))
    payload["exp"] = expires
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header.replace("Bearer ", "") if header else ""
        if not token:
            return jsonify({"success": False, "message": "Token tidak ditemukan"}), 401
        try:
            g.user = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except Exception:
            return jsonify({"success": False, "message": "Token tidak valid"}), 401
        return fn(*args, **kwargs)

    return wrapper


def role_required(roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not getattr(g, "user", None):
                return jsonify({"success": False, "message": "Unauthorized"}), 401
            if g.user.get("role") not in roles:
                return jsonify({"success": False, "message": "Akses ditolak"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
