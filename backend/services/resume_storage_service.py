from dataclasses import dataclass
from uuid import uuid4

from services.resume_file_service import ValidatedResume

RESUME_BUCKET = "resumes"


class ResumeStorageError(RuntimeError):
    """A safe, user-facing private storage error."""


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
