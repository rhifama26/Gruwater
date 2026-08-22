import os
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from api.auth_routes import bp as auth_bp
from api.data_routes import bp as data_bp
from api.location_routes import bp as lokasi_bp
from api.model_routes import bp as model_bp
from api.prediction_routes import bp as prediction_bp
from api.prediction_input_routes import bp as prediction_input_bp
from api.report_routes import bp as report_bp
from api.sensor_routes import bp as sensor_bp
from api.users_routes import bp as users_bp

app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"], supports_credentials=True)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(data_bp, url_prefix="/api/data")
app.register_blueprint(model_bp, url_prefix="/api/model")
app.register_blueprint(prediction_bp, url_prefix="/api/prediction")
app.register_blueprint(prediction_input_bp, url_prefix="/api/prediction-inputs")
app.register_blueprint(report_bp, url_prefix="/api/report")
app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(lokasi_bp, url_prefix="/api/lokasi")
app.register_blueprint(sensor_bp, url_prefix="/api/sensor")


@app.get("/api/health")
def health():
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return jsonify({"success": True, "message": "Server running", "timestamp": now})


@app.errorhandler(500)
def internal_error(e):
    print(e)
    return jsonify({"success": False, "message": "Terjadi kesalahan server"}), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Endpoint tidak ditemukan"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5005))
    print(f"Server (Python) jalan di http://localhost:{port}")
    app.run(host="0.0.0.0", port=port)
