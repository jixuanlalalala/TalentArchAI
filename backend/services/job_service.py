import math

VALID_JOB_TYPES = {"full-time", "part-time", "contract", "internship"}


class JobValidationError(ValueError):
    pass


class JobServiceError(RuntimeError):
    pass


def _optional_salary(value, field_name):
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        raise JobValidationError(f"{field_name} must be a valid number")

    try:
        salary = float(value)
    except (TypeError, ValueError) as exc:
        raise JobValidationError(f"{field_name} must be a valid number") from exc

    if not math.isfinite(salary) or salary < 0:
        raise JobValidationError(f"{field_name} must be zero or greater")
    return salary


def _build_job_payload(recruiter_id, data):
    if not isinstance(data, dict):
        raise JobValidationError("Request body must be a JSON object")

    raw_title = data.get("title")
    raw_description = data.get("description")
    raw_job_type = data.get("type") or "full-time"
    raw_location = data.get("location") or "Remote"

    if not isinstance(raw_title, str):
        raise JobValidationError("Job title must be text")
    if raw_description is not None and not isinstance(raw_description, str):
        raise JobValidationError("Job description must be text")
    if not isinstance(raw_job_type, str):
        raise JobValidationError("Job type must be text")
    if not isinstance(raw_location, str):
        raise JobValidationError("Location must be text")

    title = raw_title.strip()
    description = (raw_description or "").strip()
    job_type = raw_job_type.strip().lower()
    salary_min = _optional_salary(data.get("salaryMin"), "Minimum salary")
    salary_max = _optional_salary(data.get("salaryMax"), "Maximum salary")
    required_skills = data.get("skills") or []
    location = raw_location.strip()

    if not title:
        raise JobValidationError("Job title is required")
    if len(title) > 200:
        raise JobValidationError("Job title must be 200 characters or fewer")
    if len(description) > 20_000:
        raise JobValidationError("Job description must be 20,000 characters or fewer")
    if job_type not in VALID_JOB_TYPES:
        raise JobValidationError("Invalid job type")
    if salary_min is not None and salary_max is not None and salary_max < salary_min:
        raise JobValidationError("Maximum salary cannot be less than minimum salary")
    if not location:
        location = "Remote"
    if len(location) > 255:
        raise JobValidationError("Location must be 255 characters or fewer")
    if not isinstance(required_skills, list) or not all(
        isinstance(skill, str) for skill in required_skills
    ):
        raise JobValidationError("Skills must be a list of strings")

    normalized_skills = [skill.strip() for skill in required_skills if skill.strip()]
    if len(normalized_skills) > 100:
        raise JobValidationError("A job cannot have more than 100 required skills")
    if any(len(skill) > 100 for skill in normalized_skills):
        raise JobValidationError("Each required skill must be 100 characters or fewer")

    return {
        "recruiter_id": recruiter_id,
        "title": title,
        "description": description,
        "type": job_type,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "required_skills": normalized_skills,
        "location": location,
    }


def create_job(supabase, recruiter_id, data):
    payload = _build_job_payload(recruiter_id, data)

    try:
        response = supabase.table("job_postings").insert(payload).execute()
    except Exception as exc:
        raise JobServiceError("Failed to create job posting") from exc

    if not response.data:
        raise JobServiceError("Failed to create job posting")
    return response.data[0]


def get_jobs(supabase, recruiter_id):
    try:
        response = (
            supabase.table("job_postings")
            .select("*")
            .eq("recruiter_id", recruiter_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise JobServiceError("Failed to fetch job postings") from exc

    return response.data or []
    

def get_job_by_id(supabase, job_id, recruiter_id):
    try:
        response = (
            supabase.table("job_postings")
            .select("*")
            .eq("id", str(job_id))
            .eq("recruiter_id", recruiter_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise JobServiceError("Failed to fetch job posting") from exc

    return response.data


def delete_job(supabase, job_id, recruiter_id):
    try:
        response = (
            supabase.table("job_postings")
            .delete()
            .eq("id", str(job_id))
            .eq("recruiter_id", recruiter_id)
            .execute()
        )
    except Exception as exc:
        raise JobServiceError("Failed to delete job posting") from exc

    return bool(response.data)

