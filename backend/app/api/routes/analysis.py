"""
AI 분석 API 라우터
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException

from app.schemas.analysis import (
    InterpretRequest,
    InterpretResponse,
    ChatRequest,
    ChatResponse,
    CompareRequest,
    CompareResponse,
    ExplainRequest,
    ExplainResponse,
)
from app.services.claude_service import claude_service

router = APIRouter()


@router.post("/interpret", response_model=InterpretResponse)
async def interpret_results(request: InterpretRequest) -> InterpretResponse:
    """
    시뮬레이션 결과 해석

    경영진 요약, 핵심 발견사항, 권고사항, 리스크 평가, 투자 등급을 반환합니다.
    """
    try:
        result = await claude_service.interpret_results(
            context=request.context.model_dump(),
            language=request.language
        )
        return InterpretResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 중 오류가 발생했습니다: {str(e)}")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Q&A 채팅

    시뮬레이션 컨텍스트를 기반으로 질문에 답변합니다.
    필요시 Tool을 사용하여 추가 계산을 수행합니다.
    """
    try:
        # 메시지 형식 변환
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        result = await claude_service.chat(
            context=request.context.model_dump(),
            messages=messages,
            language=request.language
        )
        return ChatResponse(
            message=result["message"],
            tool_results=result.get("tool_results")
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 중 오류가 발생했습니다: {str(e)}")


@router.post("/compare", response_model=CompareResponse)
async def compare_scenarios(request: CompareRequest) -> CompareResponse:
    """
    시나리오 비교 분석

    여러 시나리오를 비교하여 최적의 선택과 트레이드오프를 분석합니다.
    """
    try:
        result = await claude_service.compare_scenarios(
            scenarios=request.scenarios,
            language=request.language
        )
        return CompareResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"비교 분석 중 오류가 발생했습니다: {str(e)}")


@router.post("/explain", response_model=ExplainResponse)
async def explain_section(request: ExplainRequest) -> ExplainResponse:
    """
    섹션별 AI 설명 생성

    KPI, NPV 분포, 민감도, 폭포수, 현금흐름, 히트맵 등
    각 차트/섹션에 대한 이해하기 쉬운 전문가 설명을 제공합니다.
    """
    try:
        result = await claude_service.explain_section(
            section=request.section,
            context=request.context.model_dump(),
            language=request.language
        )
        return ExplainResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"설명 생성 중 오류가 발생했습니다: {str(e)}")


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """AI 분석 서비스 상태 확인"""
    return {
        "status": "healthy" if claude_service.client else "degraded",
        "api_configured": claude_service.client is not None,
        "model": claude_service.model
    }
