ACCOUNT_DEACTIVATION_BAN_DURATION = "876000h"


class AccountDeactivationError(RuntimeError):
    """A safe account-deactivation error suitable for an API response."""


def deactivate_recruiter_account(service_supabase, recruiter_id: str) -> None:
    try:
        response = service_supabase.auth.admin.update_user_by_id(
            recruiter_id,
            {"ban_duration": ACCOUNT_DEACTIVATION_BAN_DURATION},
        )
    except Exception as exc:
        raise AccountDeactivationError(
            "The account could not be deactivated."
        ) from exc

    if getattr(response, "user", None) is None:
        raise AccountDeactivationError("The account could not be deactivated.")
