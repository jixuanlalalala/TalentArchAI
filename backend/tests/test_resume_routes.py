import sys
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from werkzeug.datastructures import MultiDict

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402


class ResumeRouteTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        self.auth_headers = {"Authorization": "Bearer test-token"}

    def auth_patches(self):
        return (
            patch("utils.decorators._verify_token", return_value={"sub": "recruiter-1"}),
            patch(
                "utils.decorators.create_authenticated_client",
                return_value=object(),
            ),
        )

    def test_unauthenticated_upload_is_rejected(self):
        response = self.client.post(
            "/api/jobs/00000000-0000-0000-0000-000000000001/resumes"
        )
        self.assertEqual(response.status_code, 401)

    def test_invalid_job_id_is_rejected(self):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.post(
                "/api/jobs/not-a-uuid/resumes",
                headers=self.auth_headers,
            )
        self.assertEqual(response.status_code, 400)

    @patch("routes.resume_routes.get_job_by_id", return_value=None)
    def test_unauthorized_or_missing_job_returns_not_found(self, _get_job):
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.post(
                "/api/jobs/00000000-0000-0000-0000-000000000001/resumes",
                headers=self.auth_headers,
                data={
                    "files": (
                        BytesIO(b"%PDF-test"),
                        "candidate.pdf",
                        "application/pdf",
                    )
                },
            )
        self.assertEqual(response.status_code, 404)

    @patch("routes.resume_routes.process_resumes")
    @patch("routes.resume_routes.create_service_client", return_value=object())
    @patch("routes.resume_routes.get_job_by_id", return_value={"id": "job-1"})
    def test_partial_success_returns_multi_status(
        self,
        _get_job,
        _service_client,
        process,
    ):
        process.return_value = [
            {
                "original_filename": "good.pdf",
                "status": "completed",
                "candidate_id": "candidate-1",
                "match_result_id": "match-1",
                "message": "Completed",
            },
            {
                "original_filename": "bad.docx",
                "status": "failed",
                "message": "Could not parse",
            },
        ]
        auth, client = self.auth_patches()
        with auth, client:
            response = self.client.post(
                "/api/jobs/00000000-0000-0000-0000-000000000001/resumes",
                headers=self.auth_headers,
                data=MultiDict([
                    (
                        "files",
                        (BytesIO(b"%PDF-test"), "good.pdf", "application/pdf"),
                    ),
                    (
                        "files",
                        (
                            BytesIO(b"PK-test"),
                            "bad.docx",
                            "application/vnd.openxmlformats-officedocument."
                            "wordprocessingml.document",
                        ),
                    ),
                ]),
            )

        self.assertEqual(response.status_code, 207)
        self.assertTrue(response.get_json()["success"])


if __name__ == "__main__":
    unittest.main()
