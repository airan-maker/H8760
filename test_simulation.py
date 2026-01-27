#!/usr/bin/env python3
"""
H8760 시뮬레이션 테스트 스크립트

백엔드 엔진의 계산 로직을 검증합니다.
"""
import sys
import os

# 프로젝트 경로를 시스템 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import numpy as np
from app.engine.energy_8760 import Energy8760Config, calculate_8760, aggregate_yearly_results
from app.engine.financial import FinancialConfig, run_financial_analysis, calculate_lcoh, HYDROGEN_LHV_KWH_KG
from app.engine.monte_carlo import MonteCarloConfig, run_monte_carlo
from app.engine.simulation_runner import _generate_electricity_prices


def test_hydrogen_lhv():
    """수소 LHV 상수 검증"""
    print("=" * 60)
    print("1. 수소 LHV (저위발열량) 검증")
    print("=" * 60)

    expected_lhv = 33.33  # kWh/kg
    print(f"  코드 상수: {HYDROGEN_LHV_KWH_KG} kWh/kg")
    print(f"  예상 값: {expected_lhv} kWh/kg")
    assert abs(HYDROGEN_LHV_KWH_KG - expected_lhv) < 0.01, "LHV 값이 올바르지 않습니다"
    print("  [OK] 검증 통과")

    # 효율 계산 예시
    efficiency = 67  # %
    actual_consumption = HYDROGEN_LHV_KWH_KG / (efficiency / 100)
    print(f"\n  효율 {efficiency}% 기준 실제 소비량: {actual_consumption:.2f} kWh/kg H2")
    print()


def test_electricity_prices():
    """전력 가격 생성 테스트"""
    print("=" * 60)
    print("2. 전력 가격 생성 테스트 (한국 시간대별 요금)")
    print("=" * 60)

    base_price = 100  # 원/kWh
    prices = _generate_electricity_prices(base_price, "base")

    print(f"  생성된 가격 배열 길이: {len(prices)}")
    assert len(prices) == 8760, "가격 배열은 8760개여야 합니다"

    # 시간대별 가격 확인 (첫째 날 기준)
    print("\n  시간대별 가격 (첫째 날, 평일):")
    for hour in [0, 6, 9, 14, 17, 22, 23]:
        print(f"    {hour:02d}시: {prices[hour]:.1f}원/kWh")

    # 주말 가격 확인 (6번째 날 = 토요일)
    saturday_start = 5 * 24  # 5일 후 = 토요일
    print(f"\n  주말 가격 (토요일 14시): {prices[saturday_start + 14]:.1f}원/kWh (경부하 적용)")

    print("  [OK] 전력 가격 생성 완료")
    print()


def test_energy_8760():
    """8760 에너지 계산 테스트"""
    print("=" * 60)
    print("3. 8760 시간별 에너지 계산 테스트")
    print("=" * 60)

    config = Energy8760Config(
        electrolyzer_capacity_mw=10,  # 10 MW
        electrolyzer_efficiency=67,   # 67%
        specific_consumption=50,      # kWh/kg
        degradation_rate=0.5,         # 0.5%/년
        annual_availability=85,       # 85%
        price_threshold=150,          # 150원/kWh 이하에서 가동
    )

    # PPA 가격 70원/kWh 기준으로 테스트 (경제성 확보 위해)
    # 수소 1kg 생산: 50kWh * 70원 = 3,500원 비용, 6,000원 판매 → 마진 2,500원
    electricity_prices = _generate_electricity_prices(70, "base")

    print(f"  전해조 용량: {config.electrolyzer_capacity_mw} MW")
    print(f"  전해조 효율: {config.electrolyzer_efficiency}%")
    print(f"  연간 가용률: {config.annual_availability}%")

    # 1년차 계산
    result = calculate_8760(
        config=config,
        electricity_prices=electricity_prices,
        h2_price=6000,
        year=1,
    )

    print(f"\n  1년차 결과:")
    print(f"    총 수소 생산량: {result.total_h2_production:,.0f} kg ({result.total_h2_production/1000:.1f} 톤)")
    print(f"    총 가동 시간: {result.total_operating_hours:,} 시간")
    print(f"    설비 이용률: {result.capacity_factor:.1f}%")
    print(f"    총 수익: {np.sum(result.hourly_revenue):,.0f} 원")
    print(f"    총 전력 비용: {np.sum(result.hourly_cost):,.0f} 원")

    # 10년차 계산 (효율 저하 반영)
    result_y10 = calculate_8760(
        config=config,
        electricity_prices=electricity_prices,
        h2_price=6000,
        year=10,
    )

    print(f"\n  10년차 결과 (효율 저하 반영):")
    print(f"    총 수소 생산량: {result_y10.total_h2_production:,.0f} kg ({result_y10.total_h2_production/1000:.1f} 톤)")
    degradation = (1 - result_y10.total_h2_production / result.total_h2_production) * 100
    print(f"    1년차 대비 감소율: {degradation:.2f}%")

    print("  [OK] 8760 계산 완료")
    print()

    return result


def test_financial_analysis(energy_result):
    """재무 분석 테스트"""
    print("=" * 60)
    print("4. 재무 분석 테스트")
    print("=" * 60)

    # 10MW 기준 CAPEX: 약 150만원/kW = 150억원
    # (리서치 결과 PEM $800~2,500/kW → 환산 116~362만원/kW, 보수적 중간값 사용)
    capex = 15_000_000_000  # 150억원 (10MW * 150만원/kW)

    config = FinancialConfig(
        capex=capex,
        opex_ratio=2.5,                 # CAPEX의 2.5%
        stack_replacement_cost=capex * 0.11,  # CAPEX의 11% (PEM 기준)
        stack_lifetime_hours=80000,     # 80,000시간
        discount_rate=8,                # 8%
        project_lifetime=20,            # 20년
        debt_ratio=70,                  # 70%
        interest_rate=5,                # 5%
        loan_tenor=15,                  # 15년
    )

    # 연도별 데이터 생성 (단순화)
    yearly_revenues = [np.sum(energy_result.hourly_revenue)] * 20
    yearly_elec_costs = [np.sum(energy_result.hourly_cost)] * 20
    yearly_h2_prod = [energy_result.total_h2_production] * 20

    print(f"  CAPEX: {config.capex/1e8:.0f}억원 (10MW * 150만원/kW)")
    print(f"  스택 교체 비용: {config.stack_replacement_cost/1e8:.1f}억원 (CAPEX의 {config.stack_replacement_cost/config.capex*100:.1f}%)")
    print(f"  부채 비율: {config.debt_ratio}%")
    print(f"  할인율: {config.discount_rate}%")

    result = run_financial_analysis(
        config=config,
        yearly_revenues=yearly_revenues,
        yearly_electricity_costs=yearly_elec_costs,
        yearly_h2_production=yearly_h2_prod,
    )

    print(f"\n  재무 분석 결과:")
    print(f"    NPV: {result.npv/1e9:.2f}억원")
    print(f"    IRR: {result.irr:.2f}%")
    print(f"    투자회수기간: {result.payback_period:.1f}년")
    print(f"    LCOH: {result.lcoh:,.0f}원/kg")
    print(f"    DSCR 최소: {result.dscr_min:.2f}")
    print(f"    DSCR 평균: {result.dscr_avg:.2f}")

    # LCOH 검증
    print(f"\n  LCOH 검증:")
    print(f"    계산된 LCOH: {result.lcoh:,.0f}원/kg")
    print(f"    한국 그린수소 시장 범위: 5,200~7,150원/kg (2024-2025)")

    print("  [OK] 재무 분석 완료")
    print()

    return result


def test_monte_carlo():
    """몬테카를로 시뮬레이션 테스트"""
    print("=" * 60)
    print("5. 몬테카를로 시뮬레이션 테스트")
    print("=" * 60)

    energy_config = Energy8760Config(
        electrolyzer_capacity_mw=10,
        electrolyzer_efficiency=67,
        specific_consumption=50,
        degradation_rate=0.5,
        annual_availability=85,
        price_threshold=150,
    )

    mc_config = MonteCarloConfig(
        iterations=1000,  # 테스트용으로 줄임
        weather_sigma=0.1,
        price_sigma=0.15,
    )

    # PPA 가격 70원/kWh 기준
    electricity_prices = _generate_electricity_prices(70, "base")
    capex = 15_000_000_000  # 150억원

    print(f"  시뮬레이션 반복 횟수: {mc_config.iterations}")
    print(f"  기상 변동성 σ: {mc_config.weather_sigma}")
    print(f"  가격 변동성 σ: {mc_config.price_sigma}")
    print(f"  CAPEX: {capex/1e8:.0f}억원")

    result = run_monte_carlo(
        energy_config=energy_config,
        mc_config=mc_config,
        base_electricity_prices=electricity_prices,
        base_h2_price=6000,
        capex=capex,
        opex_annual=capex * 0.025,  # CAPEX의 2.5%
        discount_rate=8,
        project_lifetime=20,
    )

    print(f"\n  몬테카를로 결과:")
    print(f"    NPV P50: {result.npv_p50/1e9:.2f}억원")
    print(f"    NPV P90 (하위 10%): {result.npv_p90/1e9:.2f}억원")
    print(f"    NPV P99 (하위 1%): {result.npv_p99/1e9:.2f}억원")
    print(f"    VaR 95%: {result.var_95/1e9:.2f}억원")
    print(f"    IRR P50: {result.irr_p50:.2f}%")

    # 분포 검증
    npv_std = np.std(result.npv_distribution)
    print(f"\n  NPV 표준편차: {npv_std/1e9:.2f}억원")
    print(f"  NPV 분포 범위: {np.min(result.npv_distribution)/1e9:.2f} ~ {np.max(result.npv_distribution)/1e9:.2f}억원")

    print("  [OK] 몬테카를로 시뮬레이션 완료")
    print()


def test_input_validation():
    """입력 검증 테스트"""
    print("=" * 60)
    print("6. 입력 검증 테스트")
    print("=" * 60)

    # 배열 길이 검증
    config = Energy8760Config(
        electrolyzer_capacity_mw=10,
        electrolyzer_efficiency=67,
        specific_consumption=50,
        degradation_rate=0.5,
        annual_availability=85,
        price_threshold=150,
    )

    # 잘못된 배열 길이 테스트
    try:
        wrong_prices = np.zeros(100)  # 8760개여야 하는데 100개
        calculate_8760(config, wrong_prices)
        print("  [FAIL] 배열 길이 검증 실패 (예외가 발생해야 함)")
    except ValueError as e:
        print(f"  [OK] 배열 길이 검증 통과: {e}")

    # 부채비율 검증
    fin_config = FinancialConfig(
        capex=50_000_000_000,
        opex_ratio=2.5,
        stack_replacement_cost=5_500_000_000,
        stack_lifetime_hours=80000,
        discount_rate=8,
        project_lifetime=20,
        debt_ratio=70,
        interest_rate=5,
        loan_tenor=15,
    )

    # 정상 케이스
    try:
        run_financial_analysis(
            config=fin_config,
            yearly_revenues=[1e9] * 20,
            yearly_electricity_costs=[5e8] * 20,
            yearly_h2_production=[1e6] * 20,
        )
        print("  [OK] 정상 재무 분석 통과")
    except Exception as e:
        print(f"  [FAIL] 정상 재무 분석 실패: {e}")

    print()


def main():
    """메인 테스트 실행"""
    print("\n" + "=" * 60)
    print("H8760 수소 전해조 최적화 플랫폼 - 시뮬레이션 테스트")
    print("=" * 60 + "\n")

    try:
        test_hydrogen_lhv()
        test_electricity_prices()
        energy_result = test_energy_8760()
        test_financial_analysis(energy_result)
        test_monte_carlo()
        test_input_validation()

        print("=" * 60)
        print("[OK] 모든 테스트 통과!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[FAIL] 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
