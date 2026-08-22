from flask import g, request

from middlewares.auth import sign_token
from models.user_model import User
from utils.helpers import fail, ok
from utils.validation import validate_login, validate_user


class AuthController:
    @staticmethod
    def register():
        body = request.get_json(silent=True) or {}
        username, email, password = body.get("username"), body.get("email"), body.get("password")
        errors = validate_user({"username": username, "email": email, "password": password})
        if errors:
            return fail(", ".join(errors), 400)

        existing = User.find_by_username(username)
        if existing:
            return fail("Username sudah digunakan", 400)

        user_id = User.create({"username": username, "email": email, "password": password, "role": "user"})
        user = User.find_by_id(user_id)
        token = sign_token(user)
        data = {
            "token": token,
            "user": {"id": user["id"], "username": user["username"], "email": user["email"], "role": user["role"]},
        }
        return ok({"success": True, "data": data}, 201)

    @staticmethod
    def login():
        body = request.get_json(silent=True) or {}
        username, password = body.get("username"), body.get("password")
        errors = validate_login({"username": username, "password": password})
        if errors:
            return fail(", ".join(errors), 400)

        user = User.find_by_username(username)
        if not user:
            return fail("Username atau password salah", 401)

        valid = User.compare_password(password, user["password"])
        if not valid:
            return fail("Username atau password salah", 401)

        token = sign_token(user)
        data = {
            "token": token,
            "user": {"id": user["id"], "username": user["username"], "email": user["email"], "role": user["role"]},
        }
        return ok({"success": True, "data": data})

    @staticmethod
    def get_profile():
        user = User.find_by_id(g.user["id"])
        if not user:
            return fail("User tidak ditemukan", 404)
        return ok({"data": user})

    @staticmethod
    def logout():
        from flask import jsonify

        return jsonify({"success": True, "message": "Logout berhasil"})
