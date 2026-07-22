import os
import time
import httpx
from functools import wraps
from flask import request, jsonify, g
from jose import jwt, JWTError
from services.supabase_client import SUPABASE_URL, create_authenticated_client

SUPABASE_JWKS_URL = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
SUPABASE_JWT_ISSUER = os.getenv(
    "SUPABASE_JWT_ISSUER", f"{SUPABASE_URL.rstrip('/')}/auth/v1"
)
ALLOWED_JWT_ALGORITHMS = tuple(
    algorithm.strip()
    for algorithm in os.getenv("SUPABASE_JWT_ALGORITHMS", "ES256,RS256").split(",")
    if algorithm.strip()
)
JWKS_CACHE_SECONDS = 60 * 60

_jwks_cache = None
_jwks_cached_at = 0.0


def get_jwks(force_refresh=False):
    global _jwks_cache, _jwks_cached_at

    if not SUPABASE_JWKS_URL:
        raise RuntimeError("SUPABASE_JWKS_URL must be configured")

    cache_expired = time.monotonic() - _jwks_cached_at >= JWKS_CACHE_SECONDS
    if force_refresh or _jwks_cache is None or cache_expired:
        response = httpx.get(SUPABASE_JWKS_URL, timeout=5.0)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cached_at = time.monotonic()
    return _jwks_cache


def _verify_token(token):
    token_header = jwt.get_unverified_header(token)
    algorithm = token_header.get("alg")
    if algorithm not in ALLOWED_JWT_ALGORITHMS:
        raise JWTError("Unexpected signing algorithm")

    jwks = get_jwks()
    key_id = token_header.get("kid")
    known_key_ids = {key.get("kid") for key in jwks.get("keys", [])}
    if key_id and key_id not in known_key_ids:
        jwks = get_jwks(force_refresh=True)

    return jwt.decode(
        token,
        jwks,
        algorithms=list(ALLOWED_JWT_ALGORITHMS),
        audience="authenticated",
        issuer=SUPABASE_JWT_ISSUER,
    )

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        scheme, separator, token = auth_header.partition(" ")
        if not separator or scheme.lower() != "bearer":
            token = ""

        if not token:
            return jsonify({"error": "Authentication required"}), 401

        try:
            payload = _verify_token(token)
            user_id = payload.get("sub")
            if not user_id:
                raise JWTError("Token subject is missing")

            g.user_id = user_id
            g.supabase = create_authenticated_client(token)
        except JWTError:
            return jsonify({"error": "Invalid or expired token"}), 401
        except (httpx.HTTPError, RuntimeError):
            return jsonify({"error": "Token verification failed"}), 401

        return f(*args, **kwargs)
    return decorated
