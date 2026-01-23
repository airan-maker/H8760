"""API 의존성 주입"""
from typing import Generator

# 추후 데이터베이스 세션 등 의존성 추가
# from app.db.session import SessionLocal


def get_db() -> Generator:
    """데이터베이스 세션 의존성"""
    # db = SessionLocal()
    # try:
    #     yield db
    # finally:
    #     db.close()
    pass
