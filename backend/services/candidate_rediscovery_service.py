"""Deterministic, non-AI candidate rediscovery for newly created jobs."""

from dataclasses import dataclass
import re
import unicodedata

from services.candidate_rediscovery_config import (
    JOB_CONTEXT_COVERAGE_WEIGHT,
    MAXIMUM_SUGGESTIONS,
    MINIMUM_PRELIMINARY_RELEVANCE,
    REQUIRED_SKILL_COVERAGE_WEIGHT,
)


_SKILL_ALIASES = {
    "js": "javascript",
    "node.js": "nodejs",
    "node": "nodejs",
    "postgres": "postgresql",
    "csharp": "c#",
    "cplusplus": "c++",
    "dotnet": ".net",
}

_CONTEXT_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "in", "is", "it", "job", "of", "on", "or", "our", "that", "the",
    "their", "this", "to", "with", "will", "you", "your",
}


@dataclass(frozen=True)
class PreliminaryRelevance:
    required_skill_coverage: float
    context_coverage: float
    preliminary_relevance: int


class CandidateRediscoveryError(RuntimeError):
    """A safe, user-facing rediscovery persistence error."""


class CandidateRediscoveryConflictError(RuntimeError):
    """A requested candidate-job relationship already exists."""


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _normal_text(value):
    return unicodedata.normalize("NFKC", str(value or "")).casefold().strip()


def _normalize_skill(value):
    normalized = _normal_text(value)
    compact = re.sub(r"\s+", "", normalized)
    alias_key = re.sub(r"[^a-z0-9+#.]", "", compact)
    return _SKILL_ALIASES.get(alias_key, alias_key)


def _context_terms(values):
    text = " ".join(_normal_text(value) for value in _as_list(values))
    replacements = {
        "c++": "cplusplus",
        "c#": "csharp",
        ".net": "dotnet",
        "node.js": "nodejs",
    }
    for source, replacement in replacements.items():
        text = text.replace(source, replacement)
    return {
        token
        for token in re.findall(r"[a-z0-9]+", text)
        if len(token) >= 3 and token not in _CONTEXT_STOP_WORDS
    }


def _coverage(matched, required):
    if not required:
        return 0.0
    return round((len(matched & required) / len(required)) * 100, 2)


def calculate_preliminary_relevance(job, candidate):
    """Calculate rediscovery-only component values without calling an AI model."""
    required_skills = {
        normalized
        for skill in _as_list(job.get("required_skills"))
        if (normalized := _normalize_skill(skill))
    }
    candidate_skills = {
        normalized
        for skill in _as_list(candidate.get("hard_skills"))
        if (normalized := _normalize_skill(skill))
    }
    required_skill_coverage = _coverage(candidate_skills, required_skills)

    job_context = _context_terms([
        job.get("title", ""),
        job.get("description", ""),
    ])
    job_context -= _context_terms(job.get("required_skills"))
    candidate_context = _context_terms(
        _as_list(candidate.get("education"))
        + _as_list(candidate.get("hard_skills"))
        + _as_list(candidate.get("soft_skills"))
        + _as_list(candidate.get("work_experience"))
    )
    context_coverage = _coverage(candidate_context, job_context)

    if required_skills:
        weighted_score = (
            required_skill_coverage * REQUIRED_SKILL_COVERAGE_WEIGHT
            + context_coverage * JOB_CONTEXT_COVERAGE_WEIGHT
        )
    else:
        weighted_score = context_coverage

    preliminary_relevance = max(0, min(100, int(weighted_score + 0.5)))
    return PreliminaryRelevance(
        required_skill_coverage=required_skill_coverage,
        context_coverage=context_coverage,
        preliminary_relevance=preliminary_relevance,
    )


def _response_rows(response):
    return getattr(response, "data", None) or []


def find_rediscovery_candidates(supabase, recruiter_id, job):
    """Return the best unlinked candidates without storing the heuristic score."""
    try:
        candidate_response = (
            supabase.table("candidates")
            .select(
                "id,name,education,hard_skills,soft_skills,work_experience"
            )
            .eq("recruiter_id", recruiter_id)
            .execute()
        )
        candidates = _response_rows(candidate_response)
        if not candidates:
            return []

        candidate_ids = [candidate["id"] for candidate in candidates]
        linked_response = (
            supabase.table("match_results")
            .select("candidate_id")
            .eq("job_id", str(job["id"]))
            .in_("candidate_id", candidate_ids)
            .execute()
        )
    except Exception as exc:
        raise CandidateRediscoveryError(
            "Existing candidates could not be searched."
        ) from exc

    linked_ids = {
        str(row.get("candidate_id"))
        for row in _response_rows(linked_response)
        if row.get("candidate_id")
    }
    suggestions = []
    for candidate in candidates:
        candidate_id = str(candidate.get("id"))
        if candidate_id in linked_ids:
            continue

        score = calculate_preliminary_relevance(job, candidate)
        is_eligible = (
            score.preliminary_relevance >= MINIMUM_PRELIMINARY_RELEVANCE
        )
        print(
            "[candidate-rediscovery] "
            f"job={job['id']} candidate={candidate_id} "
            f"required_skill_coverage={score.required_skill_coverage:.2f} "
            f"context_coverage={score.context_coverage:.2f} "
            f"preliminary_relevance={score.preliminary_relevance} "
            f"eligible={str(is_eligible).lower()}"
        )
        if is_eligible:
            suggestions.append(
                {
                    "id": candidate["id"],
                    "name": candidate.get("name"),
                    "preliminary_relevance": score.preliminary_relevance,
                }
            )

    suggestions.sort(
        key=lambda item: (
            -item["preliminary_relevance"],
            _normal_text(item.get("name")),
            str(item["id"]),
        )
    )
    return suggestions[:MAXIMUM_SUGGESTIONS]


def link_rediscovered_candidates(
    supabase,
    recruiter_id,
    job_id,
    candidate_ids,
):
    """Bulk-create durable pending analysis tasks for confirmed suggestions."""
    try:
        candidate_response = (
            supabase.table("candidates")
            .select("id")
            .eq("recruiter_id", recruiter_id)
            .in_("id", candidate_ids)
            .execute()
        )
        owned_ids = {
            str(row.get("id"))
            for row in _response_rows(candidate_response)
            if row.get("id")
        }
        if owned_ids != set(candidate_ids):
            raise CandidateRediscoveryError(
                "One or more selected candidates could not be found."
            )

        existing_response = (
            supabase.table("match_results")
            .select("candidate_id")
            .eq("job_id", job_id)
            .in_("candidate_id", candidate_ids)
            .execute()
        )
        if _response_rows(existing_response):
            raise CandidateRediscoveryConflictError(
                "One or more candidates are already linked to this job."
            )

        payloads = [
            {
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
            for candidate_id in candidate_ids
        ]
        insert_response = (
            supabase.table("match_results").insert(payloads).execute()
        )
    except (CandidateRediscoveryError, CandidateRediscoveryConflictError):
        raise
    except Exception as exc:
        raise CandidateRediscoveryError(
            "The selected candidates could not be added to the job."
        ) from exc

    rows = _response_rows(insert_response)
    if len(rows) != len(candidate_ids):
        raise CandidateRediscoveryError(
            "The selected candidates could not be added to the job."
        )
    return rows
