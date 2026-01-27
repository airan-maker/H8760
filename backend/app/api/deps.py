"""API 의존성 주입"""
from typing import Generator, Optional
from datetime import datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import verify_firebase_token, extract_token_from_header
from app.models.user import User
from app.schemas.user import UserInToken

# Bearer 토큰 스키마
security = HTTPBearer(auto_error=False)


def get_db() -> Generator:
    """데이터베이스 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[UserInToken]:
    """
    현재 사용자 정보 (선택적)

    인증되지 않은 경우 None 반환
    """
    if not credentials:
        return None

    try:
        token_data = await verify_firebase_token(credentials.credentials)
        return UserInToken(**token_data)
    except HTTPException:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserInToken:
    """
    현재 사용자 정보 (필수)

    인증되지 않은 경우 401 에러
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = await verify_firebase_token(credentials.credentials)
    return UserInToken(**token_data)


def get_or_create_user(
    db: Session,
    user_info: UserInToken,
) -> User:
    """
    사용자 조회 또는 생성

    Firebase 인증된 사용자 정보로 DB 사용자 조회/생성
    """
    user = db.query(User).filter(User.id == user_info.uid).first()

    if user:
        # 마지막 로그인 시간 업데이트
        user.last_login = datetime.utcnow()
        # 프로필 정보 업데이트
        if user_info.name and user.display_name != user_info.name:
            user.display_name = user_info.name
        if user_info.picture and user.photo_url != user_info.picture:
            user.photo_url = user_info.picture
        db.commit()
        db.refresh(user)
    else:
        # 새 사용자 생성
        user = User(
            id=user_info.uid,
            email=user_info.email,
            display_name=user_info.name,
            photo_url=user_info.picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
