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
    renewable = input_config.renewable

    # 전력 가격 생성 (8760개)
    base_electricity_prices = _generate_electricity_prices(
        cost.ppa_price or 100.0, market.electricity_price_scenario
    )

    # 재생에너지 출력 프로파일 생성 (옵션)
    renewable_output = None
    if renewable.enabled and cost.electricity_source == "RENEWABLE":
        renewable_output = _generate_renewable_profile(
            source_type=renewable.source_type,
            capacity_mw=renewable.capacity_mw,
            capacity_factor=renewable.capacity_factor,
        )
        # 재생에너지 연계 시 전력 가격은 0 (자가 발전)
        base_electricity_prices = np.zeros(8760)

    # 가격 임계값 설정 (경제성 있는 가격 수준)
    # 재생에너지 사용 시 가격 임계값을 매우 높게 설정하여 항상 가동
    if renewable.enabled and cost.electricity_source == "RENEWABLE":
        price_threshold = float('inf')
    else:
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
        renewable_output=renewable_output,
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


def _generate_renewable_profile(
    source_type: str,
    capacity_mw: float,
    capacity_factor: float,
) -> np.ndarray:
    """
    재생에너지 출력 프로파일 생성 (8760시간)

    Args:
        source_type: 재생에너지 유형 ("solar", "wind", "hybrid")
        capacity_mw: 설비 용량 (MW)
        capacity_factor: 연간 설비이용률 (%)

    Returns:
        np.ndarray: 시간별 출력 (MW)

    Note:
        한국 기준 일반적인 설비이용률:
        - 태양광: 13~17% (평균 15%)
        - 육상풍력: 20~28% (평균 24%)
        - 해상풍력: 30~40% (평균 35%)
    """
    hours = 8760
    rng = np.random.RandomState(123)  # 재현성을 위한 고정 시드

    hour_of_day = np.arange(hours) % 24
    day_of_year = np.arange(hours) // 24

    if source_type == "solar":
        # === 태양광 프로파일 ===
        # 일출/일몰 시간은 계절에 따라 변동 (한국 기준 단순화)
        # 여름: 5시~20시, 겨울: 7시~18시, 봄가을: 6시~19시

        output = np.zeros(hours)

        for h in range(hours):
            hod = hour_of_day[h]
            doy = day_of_year[h]

            # 계절별 일조 시간 결정
            if 91 <= doy <= 273:  # 4월~9월 (여름철)
                sunrise, sunset = 5, 20
                peak_hour = 12.5
                seasonal_factor = 1.2  # 여름 일사량 증가
            elif doy <= 59 or doy >= 305:  # 12월~2월 (겨울철)
                sunrise, sunset = 7, 18
                peak_hour = 12.5
                seasonal_factor = 0.7  # 겨울 일사량 감소
            else:  # 봄/가을
                sunrise, sunset = 6, 19
                peak_hour = 12.5
                seasonal_factor = 1.0

            if sunrise <= hod < sunset:
                # 정오에 피크, 일출/일몰에 0인 포물선 형태
                hours_from_peak = abs(hod - peak_hour)
                max_hours_from_peak = (sunset - sunrise) / 2
                # 정규화된 출력 (0~1)
                normalized = max(0, 1 - (hours_from_peak / max_hours_from_peak) ** 2)
                output[h] = normalized * seasonal_factor
            else:
                output[h] = 0

        # 구름/날씨 변동 추가 (일별)
        daily_weather = rng.beta(5, 2, 365)  # 대체로 맑은 날이 많음
        for d in range(365):
            start_h = d * 24
            end_h = start_h + 24
            output[start_h:end_h] *= daily_weather[d]

        # 설비이용률에 맞게 스케일링
        current_cf = np.mean(output) * 100
        if current_cf > 0:
            scale_factor = capacity_factor / current_cf
            output *= scale_factor

        output = output * capacity_mw

    elif source_type == "wind":
        # === 풍력 프로파일 ===
        # 풍력은 태양광과 달리 24시간 발전 가능하나 변동성이 큼

        # 기본 풍속 패턴 (Weibull 분포 기반)
        # 한국은 겨울철/봄철 풍속이 강하고, 여름철 약함
        base_output = np.zeros(hours)

        for d in range(365):
            doy = d
            # 계절별 풍속 계수
            if doy <= 90 or doy >= 305:  # 겨울/초봄
                seasonal_wind = 1.3
            elif 152 <= doy <= 243:  # 여름
                seasonal_wind = 0.7
            else:  # 봄/가을
                seasonal_wind = 1.0

            # 일별 평균 풍속 변동
            daily_wind = rng.weibull(2.0) * seasonal_wind

            # 시간별 변동 (풍속은 밤~새벽에 약간 더 강한 경향)
            for h in range(24):
                hour_idx = d * 24 + h
                if h >= 22 or h <= 5:  # 야간
                    hourly_factor = 1.1
                elif 10 <= h <= 16:  # 주간
                    hourly_factor = 0.9
                else:
                    hourly_factor = 1.0

                # 랜덤 변동 추가
                random_factor = rng.normal(1.0, 0.2)
                random_factor = np.clip(random_factor, 0.3, 1.8)

                base_output[hour_idx] = daily_wind * hourly_factor * random_factor

        # 0~1 범위로 정규화
        if np.max(base_output) > 0:
            output = base_output / np.max(base_output)
        else:
            output = base_output

        # 설비이용률에 맞게 스케일링
        current_cf = np.mean(output) * 100
        if current_cf > 0:
            scale_factor = capacity_factor / current_cf
            output *= scale_factor

        # 최대 출력 제한 (1.0 = 정격 용량)
        output = np.clip(output, 0, 1.0)
        output = output * capacity_mw

    else:  # hybrid
        # === 태양광 + 풍력 복합 ===
        # 각각 50%씩 용량 배분하여 합산
        solar_output = _generate_renewable_profile(
            "solar", capacity_mw * 0.5, capacity_factor
        )
        wind_output = _generate_renewable_profile(
            "wind", capacity_mw * 0.5, capacity_factor
        )
        output = solar_output + wind_output

    return output


def _get_season(day_of_year: int) -> str:
    """
    날짜로부터 계절 반환 (한국 전기요금 기준)

    한국전력 계절 구분:
    - 여름: 7월 1일 ~ 8월 31일 (182~243일)
    - 겨울: 12월 1일 ~ 2월 28일 (335~365, 0~59일)
    - 봄/가을: 나머지 (3월 1일 ~ 6월 30일, 9월 1일 ~ 11월 30일)
    """
    if 182 <= day_of_year <= 243:  # 7월~8월
        return "summer"
    elif day_of_year >= 335 or day_of_year <= 59:  # 12월~2월
        return "winter"
    else:
        return "spring_fall"


def _get_load_type(hour_of_day: int, season: str) -> str:
    """
    시간대와 계절에 따른 부하 유형 반환 (한국 산업용 전기요금 기준)

    한국전력 산업용(을) 고압A 시간대별 구분 (2024-2025):

    여름철 (7~8월):
    - 최대부하: 10:00~12:00, 13:00~17:00
    - 중간부하: 09:00~10:00, 12:00~13:00, 17:00~23:00
    - 경부하: 23:00~09:00

    봄/가을철 (3~6월, 9~11월):
    - 최대부하: 10:00~12:00, 13:00~17:00
    - 중간부하: 09:00~10:00, 12:00~13:00, 17:00~23:00
    - 경부하: 23:00~09:00

    겨울철 (12~2월):
    - 최대부하: 10:00~12:00, 17:00~20:00, 20:00~22:00
    - 중간부하: 09:00~10:00, 12:00~17:00, 22:00~23:00
    - 경부하: 23:00~09:00
    """
    if season == "summer" or season == "spring_fall":
        # 여름/봄가을 시간대
        if (10 <= hour_of_day < 12) or (13 <= hour_of_day < 17):
            return "peak"  # 최대부하
        elif (9 <= hour_of_day < 10) or (12 <= hour_of_day < 13) or (17 <= hour_of_day < 23):
            return "mid"  # 중간부하
        else:  # 23:00~09:00
            return "off_peak"  # 경부하
    else:  # winter
        # 겨울 시간대
        if (10 <= hour_of_day < 12) or (17 <= hour_of_day < 20) or (20 <= hour_of_day < 22):
            return "peak"  # 최대부하
        elif (9 <= hour_of_day < 10) or (12 <= hour_of_day < 17) or (22 <= hour_of_day < 23):
            return "mid"  # 중간부하
        else:  # 23:00~09:00
            return "off_peak"  # 경부하


def _generate_electricity_prices(base_price: float, scenario: str) -> np.ndarray:
    """
    전력 가격 데이터 생성 - 한국 산업용 전기요금 계절별/시간대별 구조 반영

    한국전력 산업용(을) 고압A 요금 기준 (2024-2025):
    - 기본요금 별도, 여기서는 전력량요금 기준 상대 비율 적용

    요금 비율 (경부하 기준 = 1.0):
    - 여름 최대부하: 약 2.3배
    - 여름 중간부하: 약 1.4배
    - 봄가을 최대부하: 약 1.8배
    - 봄가을 중간부하: 약 1.2배
    - 겨울 최대부하: 약 2.1배
    - 겨울 중간부하: 약 1.5배
    - 경부하 (전 계절): 1.0배
    """
    # 계절별/부하별 요금 배율 (경부하 기준)
    RATE_MULTIPLIERS = {
        "summer": {"peak": 2.3, "mid": 1.4, "off_peak": 1.0},
        "spring_fall": {"peak": 1.8, "mid": 1.2, "off_peak": 1.0},
        "winter": {"peak": 2.1, "mid": 1.5, "off_peak": 1.0},
    }

    # 시나리오별 전체 가격 조정 계수
    SCENARIO_MULTIPLIERS = {
        "base": 1.0,
        "high": 1.3,
        "low": 0.8,
        "volatile": 1.0,  # 변동성은 별도 처리
        "decreasing": 0.9,
    }

    scenario_mult = SCENARIO_MULTIPLIERS.get(scenario, 1.0)

    # === 벡터 연산으로 최적화 ===
    hours = np.arange(8760)
    hour_of_day = hours % 24
    day_of_year = hours // 24

    # 요일 계산 (0=월요일 가정, 실제 시작 요일은 연도마다 다르나 단순화)
    day_of_week = day_of_year % 7
    is_weekend = day_of_week >= 5

    # 계절 배열 생성
    seasons = np.where(
        (day_of_year >= 182) & (day_of_year <= 243), "summer",
        np.where(
            (day_of_year >= 335) | (day_of_year <= 59), "winter",
            "spring_fall"
        )
    )

    # 배율 배열 초기화
    multipliers = np.ones(8760)

    for season in ["summer", "spring_fall", "winter"]:
        season_mask = (seasons == season)

        for load_type in ["peak", "mid", "off_peak"]:
            # 해당 계절의 각 시간대 마스크 생성
            if season in ["summer", "spring_fall"]:
                if load_type == "peak":
                    time_mask = ((hour_of_day >= 10) & (hour_of_day < 12)) | \
                                ((hour_of_day >= 13) & (hour_of_day < 17))
                elif load_type == "mid":
                    time_mask = ((hour_of_day >= 9) & (hour_of_day < 10)) | \
                                ((hour_of_day >= 12) & (hour_of_day < 13)) | \
                                ((hour_of_day >= 17) & (hour_of_day < 23))
                else:  # off_peak
                    time_mask = (hour_of_day >= 23) | (hour_of_day < 9)
            else:  # winter
                if load_type == "peak":
                    time_mask = ((hour_of_day >= 10) & (hour_of_day < 12)) | \
                                ((hour_of_day >= 17) & (hour_of_day < 22))
                elif load_type == "mid":
                    time_mask = ((hour_of_day >= 9) & (hour_of_day < 10)) | \
                                ((hour_of_day >= 12) & (hour_of_day < 17)) | \
                                ((hour_of_day >= 22) & (hour_of_day < 23))
                else:  # off_peak
                    time_mask = (hour_of_day >= 23) | (hour_of_day < 9)

            combined_mask = season_mask & time_mask
            multipliers[combined_mask] = RATE_MULTIPLIERS[season][load_type]

    # 주말/공휴일은 전 시간대 경부하
    multipliers[is_weekend] = 1.0

    # 시나리오 적용
    multipliers *= scenario_mult

    # volatile 시나리오: 랜덤 변동 추가
    if scenario == "volatile":
        rng = np.random.RandomState(42)
        volatility = rng.normal(1.0, 0.15, 8760)
        volatility = np.clip(volatility, 0.7, 1.5)
        multipliers *= volatility

    # decreasing 시나리오: 연중 점진적 하락 (연말에 추가 10% 하락)
    if scenario == "decreasing":
        decline_factor = 1 - (day_of_year / 365) * 0.1
        multipliers *= decline_factor

    prices = base_price * multipliers

    return prices
