from flask import Blueprint

from controllers.prediction_input_controller import PredictionInputController
from middlewares.auth import auth_required

bp = Blueprint("prediction_inputs", __name__)

bp.add_url_rule("/", endpoint="get_all", view_func=auth_required(PredictionInputController.get_all), methods=["GET"])
bp.add_url_rule("/stats", endpoint="stats", view_func=auth_required(PredictionInputController.get_stats), methods=["GET"])
