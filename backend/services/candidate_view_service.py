PROFILE_FIELDS = "id,name,email,phone,location"
CANDIDATE_LIST_FIELDS = (
    "id,name,email,phone,location,created_at,extraction_status"
)
CANDIDATE_DETAIL_FIELDS = (
    f"{CANDIDATE_LIST_FIELDS},education,hard_skills,soft_skills,"
    "work_experience"
)
MATCH_LIST_FIELDS = (
    "id,candidate_id,status,"
    "education_score,hard_skill_score,soft_skill_score,"
    "work_experience_score"
)
MATCH_DETAIL_FIELDS = (
    f"{MATCH_LIST_FIELDS},gap_analysis,matched_skills,missing_skills,summary"
)


class CandidateViewServiceError(RuntimeError):
    """A safe, user-facing error for candidate read operations."""


def _response_data(response, default=None):
    data = getattr(response, "data", None)
    return default if data is None else data


def get_recruiter_candidates(supabase, recruiter_id: str) -> list[dict]:
    try:
        response = (
            supabase.table("candidates")
            .select(CANDIDATE_LIST_FIELDS)
            .eq("recruiter_id", recruiter_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise CandidateViewServiceError(
            "Candidate records could not be loaded."
        ) from exc

    return _response_data(response, [])


def get_recruiter_candidate_detail(
    supabase,
    recruiter_id: str,
    candidate_id: str,
) -> dict | None:
    try:
        candidate_response = (
            supabase.table("candidates")
            .select(CANDIDATE_DETAIL_FIELDS)
            .eq("id", candidate_id)
            .eq("recruiter_id", recruiter_id)
            .maybe_single()
            .execute()
        )
        candidate = _response_data(candidate_response)
        if not candidate:
            return None

        match_response = (
            supabase.table("match_results")
            .select("job_id,status")
            .eq("candidate_id", candidate_id)
            .execute()
        )
        matches = _response_data(match_response, [])
        job_ids = list(
            dict.fromkeys(
                str(match["job_id"])
                for match in matches
                if match.get("job_id")
            )
        )

        jobs = {}
        if job_ids:
            job_response = (
                supabase.table("job_postings")
                .select("id,title")
                .eq("recruiter_id", recruiter_id)
                .in_("id", job_ids)
                .execute()
            )
            jobs = {
                str(job["id"]): job
                for job in _response_data(job_response, [])
            }
    except Exception as exc:
        raise CandidateViewServiceError(
            "Candidate details could not be loaded."
        ) from exc

    applied_jobs = []
    for match in matches:
        job = jobs.get(str(match.get("job_id")))
        if not job:
            continue
        applied_jobs.append(
            {
                "id": job["id"],
                "title": job.get("title"),
                "status": match.get("status"),
            }
        )

    return {
        **candidate,
        "applied_jobs": applied_jobs,
    }


def get_job_candidates(supabase, recruiter_id: str, job_id: str) -> list[dict]:
    try:
        match_response = (
            supabase.table("match_results")
            .select(MATCH_LIST_FIELDS)
            .eq("job_id", job_id)
            .execute()
        )
        matches = _response_data(match_response, [])
        if not matches:
            return []

        candidate_ids = list(
            dict.fromkeys(
                match["candidate_id"]
                for match in matches
                if match.get("candidate_id")
            )
        )
        if not candidate_ids:
            return []

        candidate_response = (
            supabase.table("candidates")
            .select(PROFILE_FIELDS)
            .eq("recruiter_id", recruiter_id)
            .in_("id", candidate_ids)
            .execute()
        )
        candidates = {
            candidate["id"]: candidate
            for candidate in _response_data(candidate_response, [])
        }
    except Exception as exc:
        raise CandidateViewServiceError(
            "Candidate records could not be loaded."
        ) from exc

    results = []
    for match in matches:
        candidate = candidates.get(match.get("candidate_id"))
        if not candidate:
            continue
        results.append(
            {
                **candidate,
                "match_result_id": match.get("id"),
                "status": match.get("status"),
                "education_score": match.get("education_score"),
                "hard_skill_score": match.get("hard_skill_score"),
                "soft_skill_score": match.get("soft_skill_score"),
                "work_experience_score": match.get("work_experience_score"),
            }
        )
    return results


def get_job_candidate_detail(
    supabase,
    recruiter_id: str,
    job_id: str,
    candidate_id: str,
) -> dict | None:
    try:
        match_response = (
            supabase.table("match_results")
            .select(MATCH_DETAIL_FIELDS)
            .eq("job_id", job_id)
            .eq("candidate_id", candidate_id)
            .maybe_single()
            .execute()
        )
        match = _response_data(match_response)
        if not match:
            return None

        candidate_response = (
            supabase.table("candidates")
            .select(PROFILE_FIELDS)
            .eq("id", candidate_id)
            .eq("recruiter_id", recruiter_id)
            .maybe_single()
            .execute()
        )
        candidate = _response_data(candidate_response)
        if not candidate:
            return None
    except Exception as exc:
        raise CandidateViewServiceError(
            "Candidate details could not be loaded."
        ) from exc

    return {
        **candidate,
        "match_result_id": match.get("id"),
        "status": match.get("status"),
        "education_score": match.get("education_score"),
        "hard_skill_score": match.get("hard_skill_score"),
        "soft_skill_score": match.get("soft_skill_score"),
        "work_experience_score": match.get("work_experience_score"),
        "gap_analysis": match.get("gap_analysis"),
        "matched_skills": match.get("matched_skills"),
        "missing_skills": match.get("missing_skills"),
        "summary": match.get("summary"),
    }
