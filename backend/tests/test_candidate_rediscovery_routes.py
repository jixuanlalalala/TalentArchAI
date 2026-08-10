import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402


JOB_ID = "9f7e114c-f1f0-4917-b36c-32c970fac38e"
CANDIDATE_ID = "d938f65f-b9e2-4e2f-8ed4-b27774bbdaed"
RECRUITER_ID = "5bbacfba-2cf7-4200-a52c-10900f67f16c"


class CandidateRediscoveryRouteTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        self.supabase = Mock()
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

    def test_get_returns_owned_job_suggestions(self):
        job = {"id": JOB_ID, "recruiter_id": RECRUITER_ID}
        suggestions = [
            {
                "id": CANDIDATE_ID,
                "name": "Candidate",
                "preliminary_relevance": 72,
            }
        ]
        verify, auth_client = self.authenticated_request()
        with (
            verify,
            auth_client,
            patch("routes.job_routes.get_job_by_id", return_value=job),
            patch(
                "routes.job_routes.find_rediscovery_candidates",
                return_value=suggestions,
            ) as find_candidates,
        ):
            response = self.client.get(
                f"/api/jobs/{JOB_ID}/rediscovery-candidates",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"candidates": suggestions})
        find_candidates.assert_called_once_with(
            self.supabase, RECRUITER_ID, job
        )

    def test_post_bulk_links_confirmed_candidates(self):
        job = {"id": JOB_ID, "recruiter_id": RECRUITER_ID}
        linked = [{"id": "match-1", "candidate_id": CANDIDATE_ID}]
        verify, auth_client = self.authenticated_request()
        with (
            verify,
            auth_client,
            patch("routes.job_routes.get_job_by_id", return_value=job),
            patch(
                "routes.job_routes.link_rediscovered_candidates",
                return_value=linked,
            ) as link_candidates,
        ):
            response = self.client.post(
                f"/api/jobs/{JOB_ID}/candidates",
                headers=self.headers,
                json={"candidate_ids": [CANDIDATE_ID]},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["match_results"], linked)
        link_candidates.assert_called_once_with(
            self.supabase,
            RECRUITER_ID,
            JOB_ID,
            [CANDIDATE_ID],
        )

    def test_routes_do_not_reveal_an_unowned_job(self):
        verify, auth_client = self.authenticated_request()
        with (
            verify,
            auth_client,
            patch("routes.job_routes.get_job_by_id", return_value=None),
        ):
            response = self.client.get(
                f"/api/jobs/{JOB_ID}/rediscovery-candidates",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 404)

    def test_post_rejects_invalid_candidate_ids(self):
        verify, auth_client = self.authenticated_request()
        with verify, auth_client:
            response = self.client.post(
                f"/api/jobs/{JOB_ID}/candidates",
                headers=self.headers,
                json={"candidate_ids": ["not-a-uuid"]},
            )

        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
