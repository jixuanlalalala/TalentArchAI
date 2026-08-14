from collections.abc import Mapping
from types import MappingProxyType


MATCH_SCORE_CRITERIA = (
    "hard_skills",
    "work_experience",
    "education",
    "soft_skills",
)

DEFAULT_MATCH_SCORE_WEIGHTS = MappingProxyType(
    {
        "hard_skills": 45,
        "work_experience": 30,
        "education": 15,
        "soft_skills": 10,
    }
)

# Backward-compatible name for callers that use the system defaults.
MATCH_SCORE_WEIGHTS = DEFAULT_MATCH_SCORE_WEIGHTS


def validate_match_score_weights(weights: Mapping) -> dict[str, int]:
    if not isinstance(weights, Mapping):
        raise ValueError("Matching priorities must be an object")
    if set(weights) != set(MATCH_SCORE_CRITERIA):
        raise ValueError("All four matching priorities are required")

    validated = {}
    for criterion in MATCH_SCORE_CRITERIA:
        value = weights[criterion]
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("Matching priorities must be whole numbers")
        if value < 0 or value > 100:
            raise ValueError("Each matching priority must be between 0 and 100")
        validated[criterion] = value

    if sum(validated.values()) != 100:
        raise ValueError("Matching priorities must total exactly 100")
    return validated


validate_match_score_weights(DEFAULT_MATCH_SCORE_WEIGHTS)
