"""
AI 기반 최적화 엔진

Claude를 활용한 지능형 파라미터 최적화
"""
import json
import logging
from typing import Dict, List, Any, Optional

from app.schemas.simulation import SimulationInput
from app.schemas.optimization import (
    AIOptimizeRequest,
    AIOptimizeResponse,
    AIRecommendation,
    KPITarget,
    VariableConstraint,
)
from app.engine.grid_search import run_single_simulation, apply_combination_to_input
from app.services.claude_service import claude_service

logger = logging.getLogger(__name__)

# 변수 정보
VARIABLE_INFO = {
    "electrolyzer_capacity": {
        "display_name": "전해조 용량",
        "unit": "MW",
        "range": (1, 100),
        "default": 10,
    },
    "electrolyzer_efficiency": {
        "display_name": "전해조 효율",
        "unit": "%",
        "range": (50, 85),
        "default": 67,
    },
    "ppa_price": {
        "display_name": "PPA 전력가격",
        "unit": "원/kWh",
        "range": (50, 200),
        "default": 100,
    },
    "h2_price": {
        "display_name": "수소 판매가격",
        "unit": "원/kg",
        "range": (3000, 15000),
        "default": 6000,
    },
    "capex": {
        "display_name": "CAPEX",
        "unit": "원",
        "range": (10e9, 200e9),
        "default": 50e9,
    },
    "discount_rate": {
        "display_name": "할인율",
        "unit": "%",
        "range": (5, 15),
        "default": 8,
    },
    "debt_ratio": {
        "display_name": "부채비율",
        "unit": "%",
        "range": (0, 90),
        "default": 70,
    },
    "annual_availability": {
        "display_name": "연간 가동률",
        "unit": "%",
        "range": (70, 98),
        "default": 85,
    },
}


class AIOptimizer:
    """AI 기반 최적화기"""

    def __init__(self):
        self.monte_carlo_iterations = 500

    async def optimize(self, request: AIOptimizeRequest) -> AIOptimizeResponse:
        """
        AI 최적화 실행

        Args:
            request: 최적화 요청

        Returns:
            최적화 결과
        """
        base_input = request.base_input
        targets = request.targets
        constraints = request.constraints
        max_iterations = request.max_iterations

        # 1. 기준 시뮬레이션 실행
        base_result = run_single_simulation(base_input, self.monte_carlo_iterations)
        logger.info(f"기준 NPV: {base_result['npv_p50']/1e8:.1f}억원")

        # 2. 민감도 분석 (옵션)
        sensitivity_data = None
        if request.use_sensitivity:
            sensitivity_data = await self._run_sensitivity(base_input)

        # 3. Claude에게 최적화 요청
        recommendations = await self._get_ai_recommendations(
            base_input,
            base_result,
            targets,
            constraints,
            sensitivity_data,
            max_iterations,
        )

        # 4. 추천 결과 검증
        validated_recommendations = []
        for rec in recommendations:
            try:
                # 추천 값으로 시뮬레이션 실행
                modified_input = apply_combination_to_input(
                    base_input, rec["recommended_values"]
                )
                result = run_single_simulation(modified_input, self.monte_carlo_iterations)

                validated_recommendations.append(AIRecommendation(
                    rank=len(validated_recommendations) + 1,
                    recommended_input=rec["recommended_values"],
                    expected_kpis={
                        "npv_p50": result["npv_p50"],
                        "irr_p50": result["irr_p50"],
                        "lcoh": result["lcoh"],
                        "dscr_min": result["dscr_min"],
                    },
                    reasoning=rec.get("reasoning", ""),
                    confidence=rec.get("confidence", 0.7),
                    trade_offs=rec.get("trade_offs", []),
                ))
            except Exception as e:
                logger.warning(f"추천 검증 실패: {e}")
                continue

        # 5. 분석 요약 생성
        analysis_summary = self._generate_summary(
            base_result, validated_recommendations, targets
        )

        return AIOptimizeResponse(
            status="completed",
            recommendations=validated_recommendations,
            analysis_summary=analysis_summary,
            sensitivity_reference=sensitivity_data,
            iterations_used=len(validated_recommendations),
        )

    async def _run_sensitivity(
        self,
        base_input: SimulationInput,
    ) -> Dict[str, Any]:
        """간단한 민감도 분석 실행"""
        base_result = run_single_simulation(base_input, self.monte_carlo_iterations)
        base_npv = base_result["npv_p50"]

        sensitivity = {}
        variables = ["h2_price", "ppa_price", "electrolyzer_efficiency", "capex"]

        for var in variables:
            try:
                # 현재 값 가져오기
                input_dict = base_input.model_dump()

                if var == "h2_price":
                    base_val = input_dict["market"]["h2_price"]
                elif var == "ppa_price":
                    base_val = input_dict["cost"]["ppa_price"]
                elif var == "electrolyzer_efficiency":
                    base_val = input_dict["equipment"]["electrolyzer_efficiency"]
                elif var == "capex":
                    base_val = input_dict["cost"]["capex"]
                else:
                    continue

                if base_val is None:
                    continue

                # +10% 시뮬레이션
                high_input = apply_combination_to_input(base_input, {var: base_val * 1.1})
                high_result = run_single_simulation(high_input, self.monte_carlo_iterations)

                sensitivity[var] = {
                    "base_value": base_val,
                    "high_value": base_val * 1.1,
                    "npv_change_pct": ((high_result["npv_p50"] - base_npv) / abs(base_npv)) * 100,
                }
            except Exception as e:
                logger.warning(f"민감도 계산 실패 ({var}): {e}")

        return sensitivity

    async def _get_ai_recommendations(
        self,
        base_input: SimulationInput,
        base_result: Dict[str, float],
        targets: List[KPITarget],
        constraints: List[VariableConstraint],
        sensitivity_data: Optional[Dict[str, Any]],
        max_iterations: int,
    ) -> List[Dict[str, Any]]:
        """Claude에게 최적화 추천 요청"""

        # 프롬프트 구성
        prompt = self._build_optimization_prompt(
            base_input, base_result, targets, constraints, sensitivity_data
        )

        try:
            # Claude 호출
            response = await claude_service.chat(
                context={
                    "task": "parameter_optimization",
                    "base_kpis": base_result,
                    "targets": [t.model_dump() for t in targets],
                    "sensitivity": sensitivity_data,
                },
                messages=[{"role": "user", "content": prompt}],
                language="ko",
            )

            # 응답 파싱
            message = response.get("message", "")
            recommendations = self._parse_recommendations(message)

            if not recommendations:
                # 기본 추천 생성
                recommendations = self._generate_fallback_recommendations(
                    base_input, targets, sensitivity_data
                )

            return recommendations[:max_iterations]

        except Exception as e:
            logger.error(f"Claude 호출 실패: {e}")
            # 폴백 추천 생성
            return self._generate_fallback_recommendations(
                base_input, targets, sensitivity_data
            )[:max_iterations]

    def _build_optimization_prompt(
        self,
        base_input: SimulationInput,
        base_result: Dict[str, float],
        targets: List[KPITarget],
        constraints: List[VariableConstraint],
        sensitivity_data: Optional[Dict[str, Any]],
    ) -> str:
        """최적화 프롬프트 생성"""

        # 현재 설정 요약
        input_dict = base_input.model_dump()
        current_settings = {
            "전해조 용량 (MW)": input_dict["equipment"]["electrolyzer_capacity"],
            "전해조 효율 (%)": input_dict["equipment"]["electrolyzer_efficiency"],
            "PPA 가격 (원/kWh)": input_dict["cost"]["ppa_price"],
            "수소 판매가 (원/kg)": input_dict["market"]["h2_price"],
            "CAPEX (억원)": input_dict["cost"]["capex"] / 1e8,
            "할인율 (%)": input_dict["financial"]["discount_rate"],
            "부채비율 (%)": input_dict["financial"]["debt_ratio"],
        }

        # 목표 포맷
        targets_text = "\n".join([
            f"- {t.kpi.upper()} {t.condition} {t.value} (우선순위: {t.priority})"
            for t in targets
        ])

        # 제약 조건 포맷
        constraints_text = ""
        if constraints:
            constraints_text = "\n".join([
                f"- {c.name}: "
                + (f"최소 {c.min_value}" if c.min_value else "")
                + (f" ~ 최대 {c.max_value}" if c.max_value else "")
                + (f" 고정값: {c.fixed_value}" if c.fixed_value else "")
                for c in constraints
            ])
        else:
            constraints_text = "없음"

        # 민감도 정보
        sensitivity_text = ""
        if sensitivity_data:
            sensitivity_text = "민감도 분석 결과 (변수별 NPV 영향):\n"
            for var, data in sensitivity_data.items():
                info = VARIABLE_INFO.get(var, {})
                sensitivity_text += f"- {info.get('display_name', var)}: {data['npv_change_pct']:.1f}% 변화 (+10% 시)\n"

        prompt = f"""수소 전해조 프로젝트 최적화를 도와주세요.

## 현재 설정
{json.dumps(current_settings, ensure_ascii=False, indent=2)}

## 현재 KPI 결과
- NPV (P50): {base_result['npv_p50']/1e8:.1f}억원
- IRR (P50): {base_result['irr_p50']:.1f}%
- LCOH: {base_result['lcoh']:,.0f}원/kg
- DSCR 최소: {base_result['dscr_min']:.2f}

## 목표
{targets_text}

## 제약 조건
{constraints_text}

## {sensitivity_text}

## 조정 가능한 변수와 범위
- electrolyzer_capacity: 1~100 MW
- electrolyzer_efficiency: 50~85%
- ppa_price: 50~200 원/kWh
- h2_price: 3000~15000 원/kg
- capex: 10~200B 원
- discount_rate: 5~15%
- debt_ratio: 0~90%
- annual_availability: 70~98%

목표 KPI를 달성할 수 있는 최적의 파라미터 조합을 3개 추천해주세요.

반드시 아래 JSON 형식으로 응답하세요:
```json
[
  {{
    "recommended_values": {{
      "변수명": 값,
      ...
    }},
    "reasoning": "추천 근거 설명",
    "confidence": 0.8,
    "trade_offs": ["트레이드오프 1", "트레이드오프 2"]
  }},
  ...
]
```

중요:
- 현실적으로 달성 가능한 값만 제안하세요
- 제약 조건을 반드시 준수하세요
- 민감도가 높은 변수를 우선 조정하세요
- 변수명은 영문 snake_case로 사용하세요
"""
        return prompt

    def _parse_recommendations(self, message: str) -> List[Dict[str, Any]]:
        """Claude 응답에서 추천 파싱"""
        try:
            # JSON 블록 추출
            if "```json" in message:
                start = message.find("```json") + 7
                end = message.find("```", start)
                json_str = message[start:end].strip()
            elif "```" in message:
                start = message.find("```") + 3
                end = message.find("```", start)
                json_str = message[start:end].strip()
            else:
                # JSON 배열 직접 찾기
                start = message.find("[")
                end = message.rfind("]") + 1
                json_str = message[start:end]

            recommendations = json.loads(json_str)

            # 유효성 검증
            validated = []
            for rec in recommendations:
                if "recommended_values" in rec:
                    validated.append(rec)

            return validated

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"추천 파싱 실패: {e}")
            return []

    def _generate_fallback_recommendations(
        self,
        base_input: SimulationInput,
        targets: List[KPITarget],
        sensitivity_data: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """폴백 추천 생성 (Claude 실패 시)"""
        input_dict = base_input.model_dump()

        recommendations = []

        # 추천 1: 수소 가격 상승 시나리오
        rec1 = {
            "recommended_values": {
                "h2_price": min(
                    input_dict["market"]["h2_price"] * 1.15,
                    15000
                ),
            },
            "reasoning": "수소 판매가 상승으로 수익성 개선",
            "confidence": 0.7,
            "trade_offs": ["시장 경쟁력 저하 가능"],
        }
        recommendations.append(rec1)

        # 추천 2: 전력 비용 절감 시나리오
        rec2 = {
            "recommended_values": {
                "ppa_price": max(
                    input_dict["cost"]["ppa_price"] * 0.85,
                    50
                ),
                "electrolyzer_efficiency": min(
                    input_dict["equipment"]["electrolyzer_efficiency"] + 3,
                    85
                ),
            },
            "reasoning": "전력 비용 절감과 효율 개선으로 LCOH 절감",
            "confidence": 0.75,
            "trade_offs": ["PPA 협상 필요", "고효율 설비 투자 필요"],
        }
        recommendations.append(rec2)

        # 추천 3: 규모의 경제 시나리오
        rec3 = {
            "recommended_values": {
                "electrolyzer_capacity": input_dict["equipment"]["electrolyzer_capacity"] * 1.5,
                "capex": input_dict["cost"]["capex"] * 1.4,  # 규모 경제로 단가 절감 가정
            },
            "reasoning": "설비 규모 확대로 단위당 비용 절감",
            "confidence": 0.65,
            "trade_offs": ["초기 투자 증가", "자금 조달 난이도 상승"],
        }
        recommendations.append(rec3)

        return recommendations

    def _generate_summary(
        self,
        base_result: Dict[str, float],
        recommendations: List[AIRecommendation],
        targets: List[KPITarget],
    ) -> str:
        """분석 요약 생성"""
        if not recommendations:
            return "추천 결과를 생성하지 못했습니다."

        best = recommendations[0]

        # 개선율 계산
        npv_improvement = (
            (best.expected_kpis.get("npv_p50", 0) - base_result["npv_p50"])
            / abs(base_result["npv_p50"])
            * 100
        )

        # 목표 달성 여부
        targets_met = []
        for target in targets:
            actual = best.expected_kpis.get(target.kpi.lower() + "_p50") or best.expected_kpis.get(target.kpi.lower())
            if actual is None:
                continue

            if target.condition == ">=" and actual >= target.value:
                targets_met.append(target.kpi)
            elif target.condition == "<=" and actual <= target.value:
                targets_met.append(target.kpi)

        summary = f"최적 추천안은 NPV를 {npv_improvement:+.1f}% 개선합니다. "

        if targets_met:
            summary += f"목표 달성: {', '.join(targets_met)}. "
        else:
            summary += "일부 목표는 추가 조정이 필요합니다. "

        summary += f"신뢰도: {best.confidence * 100:.0f}%"

        return summary
