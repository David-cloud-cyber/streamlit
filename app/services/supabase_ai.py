import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote

import requests

from app.models.exception import HttpException
from app.services import supabase_auth


class SupabaseAiError(ValueError):
    pass


@dataclass(frozen=True)
class AiRuntimeContext:
    provider: str
    model_name: str
    api_key: str
    base_url: str
    key_source: str
    label: str = ""
    provider_id: str | None = None


PROVIDER_DEFAULTS = {
    "openai": {
        "label": "OpenAI",
        "model_name": "gpt-4o-mini",
        "base_url": "https://api.openai.com/v1",
    },
    "anthropic": {
        "label": "Claude",
        "model_name": "anthropic/claude-3-5-haiku-20241022",
        "base_url": "",
    },
}

PLATFORM_SECRET_NAME = os.getenv(
    "OPENROUTER_VAULT_SECRET_NAME", "platform_openrouter_api_key"
)


def _quota_limit() -> int:
    raw_limit = os.getenv("FREE_OPENROUTER_DAILY_QUOTA", "5")
    try:
        return max(0, int(raw_limit))
    except ValueError:
        return 5


def _supabase_url() -> str:
    return supabase_auth.get_supabase_url()


def _server_key() -> str:
    return supabase_auth.get_server_api_key()


def is_configured() -> bool:
    return supabase_auth.is_configured()


def _headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    key = _server_key()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def _request(
    method: str,
    path: str,
    *,
    params: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
    expected_statuses: tuple[int, ...] = (200, 201, 204),
) -> Any:
    if not is_configured():
        raise SupabaseAiError("Supabase server credentials are missing")

    response = requests.request(
        method,
        f"{_supabase_url()}{path}",
        headers=_headers(),
        params=params,
        json=json_body,
        timeout=18,
    )
    if response.status_code not in expected_statuses:
        message = response.text
        try:
            payload = response.json()
            message = payload.get("message") or payload.get("error") or message
        except Exception:
            pass
        raise SupabaseAiError(message or f"Supabase request failed: {response.status_code}")
    if response.status_code == 204 or not response.content:
        return None
    return response.json()


def _rpc(name: str, payload: dict[str, Any]) -> Any:
    return _request("POST", f"/rest/v1/rpc/{name}", json_body=payload)


def _sanitize_provider(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "user_id": row.get("user_id"),
        "provider": row.get("provider"),
        "label": row.get("label"),
        "model_name": row.get("model_name"),
        "base_url": row.get("base_url") or "",
        "enabled": bool(row.get("enabled", True)),
        "is_default": bool(row.get("is_default", False)),
        "key_source": row.get("key_source", "byok"),
        "last_used_at": row.get("last_used_at"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def list_ai_providers(user_id: str) -> list[dict[str, Any]]:
    rows = _request(
        "GET",
        "/rest/v1/user_ai_providers",
        params={
            "select": "id,user_id,provider,label,model_name,base_url,enabled,is_default,key_source,last_used_at,created_at,updated_at",
            "user_id": f"eq.{user_id}",
            "order": "is_default.desc,updated_at.desc",
        },
    )
    return [_sanitize_provider(row) for row in rows or []]


def create_ai_provider(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    provider = (payload.get("provider") or "").strip().lower()
    defaults = PROVIDER_DEFAULTS.get(provider)
    if not defaults:
        raise HttpException("", status_code=400, message="Unsupported AI provider")

    rows = _rpc(
        "app_create_ai_provider",
        {
            "p_user_id": user_id,
            "p_provider": provider,
            "p_label": payload.get("label") or defaults["label"],
            "p_model_name": payload.get("model_name") or defaults["model_name"],
            "p_base_url": payload.get("base_url") or defaults["base_url"],
            "p_api_key": payload.get("api_key") or "",
            "p_is_default": payload.get("is_default", True),
        },
    )
    return _sanitize_provider((rows or [])[0])


def update_ai_provider(
    user_id: str, provider_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    rows = _rpc(
        "app_update_ai_provider",
        {
            "p_user_id": user_id,
            "p_provider_id": provider_id,
            "p_label": payload.get("label"),
            "p_model_name": payload.get("model_name"),
            "p_base_url": payload.get("base_url"),
            "p_api_key": payload.get("api_key"),
            "p_enabled": payload.get("enabled"),
            "p_is_default": payload.get("is_default"),
        },
    )
    if not rows:
        raise HttpException("", status_code=404, message="AI provider not found")
    return _sanitize_provider(rows[0])


def delete_ai_provider(user_id: str, provider_id: str) -> None:
    _rpc(
        "app_delete_ai_provider",
        {"p_user_id": user_id, "p_provider_id": provider_id},
    )


def _active_user_provider(user_id: str) -> Optional[dict[str, Any]]:
    rows = _request(
        "GET",
        "/rest/v1/user_ai_providers",
        params={
            "select": "id,user_id,provider,label,model_name,base_url,enabled,is_default,key_source,last_used_at,created_at,updated_at",
            "user_id": f"eq.{user_id}",
            "enabled": "eq.true",
            "order": "is_default.desc,updated_at.desc",
            "limit": "1",
        },
    )
    if not rows:
        return None
    return rows[0]


def _provider_secret(user_id: str, provider_id: str) -> dict[str, Any]:
    rows = _rpc(
        "app_get_ai_provider_secret",
        {"p_user_id": user_id, "p_provider_id": provider_id},
    )
    if not rows:
        raise SupabaseAiError("AI provider key not found")
    return rows[0]


def _platform_secret() -> str:
    secret = _rpc("app_get_platform_secret", {"p_name": PLATFORM_SECRET_NAME})
    if isinstance(secret, list):
        secret = secret[0] if secret else ""
    if not secret:
        secret = os.getenv("OPENROUTER_API_KEY", "")
    if not secret:
        raise SupabaseAiError(
            "No personal key is configured and the platform OpenRouter key is missing"
        )
    return str(secret)


def get_platform_quota(user_id: str) -> dict[str, int]:
    limit = _quota_limit()
    today = datetime.now(timezone.utc).date().isoformat()
    rows = _request(
        "GET",
        "/rest/v1/ai_usage_events",
        params={
            "select": "id",
            "user_id": f"eq.{user_id}",
            "key_source": "eq.platform",
            "created_at": f"gte.{today}",
        },
    )
    used = len(rows or [])
    return {"limit": limit, "used": used, "remaining": max(0, limit - used)}


def record_usage_event(
    user_id: str,
    context: AiRuntimeContext,
    *,
    feature: str,
    status: str,
    task_id: str | None = None,
) -> None:
    try:
        _request(
            "POST",
            "/rest/v1/ai_usage_events",
            json_body={
                "user_id": user_id,
                "provider": context.provider,
                "model_name": context.model_name,
                "key_source": context.key_source,
                "feature": feature,
                "task_id": task_id,
                "status": status,
            },
            expected_statuses=(201,),
        )
    except Exception:
        pass


def mark_provider_used(provider_id: str) -> None:
    try:
        _request(
            "PATCH",
            "/rest/v1/user_ai_providers",
            params={"id": f"eq.{quote(provider_id)}"},
            json_body={"last_used_at": datetime.now(timezone.utc).isoformat()},
        )
    except Exception:
        pass


def resolve_ai_context(
    user_id: str | None, *, feature: str = "llm", task_id: str | None = None
) -> Optional[AiRuntimeContext]:
    if not supabase_auth.is_auth_enabled() or not user_id:
        return None
    if not is_configured():
        raise SupabaseAiError("Supabase AI storage is not configured")

    provider_row = _active_user_provider(user_id)
    if provider_row:
        secret_row = _provider_secret(user_id, provider_row["id"])
        context = AiRuntimeContext(
            provider=secret_row["provider"],
            model_name=secret_row["model_name"],
            api_key=secret_row["decrypted_secret"],
            base_url=secret_row.get("base_url") or PROVIDER_DEFAULTS.get(
                secret_row["provider"], {}
            ).get("base_url", ""),
            key_source="byok",
            label=secret_row.get("label") or "",
            provider_id=secret_row.get("id"),
        )
        if context.provider_id:
            mark_provider_used(context.provider_id)
        return context

    quota = get_platform_quota(user_id)
    if quota["remaining"] <= 0:
        raise SupabaseAiError(
            "Free OpenRouter quota exhausted. Add your own OpenAI or Claude key in settings."
        )

    return AiRuntimeContext(
        provider="openrouter",
        model_name=os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
        api_key=_platform_secret(),
        base_url="https://openrouter.ai/api/v1",
        key_source="platform",
        label="Quota gratuit OpenRouter",
    )
