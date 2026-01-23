"""
민감도 분석 엔진

주요 변수의 변동에 따른 NPV 민감도를 분석합니다.
"""
from dataclasses import dataclass
from typing import List, Callable
import numpy as np


@dataclass
class SensitivityVariable:
    """민감도 분석 변수"""

    name: str
    display_name: str
    base_value: float
    low_pct: float  # 하위 변동률 (%)
    high_pct: float  # 상위 변동률 (%)


@dataclass
class SensitivityResult:
    """민감도 분석 결과"""

    variable: str
    display_name: str
    base_case: float
    low_case: float
    high_case: float
    low_change_pct: float
    high_change_pct: float
    low_value: float
    high_value: float


def run_sensitivity_analysis(
    base_npv: float,
    variables: List[SensitivityVariable],
    npv_calculator: Callable[[str, float], float],
) -> List[SensitivityResult]:
    """
    민감도 분석 실행

    Args:
        base_npv: 기준 NPV
        variables: 분석할 변수 목록
        npv_calculator: NPV 계산 함수 (변수명, 변수값) -> NPV

    Returns:
        List[SensitivityResult]: 민감도 분석 결과 목록
    """
    results = []

    for var in variables:
        # 하위/상위 값 계산
        low_value = var.base_value * (1 + var.low_pct / 100)
        high_value = var.base_value * (1 + var.high_pct / 100)

        # NPV 계산
        low_npv = npv_calculator(var.name, low_value)
        high_npv = npv_calculator(var.name, high_value)

        # 변동률 계산
        low_change = ((low_npv - base_npv) / abs(base_npv)) * 100 if base_npv != 0 else 0
        high_change = (
            ((high_npv - base_npv) / abs(base_npv)) * 100 if base_npv != 0 else 0
        )

        results.append(
            SensitivityResult(
                variable=var.name,
                display_name=var.display_name,
                base_case=base_npv,
                low_case=low_npv,
                high_case=high_npv,
                low_change_pct=low_change,
                high_change_pct=high_change,
                low_value=low_value,
                high_value=high_value,
            )
        )

    # NPV 영향도 순으로 정렬 (절대값 기준)
    results.sort(
        key=lambda x: max(abs(x.low_change_pct), abs(x.high_change_pct)), reverse=True
    )

    return results


def calculate_risk_waterfall(
    base_npv: float,
    risk_factors: List[dict],
) -> List[dict]:
    """
    리스크 폭포수 차트 데이터 생성

    Args:
        base_npv: 기준 NPV
        risk_factors: 리스크 요인 목록 [{"name": str, "impact": float}, ...]

    Returns:
        List[dict]: 폭포수 차트 데이터
    """
    waterfall = [{"factor": "기준 NPV", "impact": base_npv, "cumulative": base_npv}]

    cumulative = base_npv
    for factor in risk_factors:
        cumulative += factor["impact"]
        waterfall.append(
            {
                "factor": factor["name"],
                "impact": factor["impact"],
                "cumulative": cumulative,
            }
        )

    waterfall.append(
        {"factor": "최종 NPV", "impact": 0, "cumulative": cumulative, "is_total": True}
    )

    return waterfall


def generate_default_sensitivity_variables(
    electricity_price: float,
    h2_price: float,
    availability: float,
    efficiency: float,
    capex: float,
) -> List[SensitivityVariable]:
    """
    기본 민감도 분석 변수 생성

    Args:
        electricity_price: 전력 가격
        h2_price: 수소 가격
        availability: 가동률
        efficiency: 효율
        capex: CAPEX

    Returns:
        List[SensitivityVariable]: 민감도 변수 목록
    """
    return [
        SensitivityVariable(
            name="electricity_price",
            display_name="전력가격",
            base_value=electricity_price,
            low_pct=-20,
            high_pct=20,
        ),
        SensitivityVariable(
            name="h2_price",
            display_name="수소가격",
            base_value=h2_price,
            low_pct=-10,
            high_pct=10,
        ),
        SensitivityVariable(
            name="availability",
            display_name="가동률",
            base_value=availability,
            low_pct=-5,
            high_pct=5,
        ),
        SensitivityVariable(
            name="efficiency",
            display_name="효율",
            base_value=efficiency,
            low_pct=-3,
            high_pct=3,
        ),
        SensitivityVariable(
            name="capex",
            display_name="CAPEX",
            base_value=capex,
            low_pct=-15,
            high_pct=15,
        ),
    ]
