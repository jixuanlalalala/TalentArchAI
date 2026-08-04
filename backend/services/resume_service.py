from services.candidate_service import (
    CandidatePersistenceError,
    persist_candidate_resume_and_queue_matches,
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

        try:
            validated = validate_resume_file(file)
            raw_text = extract_resume_text(validated)
            extraction = extract_candidate_information(raw_text)
            stored_resume = upload_resume(
                service_supabase,
                recruiter_id,
                job_id,
                validated,
            )
            persistence_result = persist_candidate_resume_and_queue_matches(
                service_supabase,
                recruiter_id,
                job_id,
                extraction,
                stored_resume.path,
                raw_text,
            )

            previous_path = persistence_result.previous_resume_file_url
            if previous_path and previous_path != stored_resume.path:
                delete_resume(service_supabase, previous_path)

            results.append(
                {
                    "original_filename": validated.original_filename,
                    "status": "completed",
                    "candidate_id": persistence_result.candidate_id,
                    "match_result_id": persistence_result.match_result_id,
                    "message": (
                        "Resume uploaded and candidate information extracted "
                        "successfully."
                        if persistence_result.match_created
                        else "Candidate information updated; this candidate is "
                        "already linked to the selected job."
                    ),
                }
            )
        except SAFE_PROCESSING_ERRORS as exc:
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
