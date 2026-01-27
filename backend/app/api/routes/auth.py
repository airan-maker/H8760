"""
인증 API 라우터
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_or_create_user
from app.schemas.user import UserResponse, UserInToken

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: UserInToken = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    현재 로그인한 사용자 정보 조회

    - Firebase 토큰으로 인증된 사용자 정보 반환
    - 처음 로그인하는 경우 사용자 자동 생성
    """
    user = get_or_create_user(db, current_user)
    return user
