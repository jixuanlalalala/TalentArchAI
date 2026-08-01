from uuid import UUID

from flask import Blueprint, g, jsonify

from services.candidate_view_service import (
    CandidateViewServiceError,
    get_job_candidate_detail,
    get_job_candidates,
    get_recruiter_candidate_detail,
    get_recruiter_candidates,
)
from services.job_service import JobServiceError, get_job_by_id
from utils.decorators import require_auth

candidate_bp = Blueprint("candidates", __name__)
candidate_database_bp = Blueprint("candidate_database", __name__)


def _is_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except (TypeError, ValueError):
        return False


def _owned_job_or_response(job_id: str):
    try:
        job = get_job_by_id(g.supabase, job_id, g.user_id)
    except JobServiceError:
        return None, (jsonify({"error": "The job posting could not be verified"}), 503)

    if not job:
        return None, (jsonify({"error": "Job posting not found"}), 404)
    return job, None


@candidate_database_bp.route("/", methods=["GET"], strict_slashes=False)
@require_auth
def list_recruiter_candidates():
    try:
        candidates = get_recruiter_candidates(g.supabase, g.user_id)
    except CandidateViewServiceError as exc:
        return jsonify({"error": str(exc)}), 503
    return jsonify({"candidates": candidates}), 200


@candidate_database_bp.get("/<candidate_id>")
@require_auth
def get_recruiter_candidate(candidate_id):
    if not _is_uuid(candidate_id):
        return jsonify({"error": "Invalid candidate ID"}), 400

    try:
        candidate = get_recruiter_candidate_detail(
            g.supabase,
            g.user_id,
            candidate_id,
        )
    except CandidateViewServiceError as exc:
        return jsonify({"error": str(exc)}), 503

    if not candidate:
        return jsonify({"error": "Candidate not found"}), 404
    return jsonify({"candidate": candidate}), 200


@candidate_bp.get("/<job_id>/candidates")
@require_auth
def list_job_candidates(job_id):
    if not _is_uuid(job_id):
        return jsonify({"error": "Invalid job ID"}), 400

    _, error_response = _owned_job_or_response(job_id)
    if error_response:
        return error_response

    try:
        candidates = get_job_candidates(g.supabase, g.user_id, job_id)
    except CandidateViewServiceError as exc:
        return jsonify({"error": str(exc)}), 503
    return jsonify({"candidates": candidates}), 200


@candidate_bp.get("/<job_id>/candidates/<candidate_id>")
@require_auth
def get_job_candidate(job_id, candidate_id):
    if not _is_uuid(job_id):
        return jsonify({"error": "Invalid job ID"}), 400
    if not _is_uuid(candidate_id):
        return jsonify({"error": "Invalid candidate ID"}), 400

    _, error_response = _owned_job_or_response(job_id)
    if error_response:
        return error_response

    try:
        candidate = get_job_candidate_detail(
            g.supabase,
            g.user_id,
            job_id,
            candidate_id,
        )
    except CandidateViewServiceError as exc:
        return jsonify({"error": str(exc)}), 503

    if not candidate:
        return jsonify({"error": "Candidate not found"}), 404
    return jsonify({"candidate": candidate}), 200
