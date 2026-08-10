"""System-level configuration for deterministic candidate rediscovery."""

REQUIRED_SKILL_COVERAGE_WEIGHT = 0.75
JOB_CONTEXT_COVERAGE_WEIGHT = 0.25
MINIMUM_PRELIMINARY_RELEVANCE = 20
MAXIMUM_SUGGESTIONS = 5


if REQUIRED_SKILL_COVERAGE_WEIGHT + JOB_CONTEXT_COVERAGE_WEIGHT != 1:
    raise RuntimeError("Preliminary rediscovery weights must total 1.0.")

