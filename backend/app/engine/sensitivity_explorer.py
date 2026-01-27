"""
민감도 기반 탐색 엔진

영향력 높은 변수를 식별하고 집중 탐색
"""
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple

from app.schemas.simulation import SimulationInput
from app.schemas.optimization import (
    SensitivityExploreRequest,
    SensitivityExploreResponse,
    SensitivityRank,
    ContourData,
)
from app.engine.grid_search import run_single_simulation, apply_combination_to_input

logger = logging.getLogger(__name__)

# 변수별 표시 이름 및 탐색 범위
VARIABLE_INFO = {
    "electrolyzer_capacity": {
        "display_name": "전해조 용량",
        "category": "equipment",
        "unit": "MW",
        "default_range": (5.0, 20.0),
    },
    "electrolyzer_efficiency": {
        "display_name": "전해조 효율",
        "category": "equipment",
        "unit": "%",
        "default_range": (60.0, 75.0),
    },
    "ppa_price": {
        "display_name": "PPA 전력가격",
        "category": "cost",
        "unit": "원/kWh",
        "default_range": (70.0, 130.0),
    },
    "h2_price": {
        "display_name": "수소 판매가격",
        "category": "market",
        "unit": "원/kg",
        "default_range": (5000.0, 8000.0),
    },
    "capex": {
        "display_name": "CAPEX",
        "category": "cost",
        "unit": "원",
        "default_range": (30e9, 70e9),
    },
    "discount_rate": {
        "display_name": "할인율",
        "category": "financial",
        "unit": "%",
        "default_range": (6.0, 10.0),
    },
    "debt_ratio": {
        "display_name": "부채비율",
        "category": "financial",
        "unit": "%",
        "default_range": (50.0, 80.0),
    },
    "annual_availability": {
        "display_name": "연간 가동률",
        "category": "equipment",
        "unit": "%",
        "default_range": (80.0, 95.0),
    },
}


class SensitivityExplorer:
    """민감도 기반 탐색기"""

    def __init__(self):
        self.monte_carlo_iterations = 500  # 속도 최적화

    def explore(self, request: SensitivityExploreRequest) -> SensitivityExploreResponse:
        """
        민감도 기반 탐색 실행

        Args:
            request: 탐색 요청

        Returns:
            탐색 결과
        """
        base_input = request.base_input

        # 1. 민감도 순위 계산
        sensitivity_ranking = self._calculate_sensitivity_ranking(base_input)

        # 2. 탐색 변수 선택
        if request.selected_variables:
            selected_variables = request.selected_variables
        else:
            # 상위 2개 변수 자동 선택
            selected_variables = [r.variable for r in sensitivity_ranking[:2]]

        # 3. 등고선 데이터 생성 (2개 변수인 경우)
        contour_data = None
        optimal_region = None

        if len(selected_variables) >= 2:
            contour_data, optimal_region = self._generate_contour_data(
                base_input,
                selected_variables[0],
                selected_variables[1],
                request.resolution,
                request.target_kpi,
            )

        # 4. 추천 사항 생성
        recommendations = self._generate_recommendations(
            sensitivity_ranking,
            contour_data,
            optimal_region,
        )

        return SensitivityExploreResponse(
            status="completed",
            sensitivity_ranking=sensitivity_ranking,
            selected_variables=selected_variables,
            contour_data=contour_data,
            optimal_region=optimal_region,
            recommendations=recommendations,
        )

    def _calculate_sensitivity_ranking(
        self,
        base_input: SimulationInput,
    ) -> List[SensitivityRank]:
        """
        변수별 민감도 순위 계산

        각 변수를 ±20% 변동시켜 NPV 변화 측정
        """
        # 기준 NPV 계산
        try:
            base_result = run_single_simulation(base_input, self.monte_carlo_iterations)
            base_npv = base_result["npv_p50"]
        except Exception as e:
            logger.error(f"기준 시뮬레이션 실패: {e}")
            base_npv = 0

        rankings = []

        # 변수별 매핑
        variable_mapping = {
            "electrolyzer_capacity": ("equipment", "electrolyzer_capacity"),
            "electrolyzer_efficiency": ("equipment", "electrolyzer_efficiency"),
            "ppa_price": ("cost", "ppa_price"),
            "h2_price": ("market", "h2_price"),
            "capex": ("cost", "capex"),
            "discount_rate": ("financial", "discount_rate"),
            "debt_ratio": ("financial", "debt_ratio"),
            "annual_availability": ("equipment", "annual_availability"),
        }

        for var_name, (category, field) in variable_mapping.items():
            try:
                # 현재 값 가져오기
                input_dict = base_input.model_dump()
                base_value = input_dict[category][field]

                if base_value is None or base_value == 0:
                    continue

                # Low case (-20%)
                low_value = base_value * 0.8
                low_input = self._modify_input(base_input, var_name, low_value)
                low_result = run_single_simulation(low_input, self.monte_carlo_iterations)
                low_npv = low_result["npv_p50"]

                # High case (+20%)
                high_value = base_value * 1.2
                high_input = self._modify_input(base_input, var_name, high_value)
                high_result = run_single_simulation(high_input, self.monte_carlo_iterations)
                high_npv = high_result["npv_p50"]

                # 변화율 계산
                low_change_pct = ((low_npv - base_npv) / abs(base_npv)) * 100 if base_npv != 0 else 0
                high_change_pct = ((high_npv - base_npv) / abs(base_npv)) * 100 if base_npv != 0 else 0

                # NPV 변동폭 (swing)
                npv_swing = abs(high_npv - low_npv)

                # 영향도 점수 (변동폭의 절대값)
                impact_score = abs(high_change_pct - low_change_pct)

                info = VARIABLE_INFO.get(var_name, {})
                rankings.append(SensitivityRank(
                    variable=var_name,
                    display_name=info.get("display_name", var_name),
                    impact_score=impact_score,
                    npv_swing=npv_swing,
                    low_case_pct=low_change_pct,
                    high_case_pct=high_change_pct,
                ))

            except Exception as e:
                logger.warning(f"변수 {var_name} 민감도 계산 실패: {e}")
                continue

        # 영향도 점수로 정렬
        rankings.sort(key=lambda x: x.impact_score, reverse=True)

        return rankings

    def _modify_input(
        self,
        base_input: SimulationInput,
        var_name: str,
        value: float,
    ) -> SimulationInput:
        """입력 값 수정"""
        return apply_combination_to_input(base_input, {var_name: value})

    def _generate_contour_data(
        self,
        base_input: SimulationInput,
        x_variable: str,
        y_variable: str,
        resolution: int,
        target_kpi: str,
    ) -> Tuple[ContourData, Optional[Dict[str, Any]]]:
        """
        등고선 데이터 생성

        Args:
            base_input: 기본 입력
            x_variable: X축 변수
            y_variable: Y축 변수
            resolution: 해상도
            target_kpi: 대상 KPI

        Returns:
            등고선 데이터, 최적 영역 정보
        """
        # 변수 범위 결정
        x_info = VARIABLE_INFO.get(x_variable, {})
        y_info = VARIABLE_INFO.get(y_variable, {})

        # 기본 값 가져오기
        input_dict = base_input.model_dump()

        x_mapping = {
            "electrolyzer_capacity": ("equipment", "electrolyzer_capacity"),
            "electrolyzer_efficiency": ("equipment", "electrolyzer_efficiency"),
            "ppa_price": ("cost", "ppa_price"),
            "h2_price": ("market", "h2_price"),
            "capex": ("cost", "capex"),
            "discount_rate": ("financial", "discount_rate"),
            "debt_ratio": ("financial", "debt_ratio"),
            "annual_availability": ("equipment", "annual_availability"),
        }

        x_cat, x_field = x_mapping.get(x_variable, ("equipment", "electrolyzer_capacity"))
        y_cat, y_field = x_mapping.get(y_variable, ("market", "h2_price"))

        x_base = input_dict[x_cat][x_field] or 10.0
        y_base = input_dict[y_cat][y_field] or 6000.0

        # 범위 설정 (±30%)
        x_range = x_info.get("default_range", (x_base * 0.7, x_base * 1.3))
        y_range = y_info.get("default_range", (y_base * 0.7, y_base * 1.3))

        x_values = np.linspace(x_range[0], x_range[1], resolution).tolist()
        y_values = np.linspace(y_range[0], y_range[1], resolution).tolist()

        # Z 행렬 계산
        z_matrix = []
        optimal_point = None
        optimal_value = float('-inf') if target_kpi != 'lcoh' else float('inf')

        for yi, y_val in enumerate(y_values):
            row = []
            for xi, x_val in enumerate(x_values):
                try:
                    # 조합 적용
                    combo = {x_variable: x_val, y_variable: y_val}
                    modified_input = apply_combination_to_input(base_input, combo)

                    # 시뮬레이션 실행
                    result = run_single_simulation(modified_input, self.monte_carlo_iterations)

                    if target_kpi == "npv_p50":
                        z_val = result["npv_p50"]
                    elif target_kpi == "irr_p50":
                        z_val = result["irr_p50"]
                    elif target_kpi == "lcoh":
                        z_val = result["lcoh"]
                    else:
                        z_val = result["npv_p50"]

                    row.append(z_val)

                    # 최적점 업데이트
                    if target_kpi == "lcoh":
                        if z_val < optimal_value:
                            optimal_value = z_val
                            optimal_point = {"x": x_val, "y": y_val, "z": z_val}
                    else:
                        if z_val > optimal_value:
                            optimal_value = z_val
                            optimal_point = {"x": x_val, "y": y_val, "z": z_val}

                except Exception as e:
                    logger.warning(f"등고선 점 ({x_val}, {y_val}) 계산 실패: {e}")
                    row.append(None)

            z_matrix.append(row)

            # 진행 로그
            if (yi + 1) % 5 == 0:
                logger.info(f"등고선 계산 진행: {yi + 1}/{len(y_values)}")

        # 등고선 레벨 계산
        all_z = [z for row in z_matrix for z in row if z is not None]
        if all_z:
            z_min, z_max = min(all_z), max(all_z)
            contour_levels = np.linspace(z_min, z_max, 10).tolist()
        else:
            contour_levels = []

        contour_data = ContourData(
            x_variable=x_variable,
            y_variable=y_variable,
            x_values=x_values,
            y_values=y_values,
            z_matrix=z_matrix,
            optimal_point=optimal_point,
            contour_levels=contour_levels,
        )

        # 최적 영역 정보
        optimal_region = None
        if optimal_point:
            optimal_region = {
                "center": optimal_point,
                "x_variable_name": x_info.get("display_name", x_variable),
                "y_variable_name": y_info.get("display_name", y_variable),
                "x_unit": x_info.get("unit", ""),
                "y_unit": y_info.get("unit", ""),
            }

        return contour_data, optimal_region

    def _generate_recommendations(
        self,
        sensitivity_ranking: List[SensitivityRank],
        contour_data: Optional[ContourData],
        optimal_region: Optional[Dict[str, Any]],
    ) -> List[str]:
        """추천 사항 생성"""
        recommendations = []

        # 민감도 기반 추천
        if sensitivity_ranking:
            top_var = sensitivity_ranking[0]
            recommendations.append(
                f"'{top_var.display_name}'이(가) NPV에 가장 큰 영향을 미칩니다 "
                f"(변동폭: {top_var.impact_score:.1f}%). 이 변수를 집중 관리하세요."
            )

            # 음의 영향 변수
            negative_vars = [r for r in sensitivity_ranking if r.high_case_pct < 0]
            if negative_vars:
                var = negative_vars[0]
                recommendations.append(
                    f"'{var.display_name}' 증가 시 NPV가 감소합니다. "
                    f"비용 최적화를 통해 개선하세요."
                )

        # 등고선 기반 추천
        if optimal_region and optimal_region.get("center"):
            center = optimal_region["center"]
            x_name = optimal_region.get("x_variable_name", "X")
            y_name = optimal_region.get("y_variable_name", "Y")
            x_unit = optimal_region.get("x_unit", "")
            y_unit = optimal_region.get("y_unit", "")

            x_val = center["x"]
            y_val = center["y"]

            # 값 포맷팅
            if x_val >= 1e9:
                x_str = f"{x_val/1e9:.1f}B"
            elif x_val >= 1e6:
                x_str = f"{x_val/1e6:.1f}M"
            else:
                x_str = f"{x_val:.1f}"

            if y_val >= 1e9:
                y_str = f"{y_val/1e9:.1f}B"
            elif y_val >= 1e6:
                y_str = f"{y_val/1e6:.1f}M"
            else:
                y_str = f"{y_val:.1f}"

            recommendations.append(
                f"최적 영역: {x_name} = {x_str}{x_unit}, "
                f"{y_name} = {y_str}{y_unit}"
            )

        if not recommendations:
            recommendations.append("민감도 분석을 실행하여 주요 변수를 파악하세요.")

        return recommendations
