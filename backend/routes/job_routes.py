from flask import Blueprint, jsonify, g, request
from utils.decorators import require_auth
from services.job_service import (
    JobServiceError,
    JobValidationError,
    create_job,
    get_jobs,
    get_job_by_id,
    delete_job
)



job_bp = Blueprint("jobs", __name__)


@job_bp.errorhandler(JobValidationError)
def handle_validation_error(error):
    return jsonify({"error": str(error)}), 400


@job_bp.errorhandler(JobServiceError)
def handle_service_error(error):
    return jsonify({"error": str(error)}), 503


@job_bp.route('/me', methods=['GET'])
@require_auth
def get_my_info():
    return jsonify({"recruiter_id": g.user_id, "message": "Token verified successfully"})

# Create job postings
@job_bp.route("/", methods=["POST"])
@require_auth
def create_job_route():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    job = create_job(g.supabase, g.user_id, data)
    return jsonify(job), 201

@job_bp.route('/', methods=['GET'])
@require_auth
def get_jobs_route():
    jobs = get_jobs(g.supabase, g.user_id)
    return jsonify(jobs), 200

@job_bp.route("/<job_id>", methods=["GET"])
@require_auth
def get_job_route(job_id):
    job = get_job_by_id(g.supabase, job_id, g.user_id)
    if not job:
        return jsonify({"error":"Job not found"}), 404
    
    return jsonify(job), 200

@job_bp.route("/<job_id>", methods=["DELETE"])
@require_auth
def delete_job_route(job_id):
    success = delete_job(g.supabase, job_id, g.user_id)
    if not success:
        return jsonify({"error": "Job not found"}), 404
 
    return jsonify({"message": "Job deleted successfully"}), 200
