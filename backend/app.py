import os
from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from routes.job_routes import job_bp

load_dotenv()  # Load environment variables from .env file
app = Flask(__name__)
CORS(app, 
     resources={r"/api/*": {"origins": "http://localhost:5173", 
                            "allow_headers": ["Content-Type", "Authorization"], 
                            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
                            }},
                            supports_credentials=True)
app.register_blueprint(job_bp, url_prefix="/api/jobs")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "flask"})

@app.get("/api/test")
def test():
    from flask import request
    print("=== HEADERS ===")
    for key, value in request.headers:
        print(f"  {key}: {value}")
    return jsonify({"message": "ok", "headers": dict(request.headers)})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

