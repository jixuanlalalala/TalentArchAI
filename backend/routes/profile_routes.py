from flask import Blueprint, g, jsonify, request

from services.account_service import (
    AccountDeactivationError,
    deactivate_recruiter_account,
)
from services.profile_service import (
    ProfileServiceError,
    ProfileValidationError,
    get_recruiter_profile,
    update_recruiter_profile,
)
from services.supabase_client import create_service_client
from utils.decorators import require_auth


profile_bp = Blueprint("profile", __name__)


@profile_bp.get("")
@require_auth
def get_profile():
    try:
        profile = get_recruiter_profile(g.supabase, g.user_id)
    except ProfileServiceError as exc:
        return jsonify({"error": str(exc)}), 503

    return jsonify({"profile": profile}), 200


@profile_bp.patch("")
@require_auth
def update_profile():
    try:
        profile = update_recruiter_profile(
            g.supabase,
            g.user_id,
            request.get_json(silent=True),
        )
    except ProfileValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except ProfileServiceError as exc:
        return jsonify({"error": str(exc)}), 503

    return jsonify({"profile": profile}), 200


@profile_bp.post("/deactivate")
@require_auth
def deactivate_account():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or payload.get("confirm") is not True:
        return jsonify({"error": "Account deactivation must be confirmed."}), 400

    try:
        service_supabase = create_service_client()
        deactivate_recruiter_account(service_supabase, g.user_id)
    except (AccountDeactivationError, RuntimeError) as exc:
        return jsonify({"error": str(exc)}), 503

    return jsonify({"message": "Account deactivated"}), 200
