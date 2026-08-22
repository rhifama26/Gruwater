from flask import Blueprint

from controllers.prediction_controller import PredictionController
from middlewares.auth import auth_required, role_required

bp = Blueprint("prediction", __name__)

write_roles = role_required(["admin", "user"])

bp.add_url_rule("/", endpoint="get_all", view_func=auth_required(PredictionController.get_all), methods=["GET"])
bp.add_url_rule("/latest", endpoint="latest", view_func=auth_required(PredictionController.get_latest), methods=["GET"])
bp.add_url_rule(
    "/dashboard", endpoint="dashboard", view_func=auth_required(PredictionController.get_dashboard), methods=["GET"]
)
bp.add_url_rule(
    "/run",
    endpoint="run",
    view_func=auth_required(write_roles(PredictionController.run_prediction)),
    methods=["POST"],
)
