from fastapi import Depends, Request

from app.controllers.v1.base import new_router
from app.models.schema import (
    VideoScriptRequest,
    VideoScriptResponse,
    VideoTermsRequest,
    VideoTermsResponse,
)
from app.services import llm
from app.services import supabase_auth
from app.utils import utils

# authentication dependency
# router = new_router(dependencies=[Depends(base.verify_token)])
router = new_router()


@router.post(
    "/scripts",
    response_model=VideoScriptResponse,
    summary="Create a script for the video",
)
def generate_video_script(
    request: Request,
    body: VideoScriptRequest,
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    video_script = llm.generate_script(
        video_subject=body.video_subject,
        language=body.video_language,
        paragraph_number=body.paragraph_number,
        user_id=current_user.id if current_user else None,
    )
    response = {"video_script": video_script}
    return utils.get_response(200, response)


@router.post(
    "/terms",
    response_model=VideoTermsResponse,
    summary="Generate video terms based on the video script",
)
def generate_video_terms(
    request: Request,
    body: VideoTermsRequest,
    current_user: supabase_auth.AuthenticatedUser | None = Depends(
        supabase_auth.require_user
    ),
):
    video_terms = llm.generate_terms(
        video_subject=body.video_subject,
        video_script=body.video_script,
        amount=body.amount,
        user_id=current_user.id if current_user else None,
    )
    response = {"video_terms": video_terms}
    return utils.get_response(200, response)
