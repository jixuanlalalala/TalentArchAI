from dataclasses import dataclass
from pathlib import PurePosixPath
from uuid import uuid4

from storage3.exceptions import StorageApiError

from services.resume_file_service import ValidatedResume

RESUME_BUCKET = "resumes"
RESUME_SIGNED_URL_EXPIRY_SECONDS = 300


class ResumeStorageError(RuntimeError):
    """A safe, user-facing private storage error."""


class ResumeUnavailableError(RuntimeError):
    """Raised when an owned candidate has no accessible resume object."""


@dataclass(frozen=True)
class StoredResume:
    bucket: str
    path: str


def upload_resume(
    supabase,
    recruiter_id: str,
    job_id: str,
    resume: ValidatedResume,
) -> StoredResume:
    unique_filename = f"{uuid4()}-{resume.safe_filename}"
    storage_path = f"{recruiter_id}/{job_id}/{unique_filename}"

    try:
        supabase.storage.from_(RESUME_BUCKET).upload(
            storage_path,
            resume.content,
            {
                "content-type": resume.mime_type,
                "upsert": "false",
                "metadata": {"original_filename": resume.original_filename},
            },
        )
    except Exception as exc:
        raise ResumeStorageError("The resume could not be uploaded to storage.") from exc

    return StoredResume(bucket=RESUME_BUCKET, path=storage_path)


def delete_resume(supabase, storage_path: str | None) -> bool:
    if not storage_path:
        return True
    try:
        supabase.storage.from_(RESUME_BUCKET).remove([storage_path])
        return True
    except Exception:
        return False


def _is_owned_resume_path(storage_path: str, recruiter_id: str) -> bool:
    if not storage_path or "\\" in storage_path:
        return False
    path = PurePosixPath(storage_path)
    return (
        not path.is_absolute()
        and len(path.parts) >= 3
        and path.parts[0] == recruiter_id
        and all(part not in ("", ".", "..") for part in path.parts)
    )


def create_resume_signed_url(
    supabase,
    recruiter_id: str,
    storage_path: str | None,
) -> str:
    if not storage_path or not _is_owned_resume_path(storage_path, recruiter_id):
        raise ResumeUnavailableError("Resume file is unavailable.")

    try:
        response = (
            supabase.storage.from_(RESUME_BUCKET).create_signed_url(
                storage_path,
                RESUME_SIGNED_URL_EXPIRY_SECONDS,
            )
        )
    except StorageApiError as exc:
        if str(exc.status) == "404":
            raise ResumeUnavailableError("Resume file is unavailable.") from exc
        raise ResumeStorageError("The resume file could not be opened.") from exc
    except Exception as exc:
        raise ResumeStorageError("The resume file could not be opened.") from exc

    signed_url = response.get("signedURL") if isinstance(response, dict) else None
    if not signed_url:
        raise ResumeUnavailableError("Resume file is unavailable.")
    return signed_url
