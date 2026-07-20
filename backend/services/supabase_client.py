import os
from dotenv import load_dotenv
from supabase import create_client, Client

# print("Testing")
os.environ.pop("SUPABASE_URL", None)
os.environ.pop("SUPABASE_PUBLISHABLE_KEY", None)
load_dotenv(override=True)

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)