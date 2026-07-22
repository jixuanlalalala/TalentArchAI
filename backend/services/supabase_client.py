import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured"
    )


def create_authenticated_client(access_token: str) -> Client:
    """Create a request-scoped Supabase client that respects the user's RLS policies."""
    client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    client.postgrest.auth(access_token)
    return client
