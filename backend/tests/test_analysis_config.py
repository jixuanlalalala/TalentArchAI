import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.analysis_config import MATCH_SCORE_WEIGHTS  # noqa: E402


class AnalysisConfigTests(unittest.TestCase):
    def test_default_match_score_weights_match_the_approved_configuration(self):
        self.assertEqual(
            MATCH_SCORE_WEIGHTS,
            {
                "hard_skills": 0.45,
                "work_experience": 0.30,
                "education": 0.15,
                "soft_skills": 0.10,
            },
        )
        self.assertAlmostEqual(sum(MATCH_SCORE_WEIGHTS.values()), 1.0)


if __name__ == "__main__":
    unittest.main()
