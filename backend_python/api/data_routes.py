from flask import Blueprint

from controllers.data_controller import DataController
from middlewares.auth import auth_required, role_required

bp = Blueprint("data", __name__)

GET_ROUTES = [
    ("/", "get_all", DataController.get_all),
    ("/latest-per-lokasi", "latest_per_lokasi", DataController.get_latest_per_lokasi),
    ("/latest", "latest", DataController.get_latest),
    ("/lastday", "lastday", DataController.get_last_day),
    ("/stats", "stats", DataController.get_stats),
]

for path, endpoint, view in GET_ROUTES:
    bp.add_url_rule(path, endpoint=endpoint, view_func=auth_required(view), methods=["GET"])

WRITE_ROLES = role_required(["admin", "user"])

bp.add_url_rule(
    "/<int:row_id>", endpoint="get_by_id", view_func=auth_required(DataController.get_by_id), methods=["GET"]
)
bp.add_url_rule(
    "/", endpoint="create", view_func=auth_required(WRITE_ROLES(DataController.create)), methods=["POST"]
)
bp.add_url_rule(
    "/<int:row_id>", endpoint="update", view_func=auth_required(WRITE_ROLES(DataController.update)), methods=["PUT"]
)
bp.add_url_rule(
    "/<int:row_id>",
    endpoint="delete",
    view_func=auth_required(WRITE_ROLES(DataController.delete_row)),
    methods=["DELETE"],
)
