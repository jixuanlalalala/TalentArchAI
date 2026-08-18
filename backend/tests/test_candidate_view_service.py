import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.candidate_view_service import (  # noqa: E402
    get_job_candidate_detail,
    get_job_candidates,
    get_recruiter_candidate_detail,
    get_recruiter_candidates,
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

    def maybe_single(self):
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
        response = self.responses[table_name].pop(0)
        return FakeQuery(response)


class CandidateViewServiceTests(unittest.TestCase):
    def test_recruiter_list_uses_candidate_table_fields(self):
        supabase = FakeSupabase(
            {
                "candidates": [
                    SimpleNamespace(
                        data=[
                            {
                                "id": "candidate-1",
                                "name": "Candidate",
                                "created_at": "2026-08-01T00:00:00Z",
                                "extraction_status": "completed",
                            }
                        ]
                    )
                ]
            }
        )

        candidates = get_recruiter_candidates(supabase, "recruiter-1")

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["extraction_status"], "completed")

    def test_recruiter_detail_includes_applied_jobs(self):
        supabase = FakeSupabase(
            {
                "candidates": [
                    SimpleNamespace(
                        data={
                            "id": "candidate-1",
                            "name": "Candidate",
                            "education": ["BSc"],
                            "hard_skills": ["Python"],
                            "soft_skills": [],
                            "work_experience": [],
                        }
                    )
                ],
                "match_results": [
                    SimpleNamespace(
                        data=[{"job_id": "job-1", "status": "pending"}]
                    )
                ],
                "job_postings": [
                    SimpleNamespace(
                        data=[{"id": "job-1", "title": "Engineer"}]
                    )
                ],
            }
        )

        detail = get_recruiter_candidate_detail(
            supabase,
            "recruiter-1",
            "candidate-1",
        )

        self.assertEqual(detail["hard_skills"], ["Python"])
        self.assertEqual(detail["applied_jobs"][0]["title"], "Engineer")
        self.assertEqual(detail["applied_jobs"][0]["status"], "pending")

    def test_recruiter_detail_does_not_expose_another_candidate(self):
        supabase = FakeSupabase({"candidates": [None]})

        detail = get_recruiter_candidate_detail(
            supabase,
            "recruiter-1",
            "candidate-1",
        )

        self.assertIsNone(detail)

    def test_list_combines_candidate_profile_and_pending_match(self):
        supabase = FakeSupabase(
            {
                "match_results": [
                    SimpleNamespace(
                        data=[
                            {
                                "id": "match-1",
                                "candidate_id": "candidate-1",
                                "status": "pending",
                                "recruitment_status": "under_review",
                                "match_score": None,
                                "created_at": "2026-08-04T10:00:00Z",
                                "education_score": None,
                                "hard_skill_score": None,
                                "soft_skill_score": None,
                                "work_experience_score": None,
                            }
                        ]
                    )
                ],
                "candidates": [
                    SimpleNamespace(
                        data=[
                            {
                                "id": "candidate-1",
                                "name": "Candidate",
                                "email": "candidate@example.com",
                                "phone": None,
                                "location": None,
                            }
                        ]
                    )
                ],
            }
        )

        candidates = get_job_candidates(supabase, "recruiter-1", "job-1")

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["status"], "pending")
        self.assertEqual(candidates[0]["recruitment_status"], "under_review")
        self.assertIsNone(candidates[0]["match_score"])
        self.assertEqual(
            candidates[0]["match_result_created_at"],
            "2026-08-04T10:00:00Z",
        )
        self.assertIsNone(candidates[0]["education_score"])

    def test_list_omits_candidate_not_returned_for_recruiter(self):
        supabase = FakeSupabase(
            {
                "match_results": [
                    SimpleNamespace(
                        data=[
                            {
                                "id": "match-1",
                                "candidate_id": "other-candidate",
                                "status": "pending",
                            }
                        ]
                    )
                ],
                "candidates": [SimpleNamespace(data=[])],
            }
        )

        self.assertEqual(
            get_job_candidates(supabase, "recruiter-1", "job-1"),
            [],
        )

    def test_detail_returns_none_when_relationship_does_not_exist(self):
        supabase = FakeSupabase({"match_results": [None]})

        detail = get_job_candidate_detail(
            supabase,
            "recruiter-1",
            "job-1",
            "candidate-1",
        )

        self.assertIsNone(detail)

    def test_detail_returns_nullable_analysis_fields(self):
        supabase = FakeSupabase(
            {
                "match_results": [
                    SimpleNamespace(
                        data={
                            "id": "match-1",
                            "status": "pending",
                            "recruitment_status": "new",
                            "match_score": None,
                            "education_score": None,
                            "hard_skill_score": None,
                            "soft_skill_score": None,
                            "work_experience_score": None,
                            "gap_analysis": None,
                            "matched_skills": None,
                            "missing_skills": None,
                            "summary": None,
                            "analysis_error": None,
                        }
                    )
                ],
                "candidates": [
                    SimpleNamespace(
                        data={
                            "id": "candidate-1",
                            "name": "Candidate",
                            "email": "candidate@example.com",
                            "phone": None,
                            "location": None,
                        }
                    )
                ],
            }
        )

        detail = get_job_candidate_detail(
            supabase,
            "recruiter-1",
            "job-1",
            "candidate-1",
        )

        self.assertEqual(detail["match_result_id"], "match-1")
        self.assertEqual(detail["status"], "pending")
        self.assertEqual(detail["recruitment_status"], "new")
        self.assertIsNone(detail["match_score"])
        self.assertIsNone(detail["analysis_error"])
        self.assertIsNone(detail["summary"])


if __name__ == "__main__":
    unittest.main()
