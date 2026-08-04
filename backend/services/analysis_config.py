from types import MappingProxyType


MATCH_SCORE_WEIGHTS = MappingProxyType(
    {
        "hard_skills": 0.45,
        "work_experience": 0.30,
        "education": 0.15,
        "soft_skills": 0.10,
    }
)


if not abs(sum(MATCH_SCORE_WEIGHTS.values()) - 1.0) < 1e-9:
    raise RuntimeError("Match-score weights must total 1.0")
