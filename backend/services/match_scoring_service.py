from models.job_match_analysis import JobMatchAnalysis
from services.analysis_config import validate_match_score_weights


SCORE_FIELDS = {
    "hard_skills": "hard_skill_score",
    "work_experience": "work_experience_score",
    "education": "education_score",
    "soft_skills": "soft_skill_score",
}


class MatchScoreError(ValueError):
    """Raised when an overall score cannot be calculated safely."""


def calculate_match_score(
    analysis: JobMatchAnalysis,
    weights,
) -> float | None:
    try:
        validated_weights = validate_match_score_weights(weights)
    except ValueError as exc:
        raise MatchScoreError(str(exc)) from exc
    weighted_score = 0.0
    applicable_weight = 0.0

    for criterion, weight in validated_weights.items():
        if weight == 0:
            continue
        component_score = getattr(analysis, SCORE_FIELDS[criterion])
        if component_score is None:
            continue
        weighted_score += component_score * weight
        applicable_weight += weight

    if applicable_weight == 0:
        return None

    return round(weighted_score / applicable_weight, 2)
