from services.candidate_service import (
    CandidatePersistenceError,
    CandidateSaveResult,
    rollback_candidate,
    save_candidate,
)
from services.match_result_service import (
    MatchResultPersistenceError,
    get_or_create_pending_match,
)
from services.openrouter_service import OpenRouterError, extract_candidate_information
from services.resume_file_service import (
    ResumeFileError,
    extract_resume_text,
    validate_resume_file,
)
from services.resume_storage_service import (
    ResumeStorageError,
    delete_resume,
    upload_resume,
)

SAFE_PROCESSING_ERRORS = (
    ResumeFileError,
    ResumeStorageError,
    OpenRouterError,
    CandidatePersistenceError,
    MatchResultPersistenceError,
)


def process_resumes(
    service_supabase,
    recruiter_id: str,
    job_id: str,
    files,
) -> list[dict]:
    results = []

    for file in files:
        original_filename = (file.filename or "").strip() or "Unnamed file"
        stored_resume = None
        candidate_result: CandidateSaveResult | None = None

        try:
            validated = validate_resume_file(file)
            raw_text = extract_resume_text(validated)
            stored_resume = upload_resume(
                service_supabase,
                recruiter_id,
                job_id,
                validated,
            )
            extraction = extract_candidate_information(raw_text)
            candidate_result = save_candidate(
                service_supabase,
                recruiter_id,
                extraction,
                stored_resume.path,
                raw_text,
            )
            match_result = get_or_create_pending_match(
                service_supabase,
                job_id,
                candidate_result.candidate["id"],
            )

            previous_path = (
                candidate_result.previous_candidate or {}
            ).get("resume_file_url")
            if previous_path and previous_path != stored_resume.path:
                delete_resume(service_supabase, previous_path)

            results.append(
                {
                    "original_filename": validated.original_filename,
                    "status": "completed",
                    "candidate_id": candidate_result.candidate["id"],
                    "match_result_id": match_result.match_result["id"],
                    "message": (
                        "Resume uploaded and candidate information extracted "
                        "successfully."
                        if match_result.created
                        else "Candidate information updated; this candidate is "
                        "already linked to the selected job."
                    ),
                }
            )
        except SAFE_PROCESSING_ERRORS as exc:
            if candidate_result:
                rollback_candidate(service_supabase, candidate_result)
            if stored_resume:
                delete_resume(service_supabase, stored_resume.path)
            results.append(
                {
                    "original_filename": original_filename,
                    "status": "failed",
                    "message": str(exc),
                }
            )
        except Exception:
            if candidate_result:
                rollback_candidate(service_supabase, candidate_result)
            if stored_resume:
                delete_resume(service_supabase, stored_resume.path)
            results.append(
                {
                    "original_filename": original_filename,
                    "status": "failed",
                    "message": "The resume could not be processed.",
                }
            )

    return results
