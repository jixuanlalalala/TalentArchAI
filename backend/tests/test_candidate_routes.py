import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402

JOB_ID = "9f7e114c-f1f0-4917-b36c-32c970fac38e"
CANDIDATE_ID = "d938f65f-b9e2-4e2f-8ed4-b27774bbdaed"


class CandidateRouteTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        self.headers = {"Authorization": "Bearer test-token"}

    def auth_patches(self):
        return (
            patch("utils.decorators._verify_token", return_value={"sub": "recruiter-1"}),
            patch(
                "utils.decorators.create_authenticated_client",
                return_value=object(),
            ),
        )

    def test_list_requires_authentication(self):
        response = self.client.get(f"/api/jobs/{JOB_ID}/candidates")
        self.assertEqual(response.status_code, 401)

    def test_recruiter_list_requires_authentication(self):
        response = self.client.get("/api/candidates")
        self.assertEqual(response.status_code, 401)

    @patch(
        "routes.candidate_routes.get_recruiter_candidates",
        return_value=[{"id": CANDIDATE_ID, "extraction_status": "completed"}],
    )
    def test_recruiter_list_returns_all_owned_candidates(self, _get_candidates):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                "/api/candidates",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        candidate = response.get_json()["candidates"][0]
        self.assertEqual(candidate["extraction_status"], "completed")

    @patch(
        "routes.candidate_routes.get_recruiter_candidate_detail",
        return_value={
            "id": CANDIDATE_ID,
            "education": [],
            "applied_jobs": [{"id": JOB_ID, "title": "Engineer"}],
        },
    )
    def test_recruiter_detail_returns_owned_candidate(self, _get_candidate):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                f"/api/candidates/{CANDIDATE_ID}",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()["candidate"]["applied_jobs"][0]["title"],
            "Engineer",
        )

    @patch(
        "routes.candidate_routes.get_recruiter_candidate_detail",
        return_value=None,
    )
    def test_recruiter_detail_hides_unowned_candidate(self, _get_candidate):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                f"/api/candidates/{CANDIDATE_ID}",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 404)

    def test_invalid_candidate_id_is_rejected(self):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                f"/api/jobs/{JOB_ID}/candidates/not-a-uuid",
                headers=self.headers,
            )
        self.assertEqual(response.status_code, 400)

    @patch("routes.candidate_routes.get_job_by_id", return_value=None)
    def test_other_recruiters_job_is_not_exposed(self, _get_job):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                f"/api/jobs/{JOB_ID}/candidates",
                headers=self.headers,
            )
        self.assertEqual(response.status_code, 404)

    @patch(
        "routes.candidate_routes.get_job_candidates",
        return_value=[{"id": CANDIDATE_ID, "status": "pending"}],
    )
    @patch("routes.candidate_routes.get_job_by_id", return_value={"id": JOB_ID})
    def test_list_returns_owned_job_candidates(self, _get_job, _get_candidates):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                f"/api/jobs/{JOB_ID}/candidates",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["candidates"][0]["status"], "pending")

    @patch(
        "routes.candidate_routes.get_job_candidate_detail",
        return_value=None,
    )
    @patch("routes.candidate_routes.get_job_by_id", return_value={"id": JOB_ID})
    def test_unlinked_candidate_returns_not_found(self, _get_job, _get_candidate):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}",
                headers=self.headers,
            )
        self.assertEqual(response.status_code, 404)

    @patch(
        "routes.candidate_routes.get_job_candidate_detail",
        return_value={
            "id": CANDIDATE_ID,
            "status": "pending",
            "education_score": None,
            "summary": None,
        },
    )
    @patch("routes.candidate_routes.get_job_by_id", return_value={"id": JOB_ID})
    def test_detail_returns_owned_linked_candidate(
        self,
        _get_job,
        _get_candidate,
    ):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.get(
                f"/api/jobs/{JOB_ID}/candidates/{CANDIDATE_ID}",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        candidate = response.get_json()["candidate"]
        self.assertEqual(candidate["status"], "pending")
        self.assertIsNone(candidate["education_score"])


if __name__ == "__main__":
    unittest.main()
