import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402


JOB_ID = "9f7e114c-f1f0-4917-b36c-32c970fac38e"
CANDIDATE_ID = "d938f65f-b9e2-4e2f-8ed4-b27774bbdaed"
MATCH_ID = "4142503a-f3ac-43ef-9669-67f38982462c"
RECRUITER_ID = "5bbacfba-2cf7-4200-a52c-10900f67f16c"


class FakeQuery:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.filters = []
        self.action = "select"
        self.payload = None
        self.single = False

    def select(self, *_):
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def delete(self):
        self.action = "delete"
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def maybe_single(self):
        self.single = True
        return self

    def execute(self):
        rows = self.database[self.table_name]
        matching = [
            row
            for row in rows
            if all(str(row.get(field)) == str(value) for field, value in self.filters)
        ]

        if self.action == "update":
            for row in matching:
                row.update(self.payload)
        elif self.action == "delete":
            self.database[self.table_name] = [
                row for row in rows if row not in matching
            ]

        data = matching[0] if self.single and matching else (None if self.single else matching)
        return SimpleNamespace(data=data)


class FakeSupabase:
    def __init__(self):
        self.database = {
            "job_postings": [
                {
                    "id": JOB_ID,
                    "recruiter_id": RECRUITER_ID,
                    "title": "Software Engineer",
                }
            ],
            "candidates": [
                {
                    "id": CANDIDATE_ID,
                    "recruiter_id": RECRUITER_ID,
                    "name": "Candidate",
                }
            ],
            "match_results": [
                {
                    "id": MATCH_ID,
                    "job_id": JOB_ID,
                    "candidate_id": CANDIDATE_ID,
                    "status": "completed",
                    "recruitment_status": "new",
                    "match_score": 82,
                    "education_score": 80,
                    "hard_skill_score": 90,
                    "soft_skill_score": 70,
                    "work_experience_score": 75,
                    "gap_analysis": "Some gaps.",
                    "matched_skills": ["Python"],
                    "missing_skills": ["Docker"],
                    "summary": "Good fit.",
                    "processing_started_at": None,
                    "analysis_error": None,
                }
            ],
        }

    def table(self, table_name):
        return FakeQuery(self.database, table_name)


class CandidateActionRouteTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        self.supabase = FakeSupabase()
        self.headers = {"Authorization": "Bearer test-token"}

    def authenticated_request(self):
        return (
            patch(
                "utils.decorators._verify_token",
                return_value={"sub": RECRUITER_ID},
            ),
            patch(
                "utils.decorators.create_authenticated_client",
                return_value=self.supabase,
            ),
        )

    def test_recruiter_can_change_recruitment_status(self):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.patch(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}/recruitment-status",
                headers=self.headers,
                json={"recruitment_status": "shortlisted"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()["match_result"]["recruitment_status"],
            "shortlisted",
        )
        self.assertEqual(
            self.supabase.database["match_results"][0]["recruitment_status"],
            "shortlisted",
        )

    def test_invalid_recruitment_status_is_rejected(self):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.patch(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}/recruitment-status",
                headers=self.headers,
                json={"recruitment_status": "hired"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            self.supabase.database["match_results"][0]["recruitment_status"],
            "new",
        )

    def test_failed_analysis_can_be_retried_without_changing_recruitment_status(self):
        match_result = self.supabase.database["match_results"][0]
        match_result["status"] = "failed"
        match_result["recruitment_status"] = "under_review"
        match_result["analysis_error"] = "Analysis timed out."

        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.post(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}/retry-analysis",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        updated = response.get_json()["match_result"]
        self.assertEqual(updated["status"], "pending")
        self.assertEqual(updated["recruitment_status"], "under_review")
        for field in (
            "match_score",
            "education_score",
            "hard_skill_score",
            "soft_skill_score",
            "work_experience_score",
            "gap_analysis",
            "matched_skills",
            "missing_skills",
            "summary",
            "processing_started_at",
            "analysis_error",
        ):
            self.assertIsNone(updated[field])

    def test_completed_analysis_cannot_be_retried(self):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.post(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}/retry-analysis",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            self.supabase.database["match_results"][0]["status"],
            "completed",
        )

    def test_unlink_removes_only_the_job_relationship(self):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.delete(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.supabase.database["match_results"], [])
        self.assertEqual(len(self.supabase.database["candidates"]), 1)
        self.assertEqual(
            self.supabase.database["candidates"][0]["id"],
            CANDIDATE_ID,
        )

    def test_other_recruiter_cannot_modify_candidate_relationship(self):
        self.supabase.database["job_postings"][0]["recruiter_id"] = "other-user"

        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.delete(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(len(self.supabase.database["match_results"]), 1)

    def test_actions_require_authentication(self):
        response = self.client.delete(
            f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}"
        )

        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
