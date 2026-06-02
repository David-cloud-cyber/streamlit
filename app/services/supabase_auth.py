import os
import time
from dataclasses import dataclass
from typing import Any, Optional

import requests
from fastapi import Request

from app.models.exception import HttpException


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str = ""
    raw: dict[str, Any] | None = None


_USER_CACHE: dict[str, tuple[float, AuthenticatedUser]] = {}
_CACHE_TTL_SECONDS = 60


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def is_auth_enabled() -> bool:
    return _truthy(os.getenv("SAAS_AUTH_ENABLED") or os.getenv("SUPABASE_AUTH_ENABLED"))


def get_supabase_url() -> str:
    return (os.getenv("SUPABASE_URL") or "").rstrip("/")


def get_server_api_key() -> str:
    return (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or ""
    )


def is_configured() -> bool:
    return bool(get_supabase_url() and get_server_api_key())


def _extract_bearer_token(request: Request) -> str:
    authorization = request.headers.get("Authorization", "")
    if not authorization.lower().startswith("bearer "):
        return ""
    return authorization.split(" ", 1)[1].strip()


def _verify_token_with_supabase(token: str) -> AuthenticatedUser:
    now = time.time()
    cached = _USER_CACHE.get(token)
    if cached and cached[0] > now:
        return cached[1]

    supabase_url = get_supabase_url()
    api_key = get_server_api_key()
    if not supabase_url or not api_key:
        raise HttpException(
            "",
            status_code=503,
            message="Supabase auth is enabled but SUPABASE_URL or server API key is missing",
        )

    response = requests.get(
        f"{supabase_url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": api_key},
        timeout=12,
    )
    if response.status_code >= 400:
        raise HttpException("", status_code=401, message="Invalid Supabase session")

    payload = response.json()
    user = AuthenticatedUser(
        id=payload.get("id", ""),
        email=payload.get("email") or "",
        raw=payload,
    )
    if not user.id:
        raise HttpException("", status_code=401, message="Invalid Supabase session")

    _USER_CACHE[token] = (now + _CACHE_TTL_SECONDS, user)
    return user


def get_current_user(request: Request) -> Optional[AuthenticatedUser]:
    if not is_auth_enabled():
        return None

    token = _extract_bearer_token(request)
    if not token:
        raise HttpException("", status_code=401, message="Missing Supabase session")

    user = _verify_token_with_supabase(token)
    request.state.user_id = user.id
    request.state.user_email = user.email
    return user


def require_user(request: Request) -> Optional[AuthenticatedUser]:
    return get_current_user(request)
