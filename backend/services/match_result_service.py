from dataclasses import dataclass


class MatchResultPersistenceError(RuntimeError):
    """A safe, user-facing match-result persistence error."""


@dataclass(frozen=True)
class MatchResultSaveResult:
    match_result: dict
    created: bool


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
