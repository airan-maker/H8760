"""데이터 조회 API 라우트"""
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class Preset(BaseModel):
    """설비 프리셋"""

    id: str
    name: str
    description: str
    electrolyzer_type: str
    capacity_mw: float
    efficiency: float
    capex_per_kw: float


class CountryPreset(BaseModel):
    """국가별 프리셋 - 지역 특성 반영"""

    id: str
    name: str
    country_code: str  # ISO 3166-1 alpha-2
    flag_emoji: str
    description: str
    currency: str
    currency_symbol: str
    exchange_rate: float  # 원화 대비 환율 (예: USD 1 = 1350원)

    # 전력 비용
    ppa_price: float  # 현지 통화/kWh
    ppa_price_krw: float  # 원/kWh (환산)
    grid_price: float  # 현지 통화/kWh
    grid_price_krw: float  # 원/kWh (환산)

    # 수소 가격
    h2_price: float  # 현지 통화/kg
    h2_price_krw: float  # 원/kg (환산)
    h2_price_escalation: float  # %/년

    # 인센티브
    itc_rate: float  # 투자세액공제 (% of CAPEX)
    ptc_amount: float  # 생산세액공제 (현지 통화/kg)
    ptc_amount_krw: float  # 원/kg (환산)
    ptc_duration: int  # 년
    capex_subsidy_rate: float  # CAPEX 보조금율 (%)
    operating_subsidy: float  # 운영 보조금 (현지 통화/kg)
    operating_subsidy_krw: float  # 원/kg (환산)
    operating_subsidy_duration: int  # 년

    # 세금
    corporate_tax_rate: float  # 법인세율 (%)
    carbon_price: float  # 탄소 가격 (현지 통화/톤 CO2)
    carbon_price_krw: float  # 원/톤 CO2 (환산)

    # 금융
    interest_rate: float  # 대출 이자율 (%)
    discount_rate: float  # 할인율 (%)

    # CAPEX 조정 계수 (한국 대비)
    capex_multiplier: float  # 1.0 = 한국과 동일
    labor_cost_multiplier: float  # 인건비 계수

    # 특이사항
    notes: str


class TMYDataPoint(BaseModel):
    """시간별 기상 데이터"""

    hour: int
    solar_irradiance: float  # W/m2
    wind_speed: float  # m/s
    temperature: float  # °C


class ElectricityPricePoint(BaseModel):
    """시간별 전력 가격"""

    hour: int
    price: float  # 원/kWh


# 프리셋 데이터
PRESETS: List[Preset] = [
    Preset(
        id="small_pem",
        name="소규모 PEM",
        description="1-5 MW PEM 전해조",
        electrolyzer_type="PEM",
        capacity_mw=5.0,
        efficiency=67.0,
        capex_per_kw=1500000,
    ),
    Preset(
        id="medium_pem",
        name="중규모 PEM",
        description="10-20 MW PEM 전해조",
        electrolyzer_type="PEM",
        capacity_mw=10.0,
        efficiency=65.0,
        capex_per_kw=1200000,
    ),
    Preset(
        id="large_alk",
        name="대규모 ALK",
        description="50-100 MW 알칼라인 전해조",
        electrolyzer_type="ALK",
        capacity_mw=50.0,
        efficiency=62.0,
        capex_per_kw=800000,
    ),
    Preset(
        id="soec",
        name="SOEC (고온)",
        description="고온 고체산화물 전해조",
        electrolyzer_type="SOEC",
        capacity_mw=5.0,
        efficiency=80.0,
        capex_per_kw=3000000,
    ),
]


@router.get("/presets", response_model=List[Preset])
async def get_presets() -> List[Preset]:
    """설비 프리셋 목록 조회"""
    return PRESETS


@router.get("/presets/{preset_id}", response_model=Preset)
async def get_preset(preset_id: str) -> Preset:
    """특정 프리셋 조회"""
    for preset in PRESETS:
        if preset.id == preset_id:
            return preset
    raise HTTPException(status_code=404, detail="Preset not found")


@router.get("/tmy/{region}", response_model=List[TMYDataPoint])
async def get_tmy_data(region: str) -> List[TMYDataPoint]:
    """지역별 TMY (Typical Meteorological Year) 데이터 조회"""
    import math

    # 간단한 시뮬레이션 데이터 생성
    data = []
    for hour in range(8760):
        day_of_year = hour // 24
        hour_of_day = hour % 24

        # 태양 복사량 (낮에만)
        solar = 0.0
        if 6 <= hour_of_day <= 18:
            solar_peak = 800 + 200 * math.sin(2 * math.pi * day_of_year / 365)
            solar = solar_peak * math.sin(math.pi * (hour_of_day - 6) / 12)

        # 풍속 (계절 변동)
        wind = 5.0 + 3.0 * math.sin(2 * math.pi * day_of_year / 365 + math.pi)
        wind += 2.0 * math.sin(2 * math.pi * hour_of_day / 24)

        # 온도
        temp = 15.0 + 10.0 * math.sin(2 * math.pi * day_of_year / 365 - math.pi / 2)
        temp += 5.0 * math.sin(2 * math.pi * hour_of_day / 24 - math.pi / 2)

        data.append(
            TMYDataPoint(
                hour=hour,
                solar_irradiance=max(0, solar),
                wind_speed=max(0, wind),
                temperature=temp,
            )
        )

    return data


@router.get("/electricity-prices/{scenario}", response_model=List[ElectricityPricePoint])
async def get_electricity_prices(scenario: str = "base") -> List[ElectricityPricePoint]:
    """전력 가격 데이터 조회"""
    import math

    data = []
    base_price = 100.0  # 원/kWh

    for hour in range(8760):
        hour_of_day = hour % 24

        # 시간대별 가격 변동
        if 9 <= hour_of_day <= 12 or 17 <= hour_of_day <= 21:
            # 피크 시간
            multiplier = 1.5
        elif 23 <= hour_of_day or hour_of_day <= 6:
            # 경부하 시간
            multiplier = 0.7
        else:
            # 중간부하
            multiplier = 1.0

        # 시나리오별 조정
        if scenario == "high":
            multiplier *= 1.3
        elif scenario == "low":
            multiplier *= 0.8

        price = base_price * multiplier

        data.append(ElectricityPricePoint(hour=hour, price=price))

    return data


from fastapi import HTTPException


# 국가별 프리셋 데이터 (2024-2025년 기준 리서치 결과)
COUNTRY_PRESETS: List[CountryPreset] = [
    CountryPreset(
        id="korea",
        name="한국",
        country_code="KR",
        flag_emoji="🇰🇷",
        description="청정수소 인증제, 투자세액공제 활용",
        currency="KRW",
        currency_symbol="₩",
        exchange_rate=1.0,
        # 전력 (원/kWh)
        ppa_price=70.0,
        ppa_price_krw=70.0,
        grid_price=120.0,
        grid_price_krw=120.0,
        # 수소 (원/kg)
        h2_price=8500.0,
        h2_price_krw=8500.0,
        h2_price_escalation=2.0,
        # 인센티브
        itc_rate=10.0,
        ptc_amount=0.0,
        ptc_amount_krw=0.0,
        ptc_duration=0,
        capex_subsidy_rate=20.0,
        operating_subsidy=500.0,
        operating_subsidy_krw=500.0,
        operating_subsidy_duration=10,
        # 세금
        corporate_tax_rate=24.2,  # 22% + 지방세 2.2%
        carbon_price=30000.0,
        carbon_price_krw=30000.0,
        # 금융
        interest_rate=5.0,
        discount_rate=8.0,
        # CAPEX
        capex_multiplier=1.0,
        labor_cost_multiplier=1.0,
        notes="청정수소 인증 프리미엄 500원/kg 별도",
    ),
    CountryPreset(
        id="usa_texas",
        name="미국 (텍사스)",
        country_code="US",
        flag_emoji="🇺🇸",
        description="IRA 45V PTC $3/kg, 저렴한 전력, 풍부한 재생에너지",
        currency="USD",
        currency_symbol="$",
        exchange_rate=1350.0,
        # 전력 ($→원)
        ppa_price=0.035,  # $35/MWh
        ppa_price_krw=47.0,
        grid_price=0.065,
        grid_price_krw=88.0,
        # 수소
        h2_price=5.0,  # $/kg
        h2_price_krw=6750.0,
        h2_price_escalation=1.5,
        # 인센티브 (45V PTC)
        itc_rate=0.0,  # PTC 선택 시 ITC 없음
        ptc_amount=3.0,  # $3/kg (최대)
        ptc_amount_krw=4050.0,
        ptc_duration=10,
        capex_subsidy_rate=0.0,
        operating_subsidy=0.0,
        operating_subsidy_krw=0.0,
        operating_subsidy_duration=0,
        # 세금
        corporate_tax_rate=21.0,  # 연방세만
        carbon_price=0.0,  # 연방 탄소세 없음
        carbon_price_krw=0.0,
        # 금융
        interest_rate=6.5,
        discount_rate=8.0,
        # CAPEX
        capex_multiplier=1.1,  # 인건비 높음
        labor_cost_multiplier=1.3,
        notes="45V 탄소강도 <0.45kg CO2e/kg H2 요건 충족 필요",
    ),
    CountryPreset(
        id="usa_california",
        name="미국 (캘리포니아)",
        country_code="US",
        flag_emoji="🇺🇸",
        description="IRA 45V + 주정부 LCFS 크레딧, 높은 수소 가격",
        currency="USD",
        currency_symbol="$",
        exchange_rate=1350.0,
        # 전력
        ppa_price=0.055,  # $55/MWh
        ppa_price_krw=74.0,
        grid_price=0.12,
        grid_price_krw=162.0,
        # 수소
        h2_price=8.0,  # $/kg (LCFS 프리미엄 포함)
        h2_price_krw=10800.0,
        h2_price_escalation=2.0,
        # 인센티브
        itc_rate=0.0,
        ptc_amount=3.0,
        ptc_amount_krw=4050.0,
        ptc_duration=10,
        capex_subsidy_rate=10.0,  # 주정부 보조금
        operating_subsidy=1.5,  # LCFS 크레딧 환산
        operating_subsidy_krw=2025.0,
        operating_subsidy_duration=15,
        # 세금
        corporate_tax_rate=29.6,  # 연방 21% + 주 8.84%
        carbon_price=0.0,
        carbon_price_krw=0.0,
        # 금융
        interest_rate=6.5,
        discount_rate=8.5,
        # CAPEX
        capex_multiplier=1.25,
        labor_cost_multiplier=1.5,
        notes="LCFS 크레딧으로 추가 수익 가능",
    ),
    CountryPreset(
        id="canada_quebec",
        name="캐나다 (퀘벡)",
        country_code="CA",
        flag_emoji="🇨🇦",
        description="청정수소 ITC 40%, 저렴한 수력 전력",
        currency="CAD",
        currency_symbol="C$",
        exchange_rate=1000.0,
        # 전력 (CAD→원)
        ppa_price=0.045,  # C$45/MWh
        ppa_price_krw=45.0,
        grid_price=0.065,
        grid_price_krw=65.0,
        # 수소
        h2_price=5.5,  # C$/kg
        h2_price_krw=5500.0,
        h2_price_escalation=1.5,
        # 인센티브 (Clean Hydrogen ITC)
        itc_rate=40.0,  # 최대 40%
        ptc_amount=0.0,
        ptc_amount_krw=0.0,
        ptc_duration=0,
        capex_subsidy_rate=0.0,
        operating_subsidy=0.0,
        operating_subsidy_krw=0.0,
        operating_subsidy_duration=0,
        # 세금
        corporate_tax_rate=26.5,  # 연방 15% + 퀘벡 11.5%
        carbon_price=80.0,  # C$80/톤 (2024)
        carbon_price_krw=80000.0,
        # 금융
        interest_rate=5.5,
        discount_rate=7.5,
        # CAPEX
        capex_multiplier=1.05,
        labor_cost_multiplier=1.2,
        notes="청정수소 ITC는 전해조/NG+CCUS만 대상",
    ),
    CountryPreset(
        id="australia_sa",
        name="호주 (남호주)",
        country_code="AU",
        flag_emoji="🇦🇺",
        description="Hydrogen Headstart, 세계 최저 수준 태양광 PPA",
        currency="AUD",
        currency_symbol="A$",
        exchange_rate=900.0,
        # 전력 (AUD→원)
        ppa_price=0.035,  # A$35/MWh
        ppa_price_krw=32.0,
        grid_price=0.12,
        grid_price_krw=108.0,
        # 수소
        h2_price=6.0,  # A$/kg
        h2_price_krw=5400.0,
        h2_price_escalation=2.0,
        # 인센티브
        itc_rate=0.0,
        ptc_amount=2.0,  # Hydrogen Headstart 추정
        ptc_amount_krw=1800.0,
        ptc_duration=10,
        capex_subsidy_rate=15.0,
        operating_subsidy=0.0,
        operating_subsidy_krw=0.0,
        operating_subsidy_duration=0,
        # 세금
        corporate_tax_rate=30.0,
        carbon_price=0.0,  # 직접 탄소세 없음
        carbon_price_krw=0.0,
        # 금융
        interest_rate=6.0,
        discount_rate=8.0,
        # CAPEX
        capex_multiplier=1.15,
        labor_cost_multiplier=1.4,
        notes="음의 전력가격 시간대 25% - 운영 최적화 중요",
    ),
    CountryPreset(
        id="chile",
        name="칠레 (아타카마)",
        country_code="CL",
        flag_emoji="🇨🇱",
        description="세계 최저 태양광 비용, 수출 중심",
        currency="USD",
        currency_symbol="$",
        exchange_rate=1350.0,
        # 전력
        ppa_price=0.020,  # $20/MWh - 세계 최저
        ppa_price_krw=27.0,
        grid_price=0.08,
        grid_price_krw=108.0,
        # 수소 (수출 가격)
        h2_price=4.0,  # $/kg
        h2_price_krw=5400.0,
        h2_price_escalation=1.0,
        # 인센티브
        itc_rate=0.0,
        ptc_amount=0.0,
        ptc_amount_krw=0.0,
        ptc_duration=0,
        capex_subsidy_rate=30.0,  # CORFO 지원
        operating_subsidy=0.0,
        operating_subsidy_krw=0.0,
        operating_subsidy_duration=0,
        # 세금
        corporate_tax_rate=27.0,
        carbon_price=5.0,  # $5/톤
        carbon_price_krw=6750.0,
        # 금융
        interest_rate=7.0,
        discount_rate=9.0,
        # CAPEX
        capex_multiplier=1.0,
        labor_cost_multiplier=0.7,
        notes="암모니아 전환 후 아시아/유럽 수출 타겟",
    ),
    CountryPreset(
        id="germany",
        name="독일",
        country_code="DE",
        flag_emoji="🇩🇪",
        description="높은 탄소가격, 엄격한 RED II 규제, 높은 수소 수요",
        currency="EUR",
        currency_symbol="€",
        exchange_rate=1450.0,
        # 전력 (EUR→원)
        ppa_price=0.065,  # €65/MWh
        ppa_price_krw=94.0,
        grid_price=0.18,
        grid_price_krw=261.0,
        # 수소
        h2_price=7.0,  # €/kg
        h2_price_krw=10150.0,
        h2_price_escalation=1.5,
        # 인센티브
        itc_rate=0.0,
        ptc_amount=0.0,
        ptc_amount_krw=0.0,
        ptc_duration=0,
        capex_subsidy_rate=25.0,  # IPCEI 프로젝트
        operating_subsidy=1.0,  # H2Global 추정
        operating_subsidy_krw=1450.0,
        operating_subsidy_duration=10,
        # 세금
        corporate_tax_rate=30.0,  # 법인세 + 영업세
        carbon_price=80.0,  # €80/톤 (EU ETS)
        carbon_price_krw=116000.0,
        # 금융
        interest_rate=5.0,
        discount_rate=7.0,
        # CAPEX
        capex_multiplier=1.2,
        labor_cost_multiplier=1.4,
        notes="RED II 적합성 인증 필수, 허가 3-5년 소요",
    ),
    CountryPreset(
        id="saudi_arabia",
        name="사우디아라비아 (네옴)",
        country_code="SA",
        flag_emoji="🇸🇦",
        description="NEOM Green Hydrogen, 대규모 수출 프로젝트",
        currency="USD",
        currency_symbol="$",
        exchange_rate=1350.0,
        # 전력
        ppa_price=0.025,  # $25/MWh
        ppa_price_krw=34.0,
        grid_price=0.05,
        grid_price_krw=68.0,
        # 수소
        h2_price=3.5,  # $/kg (대규모 수출 가격)
        h2_price_krw=4725.0,
        h2_price_escalation=0.5,
        # 인센티브
        itc_rate=0.0,
        ptc_amount=0.0,
        ptc_amount_krw=0.0,
        ptc_duration=0,
        capex_subsidy_rate=50.0,  # 정부 지분 투자
        operating_subsidy=0.0,
        operating_subsidy_krw=0.0,
        operating_subsidy_duration=0,
        # 세금
        corporate_tax_rate=20.0,
        carbon_price=0.0,
        carbon_price_krw=0.0,
        # 금융
        interest_rate=5.0,
        discount_rate=7.0,
        # CAPEX
        capex_multiplier=0.9,
        labor_cost_multiplier=0.6,
        notes="NEOM 프로젝트: 2.2GW 전해조, 연 120만톤 암모니아",
    ),
]


@router.get("/country-presets", response_model=List[CountryPreset])
async def get_country_presets() -> List[CountryPreset]:
    """국가별 프리셋 목록 조회"""
    return COUNTRY_PRESETS


@router.get("/country-presets/{preset_id}", response_model=CountryPreset)
async def get_country_preset(preset_id: str) -> CountryPreset:
    """특정 국가 프리셋 조회"""
    for preset in COUNTRY_PRESETS:
        if preset.id == preset_id:
            return preset
    raise HTTPException(status_code=404, detail="Country preset not found")
