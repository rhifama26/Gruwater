from flask import g, request

from models.prediction_input_model import PredictionInput
from utils.helpers import fail, ok


class PredictionInputController:
    @staticmethod
    def get_all():
        user_id = None if g.user.get("role") == "admin" else g.user["id"]
        return ok({"success": True, "data": PredictionInput.find_all(user_id)})

    @staticmethod
    def get_stats():
        return ok({"success": True, "data": PredictionInput.get_stats(g.user["id"])})
