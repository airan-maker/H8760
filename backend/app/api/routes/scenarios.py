"""
시나리오 API 라우터
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_or_create_user
from app.models.scenario import Scenario
from app.schemas.scenario import (
    ScenarioCreate,
    ScenarioUpdate,
    ScenarioResponse,
    ScenarioListResponse,
)
from app.schemas.user import UserInToken

router = APIRouter()


@router.get("", response_model=List[ScenarioListResponse])
async def list_scenarios(
    current_user: UserInToken = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    내 시나리오 목록 조회

    - 로그인한 사용자의 시나리오 목록 반환
    - 최신순 정렬
    """
    user = get_or_create_user(db, current_user)
    scenarios = (
        db.query(Scenario)
        .filter(Scenario.user_id == user.id)
        .order_by(Scenario.created_at.desc())
        .all()
    )
    return scenarios


@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    scenario_data: ScenarioCreate,
    current_user: UserInToken = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    시나리오 저장

    - 새 시나리오 생성
    - 입력 설정과 결과 저장
    """
    user = get_or_create_user(db, current_user)

    scenario = Scenario(
        user_id=user.id,
        name=scenario_data.name,
        description=scenario_data.description,
        input_config=scenario_data.input_config,
        result=scenario_data.result,
    )

    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return scenario


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: str,
    current_user: UserInToken = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    시나리오 상세 조회

    - 시나리오 ID로 조회
    - 본인 시나리오만 조회 가능
    """
    user = get_or_create_user(db, current_user)

    scenario = (
        db.query(Scenario)
        .filter(Scenario.id == scenario_id, Scenario.user_id == user.id)
        .first()
    )

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="시나리오를 찾을 수 없습니다.",
        )

    return scenario


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: str,
    scenario_data: ScenarioUpdate,
    current_user: UserInToken = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    시나리오 수정

    - 시나리오 정보 업데이트
    - 본인 시나리오만 수정 가능
    """
    user = get_or_create_user(db, current_user)

    scenario = (
        db.query(Scenario)
        .filter(Scenario.id == scenario_id, Scenario.user_id == user.id)
        .first()
    )

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="시나리오를 찾을 수 없습니다.",
        )

    # 업데이트할 필드만 적용
    update_data = scenario_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(scenario, field, value)

    db.commit()
    db.refresh(scenario)

    return scenario


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    scenario_id: str,
    current_user: UserInToken = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    시나리오 삭제

    - 시나리오 삭제
    - 본인 시나리오만 삭제 가능
    """
    user = get_or_create_user(db, current_user)

    scenario = (
        db.query(Scenario)
        .filter(Scenario.id == scenario_id, Scenario.user_id == user.id)
        .first()
    )

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="시나리오를 찾을 수 없습니다.",
        )

    db.delete(scenario)
    db.commit()

    return None
