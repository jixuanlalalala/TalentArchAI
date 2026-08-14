PROFILE_FIELDS = "id,name,job_title,phone,created_at"


class ProfileValidationError(ValueError):
    """Raised when recruiter profile input is invalid."""


class ProfileServiceError(RuntimeError):
    """A safe recruiter-profile persistence error."""


def _response_data(response, default=None):
    data = getattr(response, "data", None)
    return default if data is None else data


def get_recruiter_profile(supabase, recruiter_id: str) -> dict | None:
    try:
        response = (
            supabase.table("recruiters")
            .select(PROFILE_FIELDS)
            .eq("id", recruiter_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise ProfileServiceError("The recruiter profile could not be loaded.") from exc

    rows = _response_data(response, [])
    return rows[0] if rows else None


def _normalized_text(payload: dict, field: str, maximum: int, *, required=False):
    value = payload.get(field)
    if value is None and not required:
        return None
    if not isinstance(value, str):
        raise ProfileValidationError(f"{field.replace('_', ' ').title()} must be text.")

    value = value.strip()
    if required and not value:
        raise ProfileValidationError("Name is required.")
    if len(value) > maximum:
        raise ProfileValidationError(
            f"{field.replace('_', ' ').title()} must be {maximum} characters or fewer."
        )
    return value or None


def update_recruiter_profile(
    supabase,
    recruiter_id: str,
    payload,
) -> dict:
    if not isinstance(payload, dict):
        raise ProfileValidationError("Request body must be a JSON object.")

    unexpected = set(payload) - {"name", "job_title", "phone"}
    if unexpected:
        raise ProfileValidationError("One or more profile fields are invalid.")

    profile = {
        "id": recruiter_id,
        "name": _normalized_text(payload, "name", 100, required=True),
        "job_title": _normalized_text(payload, "job_title", 100),
        "phone": _normalized_text(payload, "phone", 40),
    }

    try:
        response = (
            supabase.table("recruiters")
            .upsert(profile, on_conflict="id")
            .select(PROFILE_FIELDS)
            .execute()
        )
    except Exception as exc:
        raise ProfileServiceError("The recruiter profile could not be saved.") from exc

    rows = _response_data(response, [])
    if not rows:
        raise ProfileServiceError("The recruiter profile could not be saved.")
    return rows[0]
