from flask import Blueprint

from controllers.location_controller import LocationController
from middlewares.auth import auth_required, role_required

bp = Blueprint("lokasi", __name__)

admin_only = role_required(["admin"])

bp.add_url_rule("/", endpoint="get_all", view_func=auth_required(LocationController.get_all), methods=["GET"])
bp.add_url_rule(
    "/<int:row_id>", endpoint="get_by_id", view_func=auth_required(LocationController.get_by_id), methods=["GET"]
)
bp.add_url_rule("/", endpoint="create", view_func=auth_required(admin_only(LocationController.create)), methods=["POST"])
bp.add_url_rule(
    "/<int:row_id>", endpoint="update", view_func=auth_required(admin_only(LocationController.update)), methods=["PUT"]
)
bp.add_url_rule(
    "/<int:row_id>",
    endpoint="delete",
    view_func=auth_required(admin_only(LocationController.delete_row)),
    methods=["DELETE"],
)
