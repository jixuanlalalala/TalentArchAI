import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.account_service import (  # noqa: E402
    ACCOUNT_DEACTIVATION_BAN_DURATION,
    AccountDeactivationError,
    deactivate_recruiter_account,
)


class FakeAdmin:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = []

    def update_user_by_id(self, user_id, attributes):
        self.calls.append((user_id, attributes))
        if self.error:
            raise self.error
        return self.response


class AccountServiceTests(unittest.TestCase):
    def test_deactivation_bans_only_the_authenticated_user(self):
        admin = FakeAdmin(response=SimpleNamespace(user=object()))
        client = SimpleNamespace(auth=SimpleNamespace(admin=admin))

        deactivate_recruiter_account(client, "recruiter-1")

        self.assertEqual(
            admin.calls,
            [
                (
                    "recruiter-1",
                    {"ban_duration": ACCOUNT_DEACTIVATION_BAN_DURATION},
                )
            ],
        )

    def test_deactivation_failure_uses_a_safe_error(self):
        admin = FakeAdmin(error=RuntimeError("provider details"))
        client = SimpleNamespace(auth=SimpleNamespace(admin=admin))

        with self.assertRaisesRegex(
            AccountDeactivationError,
            "The account could not be deactivated.",
        ):
            deactivate_recruiter_account(client, "recruiter-1")

    def test_missing_user_response_is_rejected(self):
        admin = FakeAdmin(response=SimpleNamespace(user=None))
        client = SimpleNamespace(auth=SimpleNamespace(admin=admin))

        with self.assertRaises(AccountDeactivationError):
            deactivate_recruiter_account(client, "recruiter-1")


if __name__ == "__main__":
    unittest.main()
