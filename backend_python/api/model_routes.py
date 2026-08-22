from flask import Blueprint

from controllers.model_controller import ModelController
from middlewares.auth import auth_required, role_required

bp = Blueprint("model", __name__)

admin_only = role_required(["admin"])

bp.add_url_rule("/logs", endpoint="logs", view_func=auth_required(ModelController.get_all_logs), methods=["GET"])
bp.add_url_rule("/best", endpoint="best", view_func=auth_required(ModelController.get_best_model), methods=["GET"])
bp.add_url_rule("/latest", endpoint="latest", view_func=auth_required(ModelController.get_latest_log), methods=["GET"])
bp.add_url_rule(
    "/config", endpoint="config", view_func=auth_required(ModelController.get_current_config), methods=["GET"]
)
bp.add_url_rule(
    "/compare", endpoint="compare", view_func=auth_required(ModelController.get_comparison), methods=["GET"]
)
bp.add_url_rule(
    "/optimize", endpoint="optimize", view_func=auth_required(admin_only(ModelController.run_optimization)), methods=["POST"]
)
