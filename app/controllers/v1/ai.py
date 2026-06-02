from fastapi import Depends, Path, Request

from app.controllers.v1.base import new_router
from app.models.exception import HttpException
from app.models.schema import (
    AiProviderListResponse,
    AiProviderRequest,
    AiProviderResponse,
    AiProviderUpdateRequest,
    AiQuotaResponse,
    MeResponse,
)
from app.services import supabase_ai, supabase_auth
from app.utils import utils

router = new_router()


def _require_configured_supabase():
    if not supabase_ai.is_configured():
        raise HttpException(
            "",
            status_code=503,
            message="Supabase server credentials are missing",
        )


def _handle_supabase_error(exc: supabase_ai.SupabaseAiError):
    message = str(exc) or "Supabase request failed"
    status_code = 503 if "missing" in message.lower() else 400
    raise HttpException("", status_code=status_code, message=message)


@router.get("/me", response_model=MeResponse, summary="Get current SaaS user")
def get_me(
    request: Request,
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    if not current_user:
        return utils.get_response(
            200,
            {
                "authenticated": False,
                "auth_enabled": False,
            },
        )

    return utils.get_response(
        200,
        {
            "authenticated": True,
            "id": current_user.id,
            "email": current_user.email,
        },
    )


@router.get(
    "/ai/providers",
    response_model=AiProviderListResponse,
    summary="List current user's AI providers",
)
def list_providers(
    request: Request,
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    if not current_user:
        return utils.get_response(200, {"providers": [], "auth_enabled": False})

    _require_configured_supabase()
    try:
        providers = supabase_ai.list_ai_providers(current_user.id)
    except supabase_ai.SupabaseAiError as exc:
        _handle_supabase_error(exc)
    return utils.get_response(200, {"providers": providers, "auth_enabled": True})


@router.post(
    "/ai/providers",
    response_model=AiProviderResponse,
    summary="Create an encrypted BYOK AI provider",
)
def create_provider(
    request: Request,
    body: AiProviderRequest,
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    if not current_user:
        raise HttpException("", status_code=401, message="Authentication required")

    _require_configured_supabase()
    try:
        provider = supabase_ai.create_ai_provider(current_user.id, body.model_dump())
    except supabase_ai.SupabaseAiError as exc:
        _handle_supabase_error(exc)
    return utils.get_response(200, provider)


@router.patch(
    "/ai/providers/{provider_id}",
    response_model=AiProviderResponse,
    summary="Update an encrypted BYOK AI provider",
)
def update_provider(
    request: Request,
    body: AiProviderUpdateRequest,
    provider_id: str = Path(..., description="AI provider ID"),
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    if not current_user:
        raise HttpException("", status_code=401, message="Authentication required")

    _require_configured_supabase()
    try:
        provider = supabase_ai.update_ai_provider(
            current_user.id,
            provider_id,
            body.model_dump(exclude_unset=True),
        )
    except supabase_ai.SupabaseAiError as exc:
        _handle_supabase_error(exc)
    return utils.get_response(200, provider)


@router.delete(
    "/ai/providers/{provider_id}",
    response_model=AiProviderResponse,
    summary="Delete an encrypted BYOK AI provider",
)
def delete_provider(
    request: Request,
    provider_id: str = Path(..., description="AI provider ID"),
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    if not current_user:
        raise HttpException("", status_code=401, message="Authentication required")

    _require_configured_supabase()
    try:
        supabase_ai.delete_ai_provider(current_user.id, provider_id)
    except supabase_ai.SupabaseAiError as exc:
        _handle_supabase_error(exc)
    return utils.get_response(200, {"deleted": True})


@router.get(
    "/ai/quota",
    response_model=AiQuotaResponse,
    summary="Get current user's free platform OpenRouter quota",
)
def get_quota(
    request: Request,
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    if not current_user:
        return utils.get_response(
            200,
            {
                "key_source": "local_config",
                "limit": 0,
                "used": 0,
                "remaining": 0,
                "auth_enabled": False,
            },
        )

    _require_configured_supabase()
    try:
        quota = supabase_ai.get_platform_quota(current_user.id)
    except supabase_ai.SupabaseAiError as exc:
        _handle_supabase_error(exc)
    quota["key_source"] = "platform"
    quota["auth_enabled"] = True
    return utils.get_response(200, quota)
