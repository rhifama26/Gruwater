from flask import Blueprint

from controllers.sensor_controller import ingest

bp = Blueprint("sensor", __name__)

bp.add_url_rule("/ingest", endpoint="ingest", view_func=ingest, methods=["POST"])
