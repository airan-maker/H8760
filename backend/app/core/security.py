"""
Firebase 토큰 검증 모듈
"""
import os
from typing import Optional

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status

from app.core.config import settings


def initialize_firebase():
    """Firebase Admin SDK 초기화"""
    if firebase_admin._apps:
        return  # 이미 초기화됨

    # 서비스 계정 키 파일 경로
    service_account_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "firebase-service-account.json"
    )

    if os.path.exists(service_account_path):
        # 서비스 계정 키 파일 사용
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {
            "projectId": settings.FIREBASE_PROJECT_ID
        })
    elif settings.FIREBASE_PROJECT_ID:
        # 프로젝트 ID만으로 초기화 (Cloud Run 등 환경)
        firebase_admin.initialize_app(options={
            "projectId": settings.FIREBASE_PROJECT_ID
        })
    else:
        raise RuntimeError(
            "Firebase 초기화 실패: 서비스 계정 키 파일이나 프로젝트 ID가 필요합니다."
        )


async def verify_firebase_token(token: str) -> dict:
    """
    Firebase ID 토큰 검증

    Args:
        token: Firebase ID 토큰

    Returns:
        검증된 토큰 정보 (uid, email, name, picture 등)

    Raises:
        HTTPException: 토큰 검증 실패 시
    """
    try:
        # Firebase 초기화 확인
        initialize_firebase()

        # 토큰 검증
        decoded_token = auth.verify_id_token(token)

        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture"),
            "email_verified": decoded_token.get("email_verified", False),
        }

    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 만료되었습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 취소되었습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"토큰 검증 실패: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    """
    Authorization 헤더에서 토큰 추출

    Args:
        authorization: Authorization 헤더 값 (Bearer <token>)

    Returns:
        추출된 토큰 또는 None
    """
    if not authorization:
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    return parts[1]
