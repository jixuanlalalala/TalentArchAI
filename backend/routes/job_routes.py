import os
from services.supabase_client import supabase
from flask import Blueprint, jsonify, g, request
#from supabase import create_client, Client
from utils.decorators import require_auth
from services.job_service import (
    create_job,
    get_jobs,
    get_job_by_id,
    delete_job
)



job_bp = Blueprint('jobs', __name__)

# SUPABASE_URL = os.getenv("SUPABASE_URL")
# SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@job_bp.route('/me', methods=['GET'])
@require_auth
def get_my_info():
    return jsonify({"recruiter_id": g.user_id, "message": "Token verified successfully"})

# Create job postings
@job_bp.route("/", methods=["POST"])
@require_auth
def create_job_route():
    data = request.get_json()
    if not data:
        return jsonify({"error":"Request body is requried"}), 400
    
    job, error = create_job(g.user_id, data)
    if error:
        return jsonify({"error":error}), 400
    
    return jsonify(job), 201

@job_bp.route('/', methods=['GET'])
@require_auth
def get_jobs_route():
    jobs = get_jobs(g.user_id)
    return jsonify(jobs), 200

@job_bp.route("/<job_id>", methods=["GET"])
@require_auth
def get_job_route(job_id):
    job = get_job_by_id(job_id, g.user_id)
    if not job:
        return jsonify({"error":"Job not found"}), 404
    
    return jsonify(job), 200

@job_bp.route("/<job_id>", methods=["DELETE"])
@require_auth
def delete_job_route(job_id):
    success, error = delete_job(job_id, g.user_id)
    if not success:
        return jsonify({"error": error}), 404
 
    return jsonify({"message": "Job deleted successfully"}), 200