import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.job_match_analysis import (  # noqa: E402
    CandidateMatchProfile,
    JobMatchContext,
)
from services.job_analysis_service import (  # noqa: E402
    JobAnalysisError,
    analyze_candidate_for_job,
)


def valid_analysis_payload():
    return {
        "education_score": 75,
        "hard_skill_score": 90,
        "soft_skill_score": None,
        "work_experience_score": 60,
        "matched_skills": ["Python"],
        "missing_skills": ["Docker"],
        "summary": "Strong technical alignment with some experience gaps.",
        "gap_analysis": "The candidate lacks the requested Docker experience.",
    }


def response_with_content(content, status=200):
    return httpx.Response(
        status,
        json={"choices": [{"message": {"content": content}}]},
    )


class JobAnalysisServiceTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(
            os.environ,
            {
                "OPENROUTER_API_KEY": "test-key",
                "OPENROUTER_MODEL": "fallback-model",
                "OPENROUTER_ANALYSIS_MODEL": "analysis-model",
                "OPENROUTER_ANALYSIS_TIMEOUT_SECONDS": "60",
            },
        )
        self.environment.start()
        self.candidate = CandidateMatchProfile(
            education=["BSc Computer Science"],
            hard_skills=["Python"],
            soft_skills=["Communication"],
            work_experience=["Software Intern"],
        )
        self.job = JobMatchContext(
            title="Backend Engineer",
            description="Build and maintain Python services.",
            required_skills=["Python", "Docker"],
            job_type="full-time",
        )

    def tearDown(self):
        self.environment.stop()

    def test_candidate_profile_rejects_identity_and_raw_resume_fields(self):
        with self.assertRaises(ValidationError):
            CandidateMatchProfile(
                education=[],
                hard_skills=[],
                soft_skills=[],
                work_experience=[],
                name="Private Name",
                raw_text="Private resume text",
            )

    def test_request_contains_only_approved_candidate_and_job_fields(self):
        def inspect_request(request):
            payload = json.loads(request.content)
            self.assertEqual(payload["model"], "analysis-model")
            serialized_messages = json.dumps(payload["messages"])
            for approved_value in (
                "BSc Computer Science",
                "Python",
                "Communication",
                "Software Intern",
                "Backend Engineer",
                "Build and maintain Python services.",
                "full-time",
            ):
                self.assertIn(approved_value, serialized_messages)
            for forbidden_key in (
                '"name"',
                '"email"',
                '"phone"',
                '"location"',
                '"candidate_id"',
                '"recruiter_id"',
                '"resume_file_url"',
                '"raw_text"',
            ):
                self.assertNotIn(forbidden_key, serialized_messages)
            return response_with_content(json.dumps(valid_analysis_payload()))

        with httpx.Client(transport=httpx.MockTransport(inspect_request)) as client:
            result = analyze_candidate_for_job(
                self.candidate,
                self.job,
                client=client,
            )

        self.assertEqual(result.hard_skill_score, 90)
        self.assertIsNone(result.soft_skill_score)

    def test_invalid_analysis_shape_is_rejected(self):
        payload = valid_analysis_payload()
        payload["hard_skill_score"] = 101

        with httpx.Client(
            transport=httpx.MockTransport(
                lambda _: response_with_content(json.dumps(payload))
            )
        ) as client:
            with self.assertRaisesRegex(JobAnalysisError, "invalid format"):
                analyze_candidate_for_job(self.candidate, self.job, client=client)

    def test_timeout_must_be_shorter_than_stale_task_threshold(self):
        with patch.dict(
            os.environ,
            {"OPENROUTER_ANALYSIS_TIMEOUT_SECONDS": "180"},
        ):
            with self.assertRaisesRegex(JobAnalysisError, "less than 180"):
                analyze_candidate_for_job(self.candidate, self.job)


if __name__ == "__main__":
    unittest.main()
