import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.job_service import (  # noqa: E402
    JobValidationError,
    _build_job_payload,
    get_jobs,
)


class FakeQuery:
    def __init__(self, response):
        self.response = response

    def select(self, *_):
        return self

    def eq(self, *_):
        return self

    def in_(self, *_):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def execute(self):
        return self.response


class FakeSupabase:
    def __init__(self, responses):
        self.responses = {
            table_name: list(table_responses)
            for table_name, table_responses in responses.items()
        }

    def table(self, table_name):
        return FakeQuery(self.responses[table_name].pop(0))


class JobServiceTests(unittest.TestCase):
    def valid_job(self, **overrides):
        data = {
            "title": "Software Engineer",
            "description": "Build and maintain software.",
        }
        data.update(overrides)
        return data

    def test_job_description_is_required(self):
        for description in (None, "", "   "):
            with self.subTest(description=description):
                with self.assertRaisesRegex(
                    JobValidationError, "Job description is required"
                ):
                    _build_job_payload(
                        "recruiter-1",
                        {"title": "Software Engineer", "description": description},
                    )

    def test_jobs_include_real_candidate_counts(self):
        supabase = FakeSupabase(
            {
                "job_postings": [
                    SimpleNamespace(
                        data=[
                            {"id": "job-1", "title": "First"},
                            {"id": "job-2", "title": "Second"},
                        ]
                    )
                ],
                "match_results": [
                    SimpleNamespace(
                        data=[
                            {"job_id": "job-1"},
                            {"job_id": "job-1"},
                            {"job_id": "job-2"},
                        ]
                    )
                ],
            }
        )

        jobs = get_jobs(supabase, "recruiter-1")

        self.assertEqual(jobs[0]["candidate_count"], 2)
        self.assertEqual(jobs[1]["candidate_count"], 1)

    def test_jobs_without_matches_have_zero_candidates(self):
        supabase = FakeSupabase(
            {
                "job_postings": [
                    SimpleNamespace(data=[{"id": "job-1", "title": "First"}])
                ],
                "match_results": [SimpleNamespace(data=[])],
            }
        )

        jobs = get_jobs(supabase, "recruiter-1")

        self.assertEqual(jobs[0]["candidate_count"], 0)

    def test_omitted_matching_priorities_use_defaults(self):
        payload = _build_job_payload("recruiter-1", self.valid_job())

        self.assertEqual(payload["hard_skill_weight"], 45)
        self.assertEqual(payload["work_experience_weight"], 30)
        self.assertEqual(payload["education_weight"], 15)
        self.assertEqual(payload["soft_skill_weight"], 10)

    def test_custom_matching_priorities_are_mapped_to_database_columns(self):
        payload = _build_job_payload(
            "recruiter-1",
            self.valid_job(
                matchingPriorities={
                    "hardSkills": 60,
                    "workExperience": 20,
                    "education": 0,
                    "softSkills": 20,
                }
            ),
        )

        self.assertEqual(payload["hard_skill_weight"], 60)
        self.assertEqual(payload["work_experience_weight"], 20)
        self.assertEqual(payload["education_weight"], 0)
        self.assertEqual(payload["soft_skill_weight"], 20)

    def test_incomplete_matching_priorities_are_rejected(self):
        with self.assertRaisesRegex(JobValidationError, "four"):
            _build_job_payload(
                "recruiter-1",
                self.valid_job(matchingPriorities={"hardSkills": 100}),
            )

    def test_matching_priority_total_must_equal_one_hundred(self):
        with self.assertRaisesRegex(JobValidationError, "total exactly 100"):
            _build_job_payload(
                "recruiter-1",
                self.valid_job(
                    matchingPriorities={
                        "hardSkills": 40,
                        "workExperience": 20,
                        "education": 10,
                        "softSkills": 10,
                    }
                ),
            )

    def test_invalid_matching_priority_values_are_rejected(self):
        invalid_values = (-1, 101, 12.5, "45", True)
        for invalid_value in invalid_values:
            with self.subTest(value=invalid_value):
                priorities = {
                    "hardSkills": invalid_value,
                    "workExperience": 30,
                    "education": 15,
                    "softSkills": 10,
                }
                with self.assertRaises(JobValidationError):
                    _build_job_payload(
                        "recruiter-1",
                        self.valid_job(matchingPriorities=priorities),
                    )


if __name__ == "__main__":
    unittest.main()
