from uuid import UUID

from flask import Blueprint, g, jsonify, request

from services.job_service import JobServiceError, get_job_by_id
from services.resume_file_service import (
    MAX_RESUME_FILE_SIZE,
    MAX_RESUMES_PER_REQUEST,
)
from services.resume_service import process_resumes
from services.supabase_client import create_service_client
from utils.decorators import require_auth

resume_bp = Blueprint("resumes", __name__)

MAX_RESUME_REQUEST_SIZE = (
    MAX_RESUME_FILE_SIZE * MAX_RESUMES_PER_REQUEST
) + (1024 * 1024)


@resume_bp.post("/<job_id>/resumes")
@require_auth
def upload_resumes(job_id):
    try:
        UUID(job_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid job ID"}), 400

    if request.content_length and request.content_length > MAX_RESUME_REQUEST_SIZE:
        return jsonify({"error": "The upload request is too large"}), 413

    files = [file for file in request.files.getlist("files") if file]
    if not files:
        return jsonify({"error": "At least one resume file is required"}), 400
    if len(files) > MAX_RESUMES_PER_REQUEST:
        return jsonify(
            {"error": f"A maximum of {MAX_RESUMES_PER_REQUEST} files is allowed"}
        ), 400

    try:
        job = get_job_by_id(g.supabase, job_id, g.user_id)
    except JobServiceError:
        return jsonify({"error": "The job posting could not be verified"}), 503
    if not job:
        return jsonify({"error": "Job posting not found"}), 404

    try:
        service_supabase = create_service_client()
    except RuntimeError:
        return jsonify({"error": "Resume storage is not configured"}), 503

    results = process_resumes(service_supabase, g.user_id, job_id, files)
    completed_count = sum(result["status"] == "completed" for result in results)

    if completed_count == len(results):
        status_code = 201
    elif completed_count:
        status_code = 207
    else:
        status_code = 422

    return jsonify({"success": completed_count > 0, "results": results}), status_code
