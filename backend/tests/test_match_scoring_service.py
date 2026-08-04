import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.job_match_analysis import JobMatchAnalysis  # noqa: E402
from services.match_scoring_service import (  # noqa: E402
    MatchScoreError,
    calculate_match_score,
)


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
        self.assertEqual(calculate_match_score(analysis()), 70.0)

    def test_zero_is_applicable_and_not_treated_as_missing(self):
        result = calculate_match_score(
            analysis(
                education_score=None,
                hard_skill_score=100,
                soft_skill_score=0,
                work_experience_score=None,
            )
        )

        self.assertEqual(result, 81.82)

    def test_score_rejects_analysis_with_no_applicable_criteria(self):
        with self.assertRaisesRegex(MatchScoreError, "applicable"):
            calculate_match_score(
                analysis(
                    education_score=None,
                    hard_skill_score=None,
                    soft_skill_score=None,
                    work_experience_score=None,
                )
            )


if __name__ == "__main__":
    unittest.main()
