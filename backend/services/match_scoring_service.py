from models.job_match_analysis import JobMatchAnalysis
from services.analysis_config import MATCH_SCORE_WEIGHTS


SCORE_FIELDS = {
    "hard_skills": "hard_skill_score",
    "work_experience": "work_experience_score",
    "education": "education_score",
    "soft_skills": "soft_skill_score",
}


class MatchScoreError(ValueError):
    """Raised when an overall score cannot be calculated safely."""


def calculate_match_score(analysis: JobMatchAnalysis) -> float:
    weighted_score = 0.0
    applicable_weight = 0.0

    for criterion, weight in MATCH_SCORE_WEIGHTS.items():
        component_score = getattr(analysis, SCORE_FIELDS[criterion])
        if component_score is None:
            continue
        weighted_score += component_score * weight
        applicable_weight += weight

    if applicable_weight == 0:
        raise MatchScoreError("At least one matching criterion must be applicable.")

    return round(weighted_score / applicable_weight, 2)
