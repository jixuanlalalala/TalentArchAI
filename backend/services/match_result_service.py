from dataclasses import dataclass


VALID_RECRUITMENT_STATUSES = {
    "new",
    "under_review",
    "shortlisted",
    "rejected",
    "archived",
}


class MatchResultValidationError(ValueError):
    """The requested match-result change is not valid."""


class MatchResultConflictError(RuntimeError):
    """The requested change conflicts with the current analysis state."""


class MatchResultPersistenceError(RuntimeError):
    """A safe, user-facing match-result persistence error."""


@dataclass(frozen=True)
class MatchResultSaveResult:
    match_result: dict
    created: bool


def update_recruitment_status(
    supabase,
    job_id: str,
    candidate_id: str,
    recruitment_status: str,
) -> dict | None:
    if recruitment_status not in VALID_RECRUITMENT_STATUSES:
        raise MatchResultValidationError("Invalid recruitment status")

    try:
        response = (
            supabase.table("match_results")
            .update({"recruitment_status": recruitment_status})
            .eq("job_id", job_id)
            .eq("candidate_id", candidate_id)
            .execute()
        )
    except Exception as exc:
        raise MatchResultPersistenceError(
            "The recruitment status could not be updated."
        ) from exc

    rows = getattr(response, "data", None) or []
    return rows[0] if rows else None


def retry_failed_analysis(
    supabase,
    job_id: str,
    candidate_id: str,
) -> dict:
    reset_payload = {
        "status": "pending",
        "match_score": None,
        "education_score": None,
        "hard_skill_score": None,
        "soft_skill_score": None,
        "work_experience_score": None,
        "gap_analysis": None,
        "matched_skills": None,
        "missing_skills": None,
        "summary": None,
        "processing_started_at": None,
        "analysis_error": None,
    }

    try:
        response = (
            supabase.table("match_results")
            .update(reset_payload)
            .eq("job_id", job_id)
            .eq("candidate_id", candidate_id)
            .eq("status", "failed")
            .execute()
        )
    except Exception as exc:
        raise MatchResultPersistenceError(
            "The analysis could not be queued for retry."
        ) from exc

    rows = getattr(response, "data", None) or []
    if not rows:
        raise MatchResultConflictError("Only failed analyses can be retried")
    return rows[0]


def unlink_candidate_from_job(
    supabase,
    job_id: str,
    candidate_id: str,
) -> dict | None:
    try:
        response = (
            supabase.table("match_results")
            .delete()
            .eq("job_id", job_id)
            .eq("candidate_id", candidate_id)
            .execute()
        )
    except Exception as exc:
        raise MatchResultPersistenceError(
            "The candidate could not be removed from the job."
        ) from exc

    rows = getattr(response, "data", None) or []
    return rows[0] if rows else None


def _find_existing_match(supabase, job_id: str, candidate_id: str):
    response = (
        supabase.table("match_results")
        .select("*")
        .eq("job_id", job_id)
        .eq("candidate_id", candidate_id)
        .maybe_single()
        .execute()
    )
    return getattr(response, "data", None)


def get_or_create_pending_match(
    supabase,
    job_id: str,
    candidate_id: str,
) -> MatchResultSaveResult:
    try:
        existing = _find_existing_match(supabase, job_id, candidate_id)
        if existing:
            return MatchResultSaveResult(match_result=existing, created=False)

        payload = {
            "job_id": job_id,
            "candidate_id": candidate_id,
            "status": "pending",
            "recruitment_status": "new",
            "match_score": None,
            "education_score": None,
            "hard_skill_score": None,
            "soft_skill_score": None,
            "work_experience_score": None,
            "gap_analysis": None,
            "matched_skills": None,
            "missing_skills": None,
            "summary": None,
            "processing_started_at": None,
            "analysis_error": None,
        }
        response = supabase.table("match_results").insert(payload).execute()
        if not response.data:
            raise MatchResultPersistenceError(
                "The candidate could not be linked to the job."
            )
        return MatchResultSaveResult(match_result=response.data[0], created=True)
    except MatchResultPersistenceError:
        raise
    except Exception as exc:
        try:
            existing = _find_existing_match(supabase, job_id, candidate_id)
        except Exception:
            existing = None
        if existing:
            return MatchResultSaveResult(match_result=existing, created=False)
        raise MatchResultPersistenceError(
            "The candidate could not be linked to the job."
        ) from exc
