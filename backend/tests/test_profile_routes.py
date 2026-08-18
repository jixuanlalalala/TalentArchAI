import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402
from services.account_service import AccountDeactivationError  # noqa: E402


RECRUITER_ID = "5bbacfba-2cf7-4200-a52c-10900f67f16c"


class FakeQuery:
    def __init__(self, response, operations):
        self.response = response
        self.operations = operations

    def select(self, fields):
        self.operations.append(("select", fields))
        return self

    def eq(self, field, value):
        self.operations.append(("eq", field, value))
        return self

    def limit(self, value):
        self.operations.append(("limit", value))
        return self

    def upsert(self, payload, on_conflict=None):
        self.operations.append(("upsert", payload, on_conflict))
        return self

    def execute(self):
        return self.response


class FakeSupabase:
    def __init__(self, responses):
        self.responses = list(responses)
        self.operations = []

    def table(self, name):
        self.operations.append(("table", name))
        return FakeQuery(self.responses.pop(0), self.operations)


class ProfileRouteTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        self.headers = {"Authorization": "Bearer test-token"}

    def authenticated_request(self, authenticated_client=object()):
        return (
            patch(
                "utils.decorators._verify_token",
                return_value={"sub": RECRUITER_ID},
            ),
            patch(
                "utils.decorators.create_authenticated_client",
                return_value=authenticated_client,
            ),
        )

    def test_profile_requires_authentication(self):
        get_response = self.client.get("/api/profile")
        patch_response = self.client.patch(
            "/api/profile",
            json={"name": "Recruiter", "job_title": "HR", "phone": "0123"},
        )

        self.assertEqual(get_response.status_code, 401)
        self.assertEqual(patch_response.status_code, 401)

    def test_get_profile_returns_the_authenticated_recruiter_row(self):
        profile = {
            "id": RECRUITER_ID,
            "name": "Recruiter",
            "job_title": "Talent Manager",
            "phone": "0123",
            "created_at": "2026-08-10T00:00:00+00:00",
        }
        supabase = FakeSupabase([SimpleNamespace(data=[profile])])
        verify, client = self.authenticated_request(supabase)

        with verify, client:
            response = self.client.get("/api/profile", headers=self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"profile": profile})
        self.assertIn(("eq", "id", RECRUITER_ID), supabase.operations)

    def test_patch_profile_upserts_and_returns_persisted_values(self):
        saved_profile = {
            "id": RECRUITER_ID,
            "name": "Updated Recruiter",
            "job_title": "Senior Recruiter",
            "phone": "0199",
            "created_at": "2026-08-10T00:00:00+00:00",
        }
        supabase = FakeSupabase([SimpleNamespace(data=[saved_profile])])
        verify, client = self.authenticated_request(supabase)

        with verify, client:
            response = self.client.patch(
                "/api/profile",
                headers=self.headers,
                json={
                    "name": " Updated Recruiter ",
                    "job_title": " Senior Recruiter ",
                    "phone": " 0199 ",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"profile": saved_profile})
        self.assertIn(
            (
                "upsert",
                {
                    "id": RECRUITER_ID,
                    "name": "Updated Recruiter",
                    "job_title": "Senior Recruiter",
                    "phone": "0199",
                },
                "id",
            ),
            supabase.operations,
        )

    def test_patch_profile_rejects_a_blank_name(self):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.patch(
                "/api/profile",
                headers=self.headers,
                json={"name": "  ", "job_title": "HR", "phone": "0123"},
            )

        self.assertEqual(response.status_code, 400)

    def test_deactivation_requires_authentication(self):
        response = self.client.post(
            "/api/profile/deactivate",
            json={"confirm": True},
        )

        self.assertEqual(response.status_code, 401)

    def test_deactivation_requires_explicit_confirmation(self):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.post(
                "/api/profile/deactivate",
                headers=self.headers,
                json={"confirm": False},
            )

        self.assertEqual(response.status_code, 400)

    @patch("routes.profile_routes.deactivate_recruiter_account")
    @patch("routes.profile_routes.create_service_client", return_value=object())
    def test_deactivation_uses_authenticated_recruiter_id(
        self,
        create_client,
        deactivate,
    ):
        verify, auth_client = self.authenticated_request()
        with verify, auth_client:
            response = self.client.post(
                "/api/profile/deactivate",
                headers=self.headers,
                json={"confirm": True},
            )

        self.assertEqual(response.status_code, 200)
        deactivate.assert_called_once_with(create_client.return_value, RECRUITER_ID)

    @patch(
        "routes.profile_routes.deactivate_recruiter_account",
        side_effect=AccountDeactivationError(
            "The account could not be deactivated."
        ),
    )
    @patch("routes.profile_routes.create_service_client", return_value=object())
    def test_deactivation_failure_returns_safe_error(self, *_):
        verify, client = self.authenticated_request()
        with verify, client:
            response = self.client.post(
                "/api/profile/deactivate",
                headers=self.headers,
                json={"confirm": True},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.get_json(),
            {"error": "The account could not be deactivated."},
        )


if __name__ == "__main__":
    unittest.main()
