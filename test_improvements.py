"""
개선사항 테스트 스크립트

이 스크립트는 다음 개선사항들을 테스트합니다:
1. 벡터 연산 8760 계산 최적화
2. 계절별 전기요금 시간대 반영
3. 재생에너지 출력 연계 기능
4. API 스키마 자동 변환 (snake↔camel)
5. IRR 계산 대체 알고리즘
"""
import sys
import time
import numpy as np

sys.path.insert(0, "backend")

from app.engine.energy_8760 import Energy8760Config, calculate_8760
from app.engine.simulation_runner import (
    _generate_electricity_prices,
    _generate_renewable_profile,
)
from app.engine.financial import (
    _calculate_irr,
    _irr_newton_raphson,
    _irr_bisection,
)
from app.core.case_converter import (
    snake_to_camel,
    camel_to_snake,
    convert_keys_to_camel,
    convert_keys_to_snake,
)
from app.schemas.result import SimulationResult, KPIs, PercentileValue


def test_vectorized_8760():
    """벡터화된 8760 계산 테스트"""
    print("\n=== 1. 벡터화 8760 계산 테스트 ===")

    config = Energy8760Config(
        electrolyzer_capacity_mw=10.0,
        electrolyzer_efficiency=67.0,
        specific_consumption=50.0,
        degradation_rate=0.5,
        annual_availability=85.0,
        price_threshold=150.0,
    )

    electricity_prices = np.random.uniform(80, 120, 8760)

    # 성능 측정
    start_time = time.time()
    for _ in range(10):
        result = calculate_8760(config, electricity_prices, h2_price=6000, year=1)
    elapsed = time.time() - start_time

    print(f"10회 실행 시간: {elapsed:.3f}초 (평균 {elapsed/10*1000:.1f}ms/회)")
    print(f"총 수소 생산량: {result.total_h2_production:,.0f} kg")
    print(f"총 가동 시간: {result.total_operating_hours:,} 시간")
    print(f"설비 이용률: {result.capacity_factor:.1f}%")

    # 검증
    assert result.total_h2_production > 0, "수소 생산량이 0입니다"
    assert result.total_operating_hours > 0, "가동 시간이 0입니다"
    assert len(result.h2_production) == 8760, "결과 배열 길이 오류"

    print("✅ 벡터화 8760 계산 테스트 통과")


def test_seasonal_electricity_prices():
    """계절별 전기요금 시간대 테스트"""
    print("\n=== 2. 계절별 전기요금 시간대 테스트 ===")

    base_price = 100.0
    prices = _generate_electricity_prices(base_price, "base")

    # 여름 피크 시간대 (7월 15일 14:00) - day 196, hour 14
    summer_peak_hour = 196 * 24 + 14
    summer_peak_price = prices[summer_peak_hour]

    # 여름 경부하 시간대 (7월 15일 03:00) - day 196, hour 3
    summer_off_peak_hour = 196 * 24 + 3
    summer_off_peak_price = prices[summer_off_peak_hour]

    # 겨울 피크 시간대 (1월 15일 18:00) - day 15, hour 18
    winter_peak_hour = 15 * 24 + 18
    winter_peak_price = prices[winter_peak_hour]

    print(f"기준 가격: {base_price}원/kWh")
    print(f"여름 피크(14:00): {summer_peak_price:.1f}원 (배율 {summer_peak_price/base_price:.2f}x)")
    print(f"여름 경부하(03:00): {summer_off_peak_price:.1f}원 (배율 {summer_off_peak_price/base_price:.2f}x)")
    print(f"겨울 피크(18:00): {winter_peak_price:.1f}원 (배율 {winter_peak_price/base_price:.2f}x)")

    # 검증: 피크 > 경부하
    assert summer_peak_price > summer_off_peak_price, "여름 피크가 경부하보다 높아야 함"
    assert winter_peak_price > summer_off_peak_price, "겨울 피크가 경부하보다 높아야 함"

    # 시나리오 테스트
    high_prices = _generate_electricity_prices(base_price, "high")
    low_prices = _generate_electricity_prices(base_price, "low")

    print(f"\n시나리오별 평균 가격:")
    print(f"  base: {np.mean(prices):.1f}원")
    print(f"  high: {np.mean(high_prices):.1f}원")
    print(f"  low: {np.mean(low_prices):.1f}원")

    assert np.mean(high_prices) > np.mean(prices), "high 시나리오가 base보다 높아야 함"
    assert np.mean(low_prices) < np.mean(prices), "low 시나리오가 base보다 낮아야 함"

    print("✅ 계절별 전기요금 시간대 테스트 통과")


def test_renewable_profile():
    """재생에너지 출력 프로파일 테스트"""
    print("\n=== 3. 재생에너지 출력 프로파일 테스트 ===")

    # 태양광 프로파일
    solar_output = _generate_renewable_profile("solar", 15.0, 15.0)
    solar_cf = np.mean(solar_output) / 15.0 * 100

    # 풍력 프로파일
    wind_output = _generate_renewable_profile("wind", 15.0, 25.0)
    wind_cf = np.mean(wind_output) / 15.0 * 100

    # 하이브리드 프로파일
    hybrid_output = _generate_renewable_profile("hybrid", 15.0, 20.0)
    hybrid_cf = np.mean(hybrid_output) / 15.0 * 100

    print(f"태양광 (15MW, 15% CF):")
    print(f"  실제 설비이용률: {solar_cf:.1f}%")
    print(f"  최대 출력: {np.max(solar_output):.1f} MW")
    print(f"  야간(02:00) 출력: {solar_output[2]:.3f} MW")

    print(f"\n풍력 (15MW, 25% CF):")
    print(f"  실제 설비이용률: {wind_cf:.1f}%")
    print(f"  최대 출력: {np.max(wind_output):.1f} MW")

    print(f"\n하이브리드 (15MW, 20% CF):")
    print(f"  실제 설비이용률: {hybrid_cf:.1f}%")

    # 검증
    assert len(solar_output) == 8760, "태양광 출력 배열 길이 오류"
    assert np.all(solar_output >= 0), "태양광 출력에 음수 있음"
    assert solar_output[2] < 0.1, "태양광 야간 출력이 0에 가까워야 함"  # 02:00에는 발전 없음

    assert len(wind_output) == 8760, "풍력 출력 배열 길이 오류"
    assert np.all(wind_output >= 0), "풍력 출력에 음수 있음"

    print("✅ 재생에너지 출력 프로파일 테스트 통과")


def test_case_converter():
    """케이스 변환 유틸리티 테스트"""
    print("\n=== 4. 케이스 변환 유틸리티 테스트 ===")

    # 기본 변환
    assert snake_to_camel("hello_world") == "helloWorld"
    assert snake_to_camel("h2_price") == "h2Price"
    assert snake_to_camel("annual_h2_production") == "annualH2Production"

    assert camel_to_snake("helloWorld") == "hello_world"
    assert camel_to_snake("h2Price") == "h2_price"

    print("기본 변환 테스트:")
    print(f"  snake_to_camel('hello_world') = '{snake_to_camel('hello_world')}'")
    print(f"  camel_to_snake('helloWorld') = '{camel_to_snake('helloWorld')}'")

    # 딕셔너리 변환
    test_dict = {
        "project_lifetime": 20,
        "annual_h2_production": 1000,
        "nested_data": {
            "inner_value": 42,
        },
    }

    camel_dict = convert_keys_to_camel(test_dict)
    print(f"\n딕셔너리 변환:")
    print(f"  원본: {test_dict}")
    print(f"  camelCase: {camel_dict}")

    assert "projectLifetime" in camel_dict
    assert "annualH2Production" in camel_dict
    assert "nestedData" in camel_dict
    assert "innerValue" in camel_dict["nestedData"]

    # 다시 snake_case로 변환
    snake_dict = convert_keys_to_snake(camel_dict)
    assert "project_lifetime" in snake_dict

    print("✅ 케이스 변환 유틸리티 테스트 통과")


def test_irr_calculation():
    """IRR 계산 알고리즘 테스트"""
    print("\n=== 5. IRR 계산 알고리즘 테스트 ===")

    # 테스트 케이스 1: 일반적인 투자 현금흐름
    cashflows1 = [-1000, 300, 300, 300, 300, 300]
    irr1 = _calculate_irr(cashflows1)
    print(f"테스트 1 (일반 투자):")
    print(f"  현금흐름: {cashflows1}")
    print(f"  IRR: {irr1:.2f}%")
    assert irr1 is not None, "IRR 계산 실패"
    assert 14 < irr1 < 16, f"IRR이 예상 범위(14-16%)를 벗어남: {irr1}%"

    # 테스트 케이스 2: 고수익 프로젝트
    cashflows2 = [-1000, 500, 500, 500, 500]
    irr2 = _calculate_irr(cashflows2)
    print(f"\n테스트 2 (고수익 프로젝트):")
    print(f"  현금흐름: {cashflows2}")
    print(f"  IRR: {irr2:.2f}%")
    assert irr2 is not None, "IRR 계산 실패"
    assert irr2 > irr1, "고수익 프로젝트 IRR이 더 높아야 함"

    # 테스트 케이스 3: 손실 프로젝트 (IRR이 음수)
    cashflows3 = [-1000, 100, 100, 100, 100]
    irr3 = _calculate_irr(cashflows3)
    print(f"\n테스트 3 (손실 프로젝트):")
    print(f"  현금흐름: {cashflows3}")
    print(f"  IRR: {irr3:.2f}%" if irr3 else "  IRR: 계산 불가")

    # 테스트 케이스 4: 부호 변환 없음 (IRR 없음)
    cashflows4 = [-1000, -100, -100]
    irr4 = _calculate_irr(cashflows4)
    print(f"\n테스트 4 (부호 변환 없음):")
    print(f"  현금흐름: {cashflows4}")
    print(f"  IRR: {irr4}" if irr4 else "  IRR: None (정상 - 부호 변환 없음)")
    assert irr4 is None, "부호 변환 없는 현금흐름은 IRR이 None이어야 함"

    # 테스트 케이스 5: Newton-Raphson vs Bisection 비교
    cashflows5 = [-10000, 2000, 2500, 3000, 3500, 4000]
    irr_nr = _irr_newton_raphson(cashflows5)
    irr_bs = _irr_bisection(cashflows5)
    print(f"\n테스트 5 (알고리즘 비교):")
    print(f"  현금흐름: {cashflows5}")
    print(f"  Newton-Raphson: {irr_nr:.2f}%" if irr_nr else "  Newton-Raphson: 실패")
    print(f"  Bisection: {irr_bs:.2f}%" if irr_bs else "  Bisection: 실패")

    if irr_nr and irr_bs:
        diff = abs(irr_nr - irr_bs)
        print(f"  차이: {diff:.4f}%")
        assert diff < 0.1, "두 알고리즘 결과 차이가 0.1% 이상"

    print("✅ IRR 계산 알고리즘 테스트 통과")


def test_pydantic_camel_alias():
    """Pydantic 모델 camelCase 별칭 테스트"""
    print("\n=== 6. Pydantic 모델 camelCase 별칭 테스트 ===")

    # PercentileValue 모델 테스트
    pv = PercentileValue(p50=100, p90=80, p99=60)

    # model_dump with by_alias
    dumped = pv.model_dump(by_alias=True)
    print(f"PercentileValue 직렬화:")
    print(f"  원본: p50=100, p90=80, p99=60")
    print(f"  by_alias=True: {dumped}")

    # KPIs 테스트 (중첩 모델)
    from app.schemas.result import DSCRMetrics

    kpis = KPIs(
        npv=PercentileValue(p50=1e9, p90=8e8, p99=6e8),
        irr=PercentileValue(p50=15, p90=12, p99=8),
        dscr=DSCRMetrics(min=1.2, avg=1.5),
        payback_period=7.5,
        var_95=5e8,
        annual_h2_production=PercentileValue(p50=1000, p90=900, p99=800),
        lcoh=5000,
    )

    kpis_dumped = kpis.model_dump(by_alias=True)
    print(f"\nKPIs 직렬화 (일부):")
    print(f"  payback_period → paybackPeriod: {kpis_dumped.get('paybackPeriod')}")
    print(f"  var_95 → var95: {kpis_dumped.get('var95')}")
    print(f"  annual_h2_production → annualH2Production: {'annualH2Production' in kpis_dumped}")

    assert "paybackPeriod" in kpis_dumped, "paybackPeriod 별칭 없음"
    assert "var95" in kpis_dumped, "var95 별칭 없음"

    print("✅ Pydantic 모델 camelCase 별칭 테스트 통과")


def main():
    """모든 테스트 실행"""
    print("=" * 60)
    print("H8760 개선사항 테스트")
    print("=" * 60)

    tests = [
        test_vectorized_8760,
        test_seasonal_electricity_prices,
        test_renewable_profile,
        test_case_converter,
        test_irr_calculation,
        test_pydantic_camel_alias,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"\n❌ {test.__name__} 실패: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"테스트 결과: {passed} 통과 / {failed} 실패")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
