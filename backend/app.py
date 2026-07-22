import os
from flask import Flask, jsonify
from flask_cors import CORS
from routes.job_routes import job_bp

app = Flask(__name__)
CORS(app,
     resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
                            "allow_headers": ["Content-Type", "Authorization"],
                            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                            }},
                            supports_credentials=True)
app.register_blueprint(job_bp, url_prefix="/api/jobs")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "flask"})


if __name__ == "__main__":
    debug_enabled = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_enabled, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))

