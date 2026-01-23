"""데이터 조회 API 라우트"""
from typing import List
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
