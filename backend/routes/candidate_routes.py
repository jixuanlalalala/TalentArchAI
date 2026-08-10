from uuid import UUID

from flask import Blueprint, g, jsonify, request

from services.candidate_view_service import (
    CandidateViewServiceError,
    get_job_candidate_detail,
    get_job_candidates,
    get_recruiter_candidate_detail,
    get_recruiter_candidates,
)
from services.job_service import JobServiceError, get_job_by_id
from services.match_result_service import (
    MatchResultConflictError,
    MatchResultPersistenceError,
    MatchResultValidationError,
    retry_failed_analysis,
    unlink_candidate_from_job,
    update_recruitment_status,
)
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


def _owned_candidate_relationship_or_response(job_id: str, candidate_id: str):
    _, error_response = _owned_job_or_response(job_id)
    if error_response:
        return None, error_response

    try:
        candidate = get_job_candidate_detail(
            g.supabase,
            g.user_id,
            job_id,
            candidate_id,
        )
    except CandidateViewServiceError:
        return None, (
            jsonify({"error": "The candidate relationship could not be verified"}),
            503,
        )

    if not candidate:
        return None, (jsonify({"error": "Candidate relationship not found"}), 404)
    return candidate, None


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


@candidate_bp.patch(
    "/<job_id>/candidates/<candidate_id>/recruitment-status"
)
@require_auth
def update_candidate_recruitment_status(job_id, candidate_id):
    if not _is_uuid(job_id):
        return jsonify({"error": "Invalid job ID"}), 400
    if not _is_uuid(candidate_id):
        return jsonify({"error": "Invalid candidate ID"}), 400

    _, error_response = _owned_candidate_relationship_or_response(
        job_id,
        candidate_id,
    )
    if error_response:
        return error_response

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    try:
        match_result = update_recruitment_status(
            g.supabase,
            job_id,
            candidate_id,
            data.get("recruitment_status"),
        )
    except MatchResultValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except MatchResultPersistenceError as exc:
        return jsonify({"error": str(exc)}), 503

    if not match_result:
        return jsonify({"error": "Candidate relationship not found"}), 404
    return jsonify({"match_result": match_result}), 200


@candidate_bp.post("/<job_id>/candidates/<candidate_id>/retry-analysis")
@require_auth
def retry_candidate_analysis(job_id, candidate_id):
    if not _is_uuid(job_id):
        return jsonify({"error": "Invalid job ID"}), 400
    if not _is_uuid(candidate_id):
        return jsonify({"error": "Invalid candidate ID"}), 400

    _, error_response = _owned_candidate_relationship_or_response(
        job_id,
        candidate_id,
    )
    if error_response:
        return error_response

    try:
        match_result = retry_failed_analysis(
            g.supabase,
            job_id,
            candidate_id,
        )
    except MatchResultConflictError as exc:
        return jsonify({"error": str(exc)}), 409
    except MatchResultPersistenceError as exc:
        return jsonify({"error": str(exc)}), 503

    return jsonify({"match_result": match_result}), 200


@candidate_bp.delete("/<job_id>/candidates/<candidate_id>")
@require_auth
def unlink_candidate(job_id, candidate_id):
    if not _is_uuid(job_id):
        return jsonify({"error": "Invalid job ID"}), 400
    if not _is_uuid(candidate_id):
        return jsonify({"error": "Invalid candidate ID"}), 400

    _, error_response = _owned_candidate_relationship_or_response(
        job_id,
        candidate_id,
    )
    if error_response:
        return error_response

    try:
        match_result = unlink_candidate_from_job(
            g.supabase,
            job_id,
            candidate_id,
        )
    except MatchResultPersistenceError as exc:
        return jsonify({"error": str(exc)}), 503

    if not match_result:
        return jsonify({"error": "Candidate relationship not found"}), 404
    return jsonify({"message": "Candidate removed from job"}), 200
