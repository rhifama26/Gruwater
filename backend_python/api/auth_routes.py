from flask import Blueprint

from controllers.auth_controller import AuthController
from middlewares.auth import auth_required

bp = Blueprint("auth", __name__)

bp.add_url_rule("/register", view_func=AuthController.register, methods=["POST"])
bp.add_url_rule("/login", view_func=AuthController.login, methods=["POST"])
bp.add_url_rule("/profile", view_func=auth_required(AuthController.get_profile), methods=["GET"])
bp.add_url_rule("/logout", view_func=auth_required(AuthController.logout), methods=["POST"])
