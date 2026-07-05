import os
import httpx
from functools import wraps
from flask import request, jsonify, g
from jose import jwt, JWTError

SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL")

# cache the JWKS in memory so Flask doesn't fetch it on every request
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        print(f"Fetching JWKS from: {SUPABASE_JWKS_URL}")
        response = httpx.get(SUPABASE_JWKS_URL)
        response.raise_for_status()
        _jwks_cache = response.json()
    return _jwks_cache

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        print("=== require_auth called ===")

        auth_header = request.headers.get("Authorization", None)
        print(f"Authorization header: {auth_header}")  # Debugging line
        
        token = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        print(f"Token extracted: {token[:20] if token else None}")
        
        if not token:
            return jsonify({"message": "Token is missing"}), 401
        
        try:
            jwks = get_jwks()
            print(f"JWKS: {jwks}")  # Debugging line

            # jose automatically picks the right key from JWKS
            # using the "kid" (key ID) in the token header
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["ES256", "RS256", "HS256"],  # support all three
                audience="authenticated"
            )
            g.user_id = payload["sub"]  # recruiter's user id

        except JWTError as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        except Exception as e:
            return jsonify({"error": "Token verification failed"}), 401
        
        return f(*args, **kwargs)
    return decorated