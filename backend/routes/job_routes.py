from flask import Blueprint, jsonify, g
from utils.decorators import require_auth

job_bp = Blueprint('jobs', __name__)

@job_bp.route('/me', methods=['GET'])
@require_auth
def get_my_info():
    return jsonify({"recruiter_id": g.user_id, "message": "Token verified successfully"})