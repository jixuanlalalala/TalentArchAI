import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.job_match_analysis import JobMatchAnalysis  # noqa: E402
from services.match_scoring_service import (  # noqa: E402
    MatchScoreError,
    calculate_match_score,
)


DEFAULT_WEIGHTS = {
    "hard_skills": 45,
    "work_experience": 30,
    "education": 15,
    "soft_skills": 10,
}


def analysis(**overrides):
    values = {
        "education_score": 60,
        "hard_skill_score": 80,
        "soft_skill_score": 40,
        "work_experience_score": None,
        "matched_skills": ["Python"],
        "missing_skills": ["Docker"],
        "summary": "The candidate meets several core requirements.",
        "gap_analysis": "More production deployment experience is needed.",
    }
    values.update(overrides)
    return JobMatchAnalysis(**values)


class MatchScoringServiceTests(unittest.TestCase):
    def test_score_normalizes_weights_over_applicable_criteria(self):
        self.assertEqual(calculate_match_score(analysis(), DEFAULT_WEIGHTS), 70.0)

    def test_custom_job_weights_are_used(self):
        result = calculate_match_score(
            analysis(work_experience_score=100),
            {
                "hard_skills": 10,
                "work_experience": 70,
                "education": 10,
                "soft_skills": 10,
            },
        )

        self.assertEqual(result, 88.0)

    def test_zero_is_applicable_and_not_treated_as_missing(self):
        result = calculate_match_score(
            analysis(
                education_score=None,
                hard_skill_score=100,
                soft_skill_score=0,
                work_experience_score=None,
            ),
            DEFAULT_WEIGHTS,
        )

        self.assertEqual(result, 81.82)

    def test_no_applicable_positive_weight_returns_null_score(self):
        result = calculate_match_score(
            analysis(
                education_score=None,
                hard_skill_score=100,
                soft_skill_score=None,
                work_experience_score=None,
            ),
            {
                "hard_skills": 0,
                "work_experience": 70,
                "education": 20,
                "soft_skills": 10,
            },
        )

        self.assertIsNone(result)

    def test_zero_configured_weight_is_excluded(self):
        result = calculate_match_score(
            analysis(
                hard_skill_score=0,
                work_experience_score=80,
                education_score=None,
                soft_skill_score=None,
            ),
            {
                "hard_skills": 0,
                "work_experience": 100,
                "education": 0,
                "soft_skills": 0,
            },
        )

        self.assertEqual(result, 80.0)

    def test_score_rounds_to_two_decimal_places(self):
        result = calculate_match_score(
            analysis(
                hard_skill_score=83,
                work_experience_score=72,
                education_score=None,
                soft_skill_score=None,
            ),
            DEFAULT_WEIGHTS,
        )

        self.assertEqual(result, 78.6)

    def test_invalid_weight_configuration_is_rejected(self):
        with self.assertRaisesRegex(MatchScoreError, "total"):
            calculate_match_score(
                analysis(),
                {
                    "hard_skills": 40,
                    "work_experience": 30,
                    "education": 15,
                    "soft_skills": 10,
                },
            )


if __name__ == "__main__":
    unittest.main()
