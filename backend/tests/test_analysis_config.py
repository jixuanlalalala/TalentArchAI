import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.analysis_config import (  # noqa: E402
    DEFAULT_MATCH_SCORE_WEIGHTS,
    validate_match_score_weights,
)


class AnalysisConfigTests(unittest.TestCase):
    def test_default_match_score_weights_match_the_approved_configuration(self):
        self.assertEqual(
            DEFAULT_MATCH_SCORE_WEIGHTS,
            {
                "hard_skills": 45,
                "work_experience": 30,
                "education": 15,
                "soft_skills": 10,
            },
        )
        self.assertEqual(sum(DEFAULT_MATCH_SCORE_WEIGHTS.values()), 100)

    def test_weight_validation_rejects_incomplete_configuration(self):
        with self.assertRaisesRegex(ValueError, "four"):
            validate_match_score_weights({"hard_skills": 100})

    def test_weight_validation_rejects_boolean_and_fractional_values(self):
        for invalid_value in (True, 12.5, "25"):
            with self.subTest(value=invalid_value):
                with self.assertRaisesRegex(ValueError, "whole numbers"):
                    validate_match_score_weights(
                        {
                            "hard_skills": invalid_value,
                            "work_experience": 30,
                            "education": 15,
                            "soft_skills": 10,
                        }
                    )


if __name__ == "__main__":
    unittest.main()
