from flask import g, request

from models.location_model import Lokasi
from utils.helpers import fail, ok


class LocationController:
    @staticmethod
    def get_all():
        return ok({"success": True, "data": Lokasi.find_all()})

    @staticmethod
    def get_by_id(row_id):
        row = Lokasi.find_by_id(row_id)
        if not row:
            return fail("Lokasi tidak ditemukan", 404)
        return ok({"success": True, "data": row})

    @staticmethod
    def create():
        body = request.get_json(silent=True) or {}
        if not body.get("nama_lokasi") or not str(body["nama_lokasi"]).strip():
            return fail("Nama lokasi harus diisi", 400)
        new_id = Lokasi.create({**body, "user_id": g.user["id"]})
        return ok({"success": True, "data": Lokasi.find_by_id(new_id)}, 201)

    @staticmethod
    def update(row_id):
        body = request.get_json(silent=True) or {}
        if not body.get("nama_lokasi") or not str(body["nama_lokasi"]).strip():
            return fail("Nama lokasi harus diisi", 400)
        affected = Lokasi.update(row_id, body)
        if not affected:
            return fail("Lokasi tidak ditemukan", 404)
        return ok({"success": True, "data": Lokasi.find_by_id(row_id)})

    @staticmethod
    def delete_row(row_id):
        affected = Lokasi.delete(row_id)
        if not affected:
            return fail("Lokasi tidak ditemukan", 404)
        return ok({"success": True, "message": "Lokasi dihapus"})
