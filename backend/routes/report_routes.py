from io import BytesIO
from uuid import UUID

from flask import Blueprint, g, jsonify, request, send_file

from services.job_service import JobServiceError, get_job_by_id
from services.report_service import (
    REPORT_MIME_TYPE,
    ReportServiceError,
    ReportValidationError,
    generate_job_report,
)
from utils.decorators import require_auth


report_bp = Blueprint("reports", __name__)


@report_bp.post("/<job_id>/reports/excel")
@require_auth
def export_job_excel_report(job_id):
    try:
        UUID(job_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid job ID"}), 400

    try:
        job = get_job_by_id(g.supabase, job_id, g.user_id)
    except JobServiceError:
        return jsonify({"error": "The job posting could not be verified"}), 503
    if not job:
        return jsonify({"error": "Job posting not found"}), 404

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    try:
        report = generate_job_report(
            g.supabase,
            g.user_id,
            job,
            payload.get("fields"),
        )
    except ReportValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except ReportServiceError as exc:
        return jsonify({"error": str(exc)}), 503

    return send_file(
        BytesIO(report.content),
        mimetype=REPORT_MIME_TYPE,
        as_attachment=True,
        download_name=report.filename,
        max_age=0,
    )
