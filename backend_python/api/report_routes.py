from flask import Blueprint

from controllers.report_controller import ReportController
from middlewares.auth import auth_required

bp = Blueprint("report", __name__)

bp.add_url_rule(
    "/full", endpoint="full", view_func=auth_required(ReportController.get_full_report), methods=["GET"]
)
bp.add_url_rule(
    "/export/excel", endpoint="export_excel", view_func=auth_required(ReportController.export_excel), methods=["GET"]
)
