from services.supabase_client import supabase

VALID_JOB_TYPES = ["full-time", "part-time", "contract"]


def create_job(recruiter_id, data):
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    job_type = (data.get("type") or "full-time").strip().lower()
    salary_min = data.get("salaryMin")
    salary_max = data.get("salaryMax")
    required_skills = data.get("skills") or []
    location = (data.get("location") or "Remote").strip()

    payload = {
        "recruiter_id": recruiter_id,
        "title": title,
        "description": description,
        "type": job_type,
        "salary_min": float(salary_min) if salary_min not in (None, "") else None,
        "salary_max": float(salary_max) if salary_max not in (None, "") else None,
        "required_skills": required_skills,
        "location": location,
    }

    response = supabase.table("job_postings").insert(payload).execute()

    if getattr(response, "data", None):
        return response.data[0], None

    error_message = getattr(response, "error", None)
    return None, error_message or "Failed to create job posting"


def get_jobs(recruiter_id):
    response = (
        supabase.table("job_postings")
        .select("*")
        .eq("recruiter_id", recruiter_id)
        .order("created_at", desc=True)
        .execute()
    )

    if getattr(response, "data", None) is not None:
        return response.data

    error_message = getattr(response, "error", None)
    raise Exception(error_message or "Failed to fetch job postings")
    

def get_job_by_id(job_id, recruiter_id):
    response = (
        supabase.table("job_postings")
        .select("*")
        .eq("id", f"{job_id}")
        .eq("recruiter_id", recruiter_id)
        .maybe_single()
        .execute()
    )

    if getattr(response, "data", None) is not None:
        return response.data

    error_message = getattr(response, "error", None)
    raise Exception(error_message or "Failed to fetch job postings")

def delete_job(job_id, recruiter_id):
    existing = get_job_by_id(job_id, recruiter_id)
    if not existing:
        return False, "Job not found"

    response = (
        supabase.table("job_postings")
        .delete()
        .eq("id", job_id)
        .eq("recruiter_id", recruiter_id)
        .execute()
    )

    if getattr(response, "error", None):
        return False, str(response.error)

    return True, None

