"""
Claude API Tool 정의 및 실행 로직 - Bankability 분석 특화
"""
from typing import Dict, Any, List
import numpy as np


# Tool 정의 - Claude API 형식
TOOLS = [
    {
        "name": "calculate_dscr_stress_test",
        "description": "DSCR 스트레스 테스트를 수행합니다. 다양한 시나리오에서 DSCR을 계산하고 Covenant 위반 가능성을 평가합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "base_revenue": {
                    "type": "number",
                    "description": "기준 연간 매출 (억원)"
                },
                "base_opex": {
                    "type": "number",
                    "description": "기준 연간 OPEX (억원)"
                },
                "annual_debt_service": {
                    "type": "number",
                    "description": "연간 원리금 상환액 (억원)"
                },
                "revenue_stress_pct": {
                    "type": "number",
                    "description": "매출 스트레스 비율 (%, 음수는 감소)",
                    "default": -15
                },
                "opex_stress_pct": {
                    "type": "number",
                    "description": "OPEX 스트레스 비율 (%, 양수는 증가)",
                    "default": 10
                }
            },
            "required": ["base_revenue", "base_opex", "annual_debt_service"]
        }
    },
    {
        "name": "calculate_optimal_leverage",
        "description": "최적 부채비율을 계산합니다. 목표 DSCR을 충족하면서 IRR을 최대화하는 부채비율을 찾습니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "total_capex": {
                    "type": "number",
                    "description": "총 CAPEX (억원)"
                },
                "annual_cfads": {
                    "type": "number",
                    "description": "연간 CFADS (부채상환전 현금흐름, 억원)"
                },
                "interest_rate": {
                    "type": "number",
                    "description": "대출 금리 (%)"
                },
                "loan_tenor": {
                    "type": "number",
                    "description": "대출 기간 (년)"
                },
                "target_min_dscr": {
                    "type": "number",
                    "description": "목표 최소 DSCR",
                    "default": 1.30
                }
            },
            "required": ["total_capex", "annual_cfads", "interest_rate", "loan_tenor"]
        }
    },
    {
        "name": "calculate_debt_sizing",
        "description": "대출 규모를 산정합니다. 목표 DSCR을 기준으로 최대 대출 가능 금액을 계산합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "annual_cfads": {
                    "type": "number",
                    "description": "연간 CFADS (억원)"
                },
                "interest_rate": {
                    "type": "number",
                    "description": "대출 금리 (%)"
                },
                "loan_tenor": {
                    "type": "number",
                    "description": "대출 기간 (년)"
                },
                "target_dscr": {
                    "type": "number",
                    "description": "목표 DSCR",
                    "default": 1.35
                },
                "total_capex": {
                    "type": "number",
                    "description": "총 CAPEX (억원, 부채비율 계산용)"
                }
            },
            "required": ["annual_cfads", "interest_rate", "loan_tenor"]
        }
    },
    {
        "name": "calculate_reserve_requirements",
        "description": "필요 적립금(DSRA, MRA)을 계산합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "annual_debt_service": {
                    "type": "number",
                    "description": "연간 원리금 상환액 (억원)"
                },
                "dsra_months": {
                    "type": "number",
                    "description": "DSRA 적립 개월 수",
                    "default": 6
                },
                "annual_major_maintenance": {
                    "type": "number",
                    "description": "연간 주요 정비 비용 (억원)"
                },
                "stack_replacement_cost": {
                    "type": "number",
                    "description": "스택 교체 비용 (억원)"
                },
                "stack_replacement_year": {
                    "type": "number",
                    "description": "스택 교체 예상 연도"
                }
            },
            "required": ["annual_debt_service"]
        }
    },
    {
        "name": "analyze_covenant_headroom",
        "description": "Covenant 여유도를 분석합니다. 현재 지표와 Covenant 기준 간의 버퍼를 계산합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "current_dscr": {
                    "type": "number",
                    "description": "현재 DSCR"
                },
                "lockup_dscr": {
                    "type": "number",
                    "description": "배당제한 DSCR 기준",
                    "default": 1.15
                },
                "default_dscr": {
                    "type": "number",
                    "description": "채무불이행 DSCR 기준",
                    "default": 1.05
                },
                "annual_cfads": {
                    "type": "number",
                    "description": "연간 CFADS (억원)"
                },
                "annual_debt_service": {
                    "type": "number",
                    "description": "연간 원리금 상환액 (억원)"
                }
            },
            "required": ["current_dscr", "annual_cfads", "annual_debt_service"]
        }
    },
    {
        "name": "calculate_llcr_plcr",
        "description": "LLCR(Loan Life Coverage Ratio)과 PLCR(Project Life Coverage Ratio)을 계산합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "yearly_cfads": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "연도별 CFADS 배열 (억원)"
                },
                "total_debt": {
                    "type": "number",
                    "description": "총 대출금 (억원)"
                },
                "loan_tenor": {
                    "type": "number",
                    "description": "대출 기간 (년)"
                },
                "discount_rate": {
                    "type": "number",
                    "description": "할인율 (%)"
                }
            },
            "required": ["yearly_cfads", "total_debt", "loan_tenor", "discount_rate"]
        }
    },
    {
        "name": "calculate_breakeven_price",
        "description": "손익분기 수소 가격 및 전력 가격을 계산합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "current_h2_price": {
                    "type": "number",
                    "description": "현재 수소 판매가 (원/kg)"
                },
                "current_electricity_price": {
                    "type": "number",
                    "description": "현재 전력 가격 (원/kWh)"
                },
                "annual_h2_production": {
                    "type": "number",
                    "description": "연간 수소 생산량 (톤)"
                },
                "annual_electricity_consumption": {
                    "type": "number",
                    "description": "연간 전력 소비량 (MWh)"
                },
                "annual_fixed_cost": {
                    "type": "number",
                    "description": "연간 고정비 (억원, CAPEX 감가+고정 OPEX)"
                },
                "target_dscr": {
                    "type": "number",
                    "description": "목표 DSCR (1.0 = NPV=0)",
                    "default": 1.0
                }
            },
            "required": ["current_h2_price", "current_electricity_price", "annual_h2_production", "annual_fixed_cost"]
        }
    },
    {
        "name": "assess_offtake_structure",
        "description": "오프테이크 계약 구조를 평가하고 Bankability 영향을 분석합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contracted_volume_pct": {
                    "type": "number",
                    "description": "장기계약 물량 비중 (%)"
                },
                "contract_tenor_years": {
                    "type": "number",
                    "description": "계약 기간 (년)"
                },
                "price_escalation_pct": {
                    "type": "number",
                    "description": "연간 가격 상승률 (%)"
                },
                "take_or_pay": {
                    "type": "boolean",
                    "description": "Take-or-Pay 조항 유무"
                },
                "counterparty_rating": {
                    "type": "string",
                    "description": "오프테이커 신용등급 (AAA, AA, A, BBB, BB, B, NR)"
                }
            },
            "required": ["contracted_volume_pct"]
        }
    }
]


def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Tool 실행 함수"""
    tool_functions = {
        "calculate_dscr_stress_test": _calculate_dscr_stress_test,
        "calculate_optimal_leverage": _calculate_optimal_leverage,
        "calculate_debt_sizing": _calculate_debt_sizing,
        "calculate_reserve_requirements": _calculate_reserve_requirements,
        "analyze_covenant_headroom": _analyze_covenant_headroom,
        "calculate_llcr_plcr": _calculate_llcr_plcr,
        "calculate_breakeven_price": _calculate_breakeven_price,
        "assess_offtake_structure": _assess_offtake_structure,
    }

    if tool_name in tool_functions:
        return tool_functions[tool_name](tool_input)
    else:
        return {"error": f"Unknown tool: {tool_name}"}


def _calculate_dscr_stress_test(params: Dict[str, Any]) -> Dict[str, Any]:
    """DSCR 스트레스 테스트"""
    base_revenue = params["base_revenue"]
    base_opex = params["base_opex"]
    debt_service = params["annual_debt_service"]
    revenue_stress = params.get("revenue_stress_pct", -15) / 100
    opex_stress = params.get("opex_stress_pct", 10) / 100

    # Base Case
    base_cfads = base_revenue - base_opex
    base_dscr = base_cfads / debt_service if debt_service > 0 else 0

    # Stress Case
    stressed_revenue = base_revenue * (1 + revenue_stress)
    stressed_opex = base_opex * (1 + opex_stress)
    stressed_cfads = stressed_revenue - stressed_opex
    stressed_dscr = stressed_cfads / debt_service if debt_service > 0 else 0

    # Severe Case (더 극단적)
    severe_revenue = base_revenue * (1 + revenue_stress * 1.5)
    severe_opex = base_opex * (1 + opex_stress * 1.5)
    severe_cfads = severe_revenue - severe_opex
    severe_dscr = severe_cfads / debt_service if debt_service > 0 else 0

    # Covenant 평가
    def evaluate_covenant(dscr):
        if dscr >= 1.30:
            return "양호 (Covenant 충족)"
        elif dscr >= 1.15:
            return "주의 (Lock-up 근접)"
        elif dscr >= 1.05:
            return "위험 (Default 근접)"
        else:
            return "심각 (Default 위반)"

    return {
        "base_case": {
            "dscr": round(base_dscr, 2),
            "cfads_billion": round(base_cfads, 1),
            "assessment": evaluate_covenant(base_dscr)
        },
        "stress_case": {
            "scenario": f"매출 {revenue_stress*100:+.0f}%, OPEX {opex_stress*100:+.0f}%",
            "dscr": round(stressed_dscr, 2),
            "cfads_billion": round(stressed_cfads, 1),
            "dscr_decline": round(base_dscr - stressed_dscr, 2),
            "assessment": evaluate_covenant(stressed_dscr)
        },
        "severe_case": {
            "scenario": f"매출 {revenue_stress*1.5*100:+.0f}%, OPEX {opex_stress*1.5*100:+.0f}%",
            "dscr": round(severe_dscr, 2),
            "cfads_billion": round(severe_cfads, 1),
            "assessment": evaluate_covenant(severe_dscr)
        },
        "stress_resilience": {
            "max_revenue_decline_to_lockup": round((base_dscr - 1.15) / base_dscr * 100, 1) if base_dscr > 0 else 0,
            "max_revenue_decline_to_default": round((base_dscr - 1.05) / base_dscr * 100, 1) if base_dscr > 0 else 0
        }
    }


def _calculate_optimal_leverage(params: Dict[str, Any]) -> Dict[str, Any]:
    """최적 부채비율 계산"""
    total_capex = params["total_capex"]
    annual_cfads = params["annual_cfads"]
    interest_rate = params["interest_rate"] / 100
    loan_tenor = params["loan_tenor"]
    target_dscr = params.get("target_min_dscr", 1.30)

    results = []
    for leverage in range(50, 85, 5):
        debt = total_capex * leverage / 100
        equity = total_capex - debt

        # 원리금 균등상환 계산
        if interest_rate > 0:
            annual_payment = debt * (interest_rate * (1 + interest_rate) ** loan_tenor) / \
                           ((1 + interest_rate) ** loan_tenor - 1)
        else:
            annual_payment = debt / loan_tenor

        dscr = annual_cfads / annual_payment if annual_payment > 0 else 0

        # 간단한 Equity IRR 추정 (연간 배당 = CFADS - 원리금)
        annual_dividend = annual_cfads - annual_payment
        equity_irr = (annual_dividend / equity) * 100 if equity > 0 else 0

        results.append({
            "leverage_pct": leverage,
            "debt_billion": round(debt, 1),
            "equity_billion": round(equity, 1),
            "annual_debt_service_billion": round(annual_payment, 1),
            "dscr": round(dscr, 2),
            "estimated_equity_irr": round(equity_irr, 1),
            "meets_target_dscr": dscr >= target_dscr
        })

    # 최적 레버리지 찾기 (목표 DSCR 충족하면서 가장 높은 레버리지)
    feasible = [r for r in results if r["meets_target_dscr"]]
    optimal = max(feasible, key=lambda x: x["leverage_pct"]) if feasible else None

    return {
        "analysis_results": results,
        "optimal_leverage": optimal,
        "recommendation": f"목표 DSCR {target_dscr} 충족을 위한 최대 부채비율: {optimal['leverage_pct']}%" if optimal else "목표 DSCR 충족 불가, 부채비율 50% 미만 필요"
    }


def _calculate_debt_sizing(params: Dict[str, Any]) -> Dict[str, Any]:
    """대출 규모 산정"""
    annual_cfads = params["annual_cfads"]
    interest_rate = params["interest_rate"] / 100
    loan_tenor = params["loan_tenor"]
    target_dscr = params.get("target_dscr", 1.35)
    total_capex = params.get("total_capex")

    # 목표 DSCR 기준 최대 연간 원리금
    max_annual_payment = annual_cfads / target_dscr

    # 최대 대출금 역산 (원리금 균등상환)
    if interest_rate > 0:
        pv_factor = ((1 + interest_rate) ** loan_tenor - 1) / \
                   (interest_rate * (1 + interest_rate) ** loan_tenor)
    else:
        pv_factor = loan_tenor

    max_debt = max_annual_payment * pv_factor

    result = {
        "target_dscr": target_dscr,
        "annual_cfads_billion": round(annual_cfads, 1),
        "max_annual_debt_service_billion": round(max_annual_payment, 1),
        "max_debt_billion": round(max_debt, 1),
        "debt_sizing_method": "DSCR Sculpting"
    }

    if total_capex:
        max_leverage = (max_debt / total_capex) * 100
        required_equity = total_capex - max_debt
        result["implied_leverage_pct"] = round(max_leverage, 1)
        result["required_equity_billion"] = round(required_equity, 1)
        result["total_capex_billion"] = round(total_capex, 1)

    return result


def _calculate_reserve_requirements(params: Dict[str, Any]) -> Dict[str, Any]:
    """적립금 요구사항 계산"""
    annual_ds = params["annual_debt_service"]
    dsra_months = params.get("dsra_months", 6)
    annual_maintenance = params.get("annual_major_maintenance", 0)
    stack_cost = params.get("stack_replacement_cost", 0)
    stack_year = params.get("stack_replacement_year", 10)

    # DSRA 계산
    dsra = annual_ds * dsra_months / 12

    # MRA 계산 (스택 교체 비용 적립)
    mra_annual = stack_cost / stack_year if stack_year > 0 else 0

    # 총 적립금
    total_reserves = dsra + (mra_annual * 2)  # MRA는 2년치 선적립 가정

    return {
        "dsra": {
            "months_coverage": dsra_months,
            "amount_billion": round(dsra, 1),
            "purpose": "원리금 상환 보장"
        },
        "mra": {
            "annual_contribution_billion": round(mra_annual, 2),
            "stack_replacement_provision_billion": round(stack_cost, 1),
            "target_year": stack_year,
            "purpose": "스택 교체 비용 적립"
        },
        "total_initial_reserves_billion": round(total_reserves, 1),
        "impact_on_equity": f"자기자본 대비 약 {round(total_reserves / 100 * 100, 1)}억원 추가 필요",
        "recommendation": "DSRA는 Financial Close 시 전액 적립, MRA는 운영 개시 후 연간 적립"
    }


def _analyze_covenant_headroom(params: Dict[str, Any]) -> Dict[str, Any]:
    """Covenant 여유도 분석"""
    current_dscr = params["current_dscr"]
    lockup_dscr = params.get("lockup_dscr", 1.15)
    default_dscr = params.get("default_dscr", 1.05)
    annual_cfads = params["annual_cfads"]
    annual_ds = params["annual_debt_service"]

    # 여유도 계산
    lockup_headroom = current_dscr - lockup_dscr
    default_headroom = current_dscr - default_dscr

    # CFADS 기준 여유도 (억원)
    lockup_cfads_buffer = annual_cfads - (lockup_dscr * annual_ds)
    default_cfads_buffer = annual_cfads - (default_dscr * annual_ds)

    # 수익 감소 허용치
    revenue_decline_to_lockup = (lockup_cfads_buffer / annual_cfads) * 100 if annual_cfads > 0 else 0
    revenue_decline_to_default = (default_cfads_buffer / annual_cfads) * 100 if annual_cfads > 0 else 0

    def assess_headroom(headroom):
        if headroom >= 0.35:
            return "매우 양호 - Investment Grade"
        elif headroom >= 0.20:
            return "양호 - 적정 버퍼"
        elif headroom >= 0.10:
            return "주의 - 모니터링 필요"
        else:
            return "위험 - 즉시 조치 필요"

    return {
        "current_dscr": round(current_dscr, 2),
        "covenant_levels": {
            "lockup": lockup_dscr,
            "default": default_dscr
        },
        "headroom_analysis": {
            "to_lockup": {
                "dscr_buffer": round(lockup_headroom, 2),
                "cfads_buffer_billion": round(lockup_cfads_buffer, 1),
                "max_revenue_decline_pct": round(revenue_decline_to_lockup, 1)
            },
            "to_default": {
                "dscr_buffer": round(default_headroom, 2),
                "cfads_buffer_billion": round(default_cfads_buffer, 1),
                "max_revenue_decline_pct": round(revenue_decline_to_default, 1)
            }
        },
        "overall_assessment": assess_headroom(lockup_headroom),
        "recommendation": f"현재 DSCR {current_dscr:.2f}로 Lock-up 대비 {lockup_headroom:.2f} 여유. " +
                         f"매출 {revenue_decline_to_lockup:.1f}% 감소 시 배당 제한 발생"
    }


def _calculate_llcr_plcr(params: Dict[str, Any]) -> Dict[str, Any]:
    """LLCR/PLCR 계산"""
    yearly_cfads = params["yearly_cfads"]
    total_debt = params["total_debt"]
    loan_tenor = int(params["loan_tenor"])
    discount_rate = params["discount_rate"] / 100

    # NPV 계산
    loan_period_cfads = yearly_cfads[:loan_tenor] if len(yearly_cfads) >= loan_tenor else yearly_cfads
    project_cfads = yearly_cfads

    def calc_npv(cashflows, rate):
        return sum(cf / (1 + rate) ** (i + 1) for i, cf in enumerate(cashflows))

    npv_loan_period = calc_npv(loan_period_cfads, discount_rate)
    npv_project = calc_npv(project_cfads, discount_rate)

    llcr = npv_loan_period / total_debt if total_debt > 0 else 0
    plcr = npv_project / total_debt if total_debt > 0 else 0

    def assess_coverage(ratio, threshold, name):
        if ratio >= threshold * 1.15:
            return f"{name} 매우 양호"
        elif ratio >= threshold:
            return f"{name} 충족"
        else:
            return f"{name} 미달 - 구조 조정 필요"

    return {
        "llcr": {
            "value": round(llcr, 2),
            "threshold": 1.40,
            "assessment": assess_coverage(llcr, 1.40, "LLCR"),
            "loan_period_years": loan_tenor,
            "npv_cfads_billion": round(npv_loan_period, 1)
        },
        "plcr": {
            "value": round(plcr, 2),
            "threshold": 1.50,
            "assessment": assess_coverage(plcr, 1.50, "PLCR"),
            "project_years": len(project_cfads),
            "npv_cfads_billion": round(npv_project, 1)
        },
        "total_debt_billion": round(total_debt, 1),
        "interpretation": "LLCR은 대출 기간 중 상환 능력, PLCR은 프로젝트 전체 가치를 나타냄"
    }


def _calculate_breakeven_price(params: Dict[str, Any]) -> Dict[str, Any]:
    """손익분기 가격 계산"""
    h2_price = params["current_h2_price"]
    elec_price = params.get("current_electricity_price", 100)
    h2_production = params["annual_h2_production"]  # 톤
    elec_consumption = params.get("annual_electricity_consumption", h2_production * 50000)  # MWh 추정
    fixed_cost = params["annual_fixed_cost"]  # 억원
    target_dscr = params.get("target_dscr", 1.0)

    # 현재 매출/비용 (억원)
    current_h2_revenue = h2_price * h2_production * 1000 / 100000000  # 원 → 억원
    current_elec_cost = elec_price * elec_consumption * 1000 / 100000000

    # 손익분기 수소가격 (고정비 + 전력비 = 수소매출)
    # h2_price_be * production = fixed_cost + elec_cost
    breakeven_h2_price = (fixed_cost * 100000000 + current_elec_cost * 100000000) / (h2_production * 1000)

    # 손익분기 전력가격 (수소매출 - 고정비 = 전력비)
    # elec_price_be * consumption = h2_revenue - fixed_cost
    max_elec_cost = current_h2_revenue - fixed_cost
    breakeven_elec_price = max_elec_cost * 100000000 / (elec_consumption * 1000) if elec_consumption > 0 else 0

    h2_margin = (h2_price - breakeven_h2_price) / h2_price * 100 if h2_price > 0 else 0
    elec_margin = (breakeven_elec_price - elec_price) / elec_price * 100 if elec_price > 0 else 0

    return {
        "current_prices": {
            "h2_price_krw_kg": h2_price,
            "electricity_price_krw_kwh": elec_price
        },
        "breakeven_h2_price": {
            "value_krw_kg": round(breakeven_h2_price, 0),
            "margin_to_current_pct": round(h2_margin, 1),
            "interpretation": f"수소가격이 {round(breakeven_h2_price)}원/kg 이하로 떨어지면 손실"
        },
        "breakeven_electricity_price": {
            "value_krw_kwh": round(breakeven_elec_price, 1),
            "margin_to_current_pct": round(elec_margin, 1),
            "interpretation": f"전력가격이 {round(breakeven_elec_price)}원/kWh 이상으로 오르면 손실"
        },
        "sensitivity": {
            "h2_price_1pct_impact_billion": round(current_h2_revenue * 0.01, 2),
            "elec_price_1pct_impact_billion": round(current_elec_cost * 0.01, 2)
        }
    }


def _assess_offtake_structure(params: Dict[str, Any]) -> Dict[str, Any]:
    """오프테이크 구조 평가"""
    contracted_pct = params["contracted_volume_pct"]
    contract_years = params.get("contract_tenor_years", 0)
    escalation = params.get("price_escalation_pct", 0)
    take_or_pay = params.get("take_or_pay", False)
    rating = params.get("counterparty_rating", "NR")

    # 점수 계산 (100점 만점)
    score = 0

    # 계약 물량 비중 (최대 40점)
    if contracted_pct >= 80:
        score += 40
    elif contracted_pct >= 60:
        score += 30
    elif contracted_pct >= 40:
        score += 20
    else:
        score += 10

    # 계약 기간 (최대 25점)
    if contract_years >= 15:
        score += 25
    elif contract_years >= 10:
        score += 20
    elif contract_years >= 5:
        score += 10

    # Take-or-Pay (15점)
    if take_or_pay:
        score += 15

    # 가격 상승 조항 (10점)
    if escalation > 0:
        score += 10

    # 신용등급 (10점)
    rating_scores = {"AAA": 10, "AA": 9, "A": 8, "BBB": 6, "BB": 4, "B": 2, "NR": 0}
    score += rating_scores.get(rating, 0)

    # 등급 판정
    if score >= 85:
        grade = "A"
        assessment = "우수 - Investment Grade 오프테이크 구조"
    elif score >= 70:
        grade = "B+"
        assessment = "양호 - 일부 보완 권장"
    elif score >= 55:
        grade = "B"
        assessment = "보통 - 구조적 보완 필요"
    else:
        grade = "C"
        assessment = "취약 - 상당한 보완 필요"

    improvements = []
    if contracted_pct < 70:
        improvements.append(f"장기계약 비중을 {contracted_pct}% → 70% 이상으로 확대")
    if contract_years < 10:
        improvements.append("계약 기간을 10년 이상으로 연장")
    if not take_or_pay:
        improvements.append("Take-or-Pay 조항 추가")
    if escalation <= 0:
        improvements.append("물가연동 조항 추가")
    if rating in ["BB", "B", "NR"]:
        improvements.append("신용등급 BBB- 이상 오프테이커 확보 또는 신용보강")

    return {
        "score": score,
        "max_score": 100,
        "grade": grade,
        "assessment": assessment,
        "current_structure": {
            "contracted_volume_pct": contracted_pct,
            "contract_tenor_years": contract_years,
            "price_escalation": escalation > 0,
            "take_or_pay": take_or_pay,
            "counterparty_rating": rating
        },
        "improvements": improvements,
        "bankability_impact": f"현재 구조로 대출금리 스프레드 예상: +{max(400 - score * 2, 200)}bp"
    }
