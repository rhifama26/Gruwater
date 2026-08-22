from flask import Blueprint

from controllers.users_controller import UsersController
from middlewares.auth import auth_required, role_required

bp = Blueprint("users", __name__)

admin_guard = role_required(["admin"])

bp.add_url_rule("/", endpoint="get_all", view_func=auth_required(admin_guard(UsersController.get_all)), methods=["GET"])
bp.add_url_rule("/", endpoint="create", view_func=auth_required(admin_guard(UsersController.create)), methods=["POST"])
bp.add_url_rule(
    "/<int:user_id>", endpoint="update", view_func=auth_required(admin_guard(UsersController.update)), methods=["PUT"]
)
bp.add_url_rule(
    "/<int:user_id>", endpoint="delete", view_func=auth_required(admin_guard(UsersController.delete_row)), methods=["DELETE"]
)
