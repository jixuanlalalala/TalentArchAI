from flask import Blueprint, jsonify, g, request
from uuid import UUID

from utils.decorators import require_auth
from services.candidate_rediscovery_config import MAXIMUM_SUGGESTIONS
from services.candidate_rediscovery_service import (
    CandidateRediscoveryConflictError,
    CandidateRediscoveryError,
    find_rediscovery_candidates,
    link_rediscovered_candidates,
)
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


@job_bp.errorhandler(CandidateRediscoveryError)
def handle_rediscovery_error(error):
    return jsonify({"error": str(error)}), 503


@job_bp.errorhandler(CandidateRediscoveryConflictError)
def handle_rediscovery_conflict(error):
    return jsonify({"error": str(error)}), 409


def _is_uuid(value):
    try:
        UUID(str(value))
        return True
    except (TypeError, ValueError, AttributeError):
        return False


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


@job_bp.route("/<job_id>/rediscovery-candidates", methods=["GET"])
@require_auth
def get_rediscovery_candidates_route(job_id):
    if not _is_uuid(job_id):
        return jsonify({"error": "Invalid job ID"}), 400

    job = get_job_by_id(g.supabase, job_id, g.user_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    candidates = find_rediscovery_candidates(
        g.supabase,
        g.user_id,
        job,
    )
    return jsonify({"candidates": candidates}), 200


@job_bp.route("/<job_id>/candidates", methods=["POST"])
@require_auth
def link_rediscovery_candidates_route(job_id):
    if not _is_uuid(job_id):
        return jsonify({"error": "Invalid job ID"}), 400

    data = request.get_json(silent=True)
    candidate_ids = data.get("candidate_ids") if isinstance(data, dict) else None
    if not isinstance(candidate_ids, list) or not candidate_ids:
        return jsonify({"error": "Candidate IDs are required"}), 400
    if len(candidate_ids) > MAXIMUM_SUGGESTIONS:
        return jsonify({"error": "Too many candidates selected"}), 400
    if (
        not all(isinstance(value, str) and _is_uuid(value) for value in candidate_ids)
        or len(set(candidate_ids)) != len(candidate_ids)
    ):
        return jsonify({"error": "Candidate IDs must be unique valid UUIDs"}), 400

    job = get_job_by_id(g.supabase, job_id, g.user_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    match_results = link_rediscovered_candidates(
        g.supabase,
        g.user_id,
        job_id,
        candidate_ids,
    )
    return jsonify(
        {
            "message": "Candidates added for AI analysis.",
            "match_results": match_results,
        }
    ), 201

@job_bp.route("/<job_id>", methods=["DELETE"])
@require_auth
def delete_job_route(job_id):
    success = delete_job(g.supabase, job_id, g.user_id)
    if not success:
        return jsonify({"error": "Job not found"}), 404
 
    return jsonify({"message": "Job deleted successfully"}), 200
