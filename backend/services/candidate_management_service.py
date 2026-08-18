from dataclasses import dataclass


class CandidateManagementError(RuntimeError):
    """A safe, user-facing candidate management error."""


@dataclass(frozen=True)
class CandidateResumeReference:
    candidate_id: str
    storage_path: str | None


def _first_row(response) -> dict | None:
    data = getattr(response, "data", None)
    if isinstance(data, dict):
        return data
    if isinstance(data, list) and data:
        return data[0]
    return None


def get_owned_candidate_resume_reference(
    supabase,
    recruiter_id: str,
    candidate_id: str,
) -> CandidateResumeReference | None:
    try:
        response = (
            supabase.table("candidates")
            .select("id,resume_file_url")
            .eq("id", candidate_id)
            .eq("recruiter_id", recruiter_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise CandidateManagementError(
            "The candidate could not be verified."
        ) from exc

    candidate = _first_row(response)
    if not candidate:
        return None
    return CandidateResumeReference(
        candidate_id=str(candidate["id"]),
        storage_path=candidate.get("resume_file_url"),
    )


def delete_owned_candidate(
    supabase,
    recruiter_id: str,
    candidate_id: str,
) -> CandidateResumeReference | None:
    """Delete one owned candidate and atomically return its current resume path."""
    try:
        response = (
            supabase.table("candidates")
            .delete()
            .eq("id", candidate_id)
            .eq("recruiter_id", recruiter_id)
            .execute()
        )
    except Exception as exc:
        raise CandidateManagementError(
            "The candidate could not be deleted."
        ) from exc

    candidate = _first_row(response)
    if not candidate:
        return None
    return CandidateResumeReference(
        candidate_id=str(candidate["id"]),
        storage_path=candidate.get("resume_file_url"),
    )
