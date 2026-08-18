import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402
from services.candidate_management_service import (  # noqa: E402
    CandidateResumeReference,
)
from services.resume_storage_service import ResumeUnavailableError  # noqa: E402


CANDIDATE_ID = "d938f65f-b9e2-4e2f-8ed4-b27774bbdaed"
RECRUITER_ID = "5bbacfba-2cf7-4200-a52c-10900f67f16c"


class CandidateManagementRouteTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        self.headers = {"Authorization": "Bearer test-token"}
        self.service_client = object()

    def authenticated_request(self):
        return (
            patch(
                "utils.decorators._verify_token",
                return_value={"sub": RECRUITER_ID},
            ),
            patch(
                "utils.decorators.create_authenticated_client",
                return_value=object(),
            ),
        )

    def test_candidate_management_requires_authentication(self):
        delete_response = self.client.delete(f"/api/candidates/{CANDIDATE_ID}")
        resume_response = self.client.get(
            f"/api/candidates/{CANDIDATE_ID}/resume-url"
        )

        self.assertEqual(delete_response.status_code, 401)
        self.assertEqual(resume_response.status_code, 401)

    def test_malformed_candidate_id_is_rejected(self):
        verify, client = self.authenticated_request()
        with verify, client:
            delete_response = self.client.delete(
                "/api/candidates/not-a-uuid", headers=self.headers
            )
            resume_response = self.client.get(
                "/api/candidates/not-a-uuid/resume-url", headers=self.headers
            )

        self.assertEqual(delete_response.status_code, 400)
        self.assertEqual(resume_response.status_code, 400)

    @patch("routes.candidate_routes.delete_resume", return_value=True)
    @patch("routes.candidate_routes.delete_owned_candidate")
    @patch("routes.candidate_routes.create_service_client")
    def test_delete_removes_owned_candidate_then_cleans_storage(
        self,
        create_client,
        delete_candidate,
        delete_storage,
    ):
        create_client.return_value = self.service_client
        delete_candidate.return_value = CandidateResumeReference(
            CANDIDATE_ID,
            f"{RECRUITER_ID}/job-1/resume.pdf",
        )
        verify, client = self.authenticated_request()

        with verify, client:
            response = self.client.delete(
                f"/api/candidates/{CANDIDATE_ID}", headers=self.headers
            )

        self.assertEqual(response.status_code, 200)
        delete_candidate.assert_called_once_with(
            self.service_client, RECRUITER_ID, CANDIDATE_ID
        )
        delete_storage.assert_called_once_with(
            self.service_client,
            f"{RECRUITER_ID}/job-1/resume.pdf",
        )

    @patch("routes.candidate_routes.delete_resume", return_value=False)
    @patch("routes.candidate_routes.delete_owned_candidate")
    @patch("routes.candidate_routes.create_service_client")
    def test_storage_cleanup_failure_does_not_reverse_database_deletion(
        self,
        create_client,
        delete_candidate,
        _delete_storage,
    ):
        create_client.return_value = self.service_client
        delete_candidate.return_value = CandidateResumeReference(
            CANDIDATE_ID,
            f"{RECRUITER_ID}/job-1/resume.pdf",
        )
        verify, client = self.authenticated_request()

        with verify, client, self.assertLogs(app.logger, level="WARNING"):
            response = self.client.delete(
                f"/api/candidates/{CANDIDATE_ID}", headers=self.headers
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["message"], "Candidate deleted")

    @patch("routes.candidate_routes.delete_owned_candidate", return_value=None)
    @patch("routes.candidate_routes.create_service_client", return_value=object())
    def test_other_recruiter_candidate_is_not_exposed(self, *_):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.delete(
                f"/api/candidates/{CANDIDATE_ID}", headers=self.headers
            )

        self.assertEqual(response.status_code, 404)

    @patch(
        "routes.candidate_routes.create_resume_signed_url",
        return_value="https://storage.example/signed",
    )
    @patch("routes.candidate_routes.get_owned_candidate_resume_reference")
    @patch("routes.candidate_routes.create_service_client")
    def test_owned_candidate_receives_five_minute_signed_url(
        self,
        create_client,
        get_reference,
        create_url,
    ):
        create_client.return_value = self.service_client
        reference = CandidateResumeReference(
            CANDIDATE_ID,
            f"{RECRUITER_ID}/job-1/resume.pdf",
        )
        get_reference.return_value = reference
        verify, client = self.authenticated_request()

        with verify, client:
            response = self.client.get(
                f"/api/candidates/{CANDIDATE_ID}/resume-url",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"url": "https://storage.example/signed", "expires_in": 300},
        )
        self.assertNotIn("resume_file_url", response.get_json())
        create_url.assert_called_once_with(
            self.service_client,
            RECRUITER_ID,
            reference.storage_path,
        )

    @patch(
        "routes.candidate_routes.create_resume_signed_url",
        side_effect=ResumeUnavailableError("Resume file is unavailable."),
    )
    @patch("routes.candidate_routes.get_owned_candidate_resume_reference")
    @patch("routes.candidate_routes.create_service_client", return_value=object())
    def test_missing_resume_returns_safe_error(self, get_reference, *_):
        get_reference.return_value = CandidateResumeReference(CANDIDATE_ID, None)
        verify, client = self.authenticated_request()

        with verify, client:
            response = self.client.get(
                f"/api/candidates/{CANDIDATE_ID}/resume-url",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["error"], "Resume file is unavailable.")


if __name__ == "__main__":
    unittest.main()
