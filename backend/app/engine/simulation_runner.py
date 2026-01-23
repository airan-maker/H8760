"""
통합 시뮬레이션 실행기

모든 엔진을 조합하여 전체 시뮬레이션을 실행합니다.
"""
import numpy as np
from typing import List

from app.schemas.simulation import SimulationInput
from app.schemas.result import (
    SimulationResult,
    KPIs,
    PercentileValue,
    DSCRMetrics,
    HourlyData,
    Distributions,
    HistogramBin,
    SensitivityItem,
    RiskWaterfallItem,
    YearlyCashflow,
)
from app.engine.energy_8760 import Energy8760Config, calculate_8760, aggregate_yearly_results
from app.engine.monte_carlo import MonteCarloConfig, run_monte_carlo, create_histogram
from app.engine.financial import FinancialConfig, run_financial_analysis
from app.engine.sensitivity import (
    generate_default_sensitivity_variables,
    run_sensitivity_analysis,
    calculate_risk_waterfall,
)


def run_full_simulation(
    simulation_id: str,
    input_config: SimulationInput,
) -> SimulationResult:
    """
    전체 시뮬레이션 실행

    Args:
        simulation_id: 시뮬레이션 ID
        input_config: 시뮬레이션 입력 설정

    Returns:
        SimulationResult: 시뮬레이션 결과
    """
    # 설정 추출
    equip = input_config.equipment
    cost = input_config.cost
    market = input_config.market
    financial = input_config.financial
    risk = input_config.risk_weights
    mc = input_config.monte_carlo

    # 전력 가격 생성 (8760개)
    base_electricity_prices = _generate_electricity_prices(
        cost.ppa_price or 100.0, market.electricity_price_scenario
    )

    # 가격 임계값 설정 (경제성 있는 가격 수준)
    price_threshold = cost.ppa_price * 1.2 if cost.ppa_price else 120.0

    # 8760 엔진 설정
    energy_config = Energy8760Config(
        electrolyzer_capacity_mw=equip.electrolyzer_capacity,
        electrolyzer_efficiency=equip.electrolyzer_efficiency,
        specific_consumption=equip.specific_consumption,
        degradation_rate=equip.degradation_rate,
        annual_availability=equip.annual_availability,
        price_threshold=price_threshold,
    )

    # 기준 8760 계산
    base_result = calculate_8760(
        config=energy_config,
        electricity_prices=base_electricity_prices,
        h2_price=market.h2_price,
        year=1,
    )

    # 다년간 결과 집계
    yearly_data = aggregate_yearly_results(
        config=energy_config,
        electricity_prices=base_electricity_prices,
        h2_price=market.h2_price,
        project_lifetime=financial.project_lifetime,
        h2_price_escalation=market.h2_price_escalation,
    )

    yearly_revenues = [y["total_revenue"] for y in yearly_data["yearly_results"]]
    yearly_elec_costs = [y["total_electricity_cost"] for y in yearly_data["yearly_results"]]
    yearly_h2_prod = [y["h2_production_kg"] for y in yearly_data["yearly_results"]]

    # 재무 분석 설정
    financial_config = FinancialConfig(
        capex=cost.capex,
        opex_ratio=cost.opex_ratio,
        stack_replacement_cost=cost.stack_replacement_cost,
        stack_lifetime_hours=equip.stack_lifetime,
        discount_rate=financial.discount_rate,
        project_lifetime=financial.project_lifetime,
        debt_ratio=financial.debt_ratio,
        interest_rate=financial.interest_rate,
        loan_tenor=financial.loan_tenor,
    )

    # 재무 분석 실행
    fin_result = run_financial_analysis(
        config=financial_config,
        yearly_revenues=yearly_revenues,
        yearly_electricity_costs=yearly_elec_costs,
        yearly_h2_production=yearly_h2_prod,
    )

    # 몬테카를로 시뮬레이션
    mc_config = MonteCarloConfig(
        iterations=mc.iterations,
        weather_sigma=mc.weather_sigma,
        price_sigma=mc.price_sigma,
    )

    annual_opex = cost.capex * (cost.opex_ratio / 100)

    mc_result = run_monte_carlo(
        energy_config=energy_config,
        mc_config=mc_config,
        base_electricity_prices=base_electricity_prices,
        base_h2_price=market.h2_price,
        capex=cost.capex,
        opex_annual=annual_opex,
        discount_rate=financial.discount_rate,
        project_lifetime=financial.project_lifetime,
        weather_variability=risk.weather_variability,
        price_volatility=risk.price_volatility,
    )

    # 민감도 분석
    sensitivity_vars = generate_default_sensitivity_variables(
        electricity_price=cost.ppa_price or 100.0,
        h2_price=market.h2_price,
        availability=equip.annual_availability,
        efficiency=equip.electrolyzer_efficiency,
        capex=cost.capex,
    )

    def npv_calculator(var_name: str, var_value: float) -> float:
        """민감도 분석용 NPV 계산기"""
        modified_config = energy_config
        modified_h2_price = market.h2_price
        modified_prices = base_electricity_prices

        if var_name == "electricity_price":
            modified_prices = base_electricity_prices * (var_value / (cost.ppa_price or 100.0))
        elif var_name == "h2_price":
            modified_h2_price = var_value
        elif var_name == "availability":
            modified_config = Energy8760Config(
                electrolyzer_capacity_mw=energy_config.electrolyzer_capacity_mw,
                electrolyzer_efficiency=energy_config.electrolyzer_efficiency,
                specific_consumption=energy_config.specific_consumption,
                degradation_rate=energy_config.degradation_rate,
                annual_availability=var_value,
                price_threshold=energy_config.price_threshold,
            )
        elif var_name == "efficiency":
            modified_config = Energy8760Config(
                electrolyzer_capacity_mw=energy_config.electrolyzer_capacity_mw,
                electrolyzer_efficiency=var_value,
                specific_consumption=energy_config.specific_consumption,
                degradation_rate=energy_config.degradation_rate,
                annual_availability=energy_config.annual_availability,
                price_threshold=energy_config.price_threshold,
            )

        # 간단한 NPV 계산
        result = calculate_8760(
            config=modified_config,
            electricity_prices=modified_prices,
            h2_price=modified_h2_price,
            year=1,
        )
        annual_net = np.sum(result.hourly_revenue) - np.sum(result.hourly_cost) - annual_opex

        if var_name == "capex":
            modified_capex = var_value
        else:
            modified_capex = cost.capex

        npv = -modified_capex
        for year in range(1, financial.project_lifetime + 1):
            npv += annual_net / ((1 + financial.discount_rate / 100) ** year)
        return npv

    sensitivity_results = run_sensitivity_analysis(
        base_npv=fin_result.npv,
        variables=sensitivity_vars,
        npv_calculator=npv_calculator,
    )

    # 리스크 폭포수
    risk_factors = [
        {"name": "기상 변동성", "impact": mc_result.npv_p50 - fin_result.npv},
        {"name": "전력가격 변동성", "impact": (mc_result.npv_p90 - mc_result.npv_p50) * 0.5},
        {"name": "효율 저하", "impact": -fin_result.npv * 0.03},
    ]
    waterfall = calculate_risk_waterfall(fin_result.npv, risk_factors)

    # 히스토그램 생성
    npv_histogram = create_histogram(mc_result.npv_distribution)
    revenue_histogram = create_histogram(mc_result.revenue_distribution)

    # 결과 조합
    return SimulationResult(
        simulation_id=simulation_id,
        status="completed",
        kpis=KPIs(
            npv=PercentileValue(
                p50=mc_result.npv_p50,
                p90=mc_result.npv_p90,
                p99=mc_result.npv_p99,
            ),
            irr=PercentileValue(
                p50=mc_result.irr_p50,
                p90=mc_result.irr_p90,
                p99=mc_result.irr_p99,
            ),
            dscr=DSCRMetrics(min=fin_result.dscr_min, avg=fin_result.dscr_avg),
            payback_period=fin_result.payback_period,
            var_95=mc_result.var_95,
            annual_h2_production=PercentileValue(
                p50=float(np.percentile(mc_result.h2_production_distribution, 50)),
                p90=float(np.percentile(mc_result.h2_production_distribution, 10)),
                p99=float(np.percentile(mc_result.h2_production_distribution, 1)),
            ),
            lcoh=fin_result.lcoh,
        ),
        hourly_data=HourlyData(
            production=base_result.h2_production.tolist(),
            revenue=base_result.hourly_revenue.tolist(),
            electricity_cost=base_result.hourly_cost.tolist(),
            operating_hours=base_result.operating_hours.tolist(),
        ),
        distributions=Distributions(
            npv_histogram=[HistogramBin(bin=b, count=c) for b, c in npv_histogram],
            revenue_histogram=[HistogramBin(bin=b, count=c) for b, c in revenue_histogram],
        ),
        sensitivity=[
            SensitivityItem(
                variable=s.variable,
                base_case=s.base_case,
                low_case=s.low_case,
                high_case=s.high_case,
                low_change_pct=s.low_change_pct,
                high_change_pct=s.high_change_pct,
            )
            for s in sensitivity_results
        ],
        risk_waterfall=[
            RiskWaterfallItem(factor=w["factor"], impact=w.get("cumulative", w["impact"]))
            for w in waterfall
        ],
        yearly_cashflow=[
            YearlyCashflow(
                year=cf.year,
                revenue=cf.revenue,
                opex=cf.opex,
                debt_service=cf.debt_service,
                net_cashflow=cf.net_cashflow,
                cumulative_cashflow=cf.cumulative_cashflow,
            )
            for cf in fin_result.yearly_cashflows
        ],
    )


def _generate_electricity_prices(base_price: float, scenario: str) -> np.ndarray:
    """전력 가격 데이터 생성"""
    prices = np.zeros(8760)

    for hour in range(8760):
        hour_of_day = hour % 24

        # 시간대별 가격 변동
        if 9 <= hour_of_day <= 12 or 17 <= hour_of_day <= 21:
            multiplier = 1.5  # 피크
        elif 23 <= hour_of_day or hour_of_day <= 6:
            multiplier = 0.7  # 경부하
        else:
            multiplier = 1.0  # 중간부하

        # 시나리오별 조정
        if scenario == "high":
            multiplier *= 1.3
        elif scenario == "low":
            multiplier *= 0.8

        prices[hour] = base_price * multiplier

    return prices
