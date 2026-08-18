from dataclasses import dataclass

from models.candidate_extraction import CandidateExtraction

CANDIDATE_DATA_FIELDS = (
    "name",
    "email",
    "phone",
    "location",
    "education",
    "hard_skills",
    "soft_skills",
    "work_experience",
    "resume_file_url",
    "raw_text",
    "extraction_status",
)


class CandidatePersistenceError(RuntimeError):
    """A safe, user-facing candidate persistence error."""


@dataclass
class CandidateSaveResult:
    candidate: dict
    created: bool
    previous_candidate: dict | None = None


@dataclass(frozen=True)
class CandidateQueueSaveResult:
    candidate_id: str
    match_result_id: str
    candidate_created: bool
    previous_resume_file_url: str | None = None
    match_created: bool = True


def _candidate_payload(
    recruiter_id: str,
    extraction: CandidateExtraction,
    storage_path: str,
    raw_text: str,
) -> dict:
    return {
        "recruiter_id": recruiter_id,
        **extraction.model_dump(),
        "resume_file_url": storage_path,
        "raw_text": raw_text,
        "extraction_status": "completed",
    }


def _find_candidate_by_email(supabase, recruiter_id: str, email: str | None):
    if not email:
        return None
    try:
        response = (
            supabase.table("candidates")
            .select("*")
            .eq("recruiter_id", recruiter_id)
            .eq("email", email.strip().lower())
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise CandidatePersistenceError(
            "Existing candidate records could not be checked."
        ) from exc
    return getattr(response, "data", None)


def save_candidate(
    supabase,
    recruiter_id: str,
    extraction: CandidateExtraction,
    storage_path: str,
    raw_text: str,
) -> CandidateSaveResult:
    payload = _candidate_payload(
        recruiter_id,
        extraction,
        storage_path,
        raw_text,
    )
    existing = _find_candidate_by_email(supabase, recruiter_id, extraction.email)

    try:
        if existing:
            response = (
                supabase.table("candidates")
                .update(payload)
                .eq("id", existing["id"])
                .eq("recruiter_id", recruiter_id)
                .execute()
            )
            if not response.data:
                raise CandidatePersistenceError("The candidate could not be updated.")
            return CandidateSaveResult(
                candidate=response.data[0],
                created=False,
                previous_candidate=existing,
            )

        response = supabase.table("candidates").insert(payload).execute()
        if not response.data:
            raise CandidatePersistenceError("The candidate could not be created.")
        return CandidateSaveResult(candidate=response.data[0], created=True)
    except CandidatePersistenceError:
        raise
    except Exception as exc:
        raise CandidatePersistenceError(
            "Candidate information could not be saved."
        ) from exc


def persist_candidate_resume_and_queue_matches(
    supabase,
    recruiter_id: str,
    job_id: str,
    extraction: CandidateExtraction,
    storage_path: str,
    raw_text: str,
) -> CandidateQueueSaveResult:
    """Atomically save the latest candidate profile and queue linked analyses."""
    params = {
        "p_recruiter_id": recruiter_id,
        "p_job_id": job_id,
        "p_name": extraction.name,
        "p_email": extraction.email,
        "p_phone": extraction.phone,
        "p_location": extraction.location,
        "p_education": extraction.education,
        "p_hard_skills": extraction.hard_skills,
        "p_soft_skills": extraction.soft_skills,
        "p_work_experience": extraction.work_experience,
        "p_resume_file_url": storage_path,
        "p_raw_text": raw_text,
    }

    try:
        response = supabase.rpc(
            "persist_candidate_resume_and_queue_matches", params
        ).execute()
        data = getattr(response, "data", None)
        if not isinstance(data, dict):
            raise CandidatePersistenceError(
                "Candidate information could not be saved."
            )
        return CandidateQueueSaveResult(
            candidate_id=str(data["candidate_id"]),
            match_result_id=str(data["match_result_id"]),
            candidate_created=bool(data["candidate_created"]),
            previous_resume_file_url=data.get("previous_resume_file_url"),
            match_created=bool(data.get("match_created", True)),
        )
    except CandidatePersistenceError:
        raise
    except (KeyError, TypeError, ValueError) as exc:
        raise CandidatePersistenceError(
            "Candidate information could not be saved."
        ) from exc
    except Exception as exc:
        raise CandidatePersistenceError(
            "Candidate information could not be saved."
        ) from exc


def rollback_candidate(supabase, result: CandidateSaveResult) -> bool:
    try:
        if result.created:
            (
                supabase.table("candidates")
                .delete()
                .eq("id", result.candidate["id"])
                .execute()
            )
            return True

        previous = result.previous_candidate or {}
        restore_payload = {
            field: previous.get(field) for field in CANDIDATE_DATA_FIELDS
        }
        (
            supabase.table("candidates")
            .update(restore_payload)
            .eq("id", result.candidate["id"])
            .execute()
        )
        return True
    except Exception:
        return False
