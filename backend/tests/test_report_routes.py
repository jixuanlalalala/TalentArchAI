import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402
from services.report_service import (  # noqa: E402
    REPORT_MIME_TYPE,
    ReportArtifact,
    ReportValidationError,
)


JOB_ID = "9f7e114c-f1f0-4917-b36c-32c970fac38e"
RECRUITER_ID = "5bbacfba-2cf7-4200-a52c-10900f67f16c"


class ReportRouteTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        self.headers = {"Authorization": "Bearer test-token"}

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

    def test_report_requires_authentication(self):
        response = self.client.post(
            f"/api/jobs/{JOB_ID}/reports/excel",
            json={"fields": []},
        )
        self.assertEqual(response.status_code, 401)

    def test_invalid_job_id_is_rejected(self):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.post(
                "/api/jobs/not-a-uuid/reports/excel",
                headers=self.headers,
                json={"fields": []},
            )
        self.assertEqual(response.status_code, 400)

    @patch("routes.report_routes.get_job_by_id", return_value=None)
    def test_other_recruiter_job_is_not_exposed(self, _get_job):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.post(
                f"/api/jobs/{JOB_ID}/reports/excel",
                headers=self.headers,
                json={"fields": []},
            )
        self.assertEqual(response.status_code, 404)

    @patch("routes.report_routes.generate_job_report")
    @patch(
        "routes.report_routes.get_job_by_id",
        return_value={"id": JOB_ID, "title": "Engineer"},
    )
    def test_owned_job_returns_xlsx_attachment(self, _get_job, generate_report):
        generate_report.return_value = ReportArtifact(
            content=b"xlsx-content",
            filename="TalentArch_Engineer_Candidate_Report_20260810.xlsx",
            ranked_candidate_count=1,
            status_counts={"pending": 0, "processing": 0, "completed": 1, "failed": 0},
        )
        verify, client = self.authenticated_request()

        with verify, client:
            response = self.client.post(
                f"/api/jobs/{JOB_ID}/reports/excel",
                headers=self.headers,
                json={"fields": ["email", "match_score"]},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, REPORT_MIME_TYPE)
        self.assertEqual(response.data, b"xlsx-content")
        self.assertIn("attachment", response.headers["Content-Disposition"])
        generate_report.assert_called_once_with(
            unittest.mock.ANY,
            RECRUITER_ID,
            {"id": JOB_ID, "title": "Engineer"},
            ["email", "match_score"],
        )

    @patch(
        "routes.report_routes.generate_job_report",
        side_effect=ReportValidationError("One or more report fields are invalid."),
    )
    @patch(
        "routes.report_routes.get_job_by_id",
        return_value={"id": JOB_ID, "title": "Engineer"},
    )
    def test_invalid_report_fields_return_400(self, *_):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.post(
                f"/api/jobs/{JOB_ID}/reports/excel",
                headers=self.headers,
                json={"fields": ["raw_text"]},
            )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
