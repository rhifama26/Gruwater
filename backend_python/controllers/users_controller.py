from flask import g, request

from models.user_model import User
from utils.helpers import fail, ok
from utils.validation import validate_user


class UsersController:
    @staticmethod
    def get_all():
        return ok({"success": True, "data": User.find_all()})

    @staticmethod
    def create():
        body = request.get_json(silent=True) or {}
        errors = validate_user(body)
        if errors:
            return fail(", ".join(errors), 400)
        user_id = User.create(body)
        return ok({"success": True, "data": User.find_by_id(user_id)}, 201)

    @staticmethod
    def update(user_id):
        body = request.get_json(silent=True) or {}
        affected = User.update(user_id, body)
        if not affected:
            return fail("User tidak ditemukan", 404)
        return ok({"success": True, "data": User.find_by_id(user_id)})

    @staticmethod
    def delete_row(user_id):
        try:
            target_id = int(user_id)
        except (TypeError, ValueError):
            return fail("User tidak ditemukan", 404)
        if target_id == 1:
            return fail("Tidak bisa hapus admin utama", 400)
        affected = User.delete(target_id)
        if not affected:
            return fail("User tidak ditemukan", 404)
        return ok({"success": True, "message": "User dihapus"})
