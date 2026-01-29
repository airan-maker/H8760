/**
 * 2변수 민감도 히트맵 차트
 *
 * 두 변수를 동시에 변동시켜 목표 KPI(IRR, NPV 등)에 대한 영향을 시각화
 */
import { useMemo } from 'react';
import { Card } from '../common';

interface Props {
  // 기준 값들
  baseValues: {
    xValue: number;
    yValue: number;
    kpiValue: number;
  };
  // X축 변수
  xVariable: {
    name: string;
    label: string;
    unit: string;
    range: number[]; // [min, max] 또는 변동 비율
  };
  // Y축 변수
  yVariable: {
    name: string;
    label: string;
    unit: string;
    range: number[];
  };
  // 목표 KPI
  targetKpi: 'irr' | 'npv' | 'lcoh';
  // KPI 계산 함수
  calculateKpi: (xValue: number, yValue: number) => number;
  // 그리드 사이즈 (기본 5x5)
  gridSize?: number;
}

const KPI_CONFIG = {
  irr: {
    label: 'IRR',
    unit: '%',
    format: (v: number) => `${v.toFixed(1)}%`,
    colorReverse: false, // 높을수록 좋음
    thresholds: { bad: 5, neutral: 8, good: 12 },
  },
  npv: {
    label: 'NPV',
    unit: '억원',
    format: (v: number) => `${(v / 1e8).toFixed(0)}억`,
    colorReverse: false,
    thresholds: { bad: 0, neutral: 50e8, good: 100e8 },
  },
  lcoh: {
    label: 'LCOH',
    unit: '원/kg',
    format: (v: number) => `${v.toLocaleString()}`,
    colorReverse: true, // 낮을수록 좋음
    thresholds: { bad: 7000, neutral: 5500, good: 4000 },
  },
};

export default function SensitivityHeatmap({
  baseValues,
  xVariable,
  yVariable,
  targetKpi,
  calculateKpi,
  gridSize = 5,
}: Props) {
  const config = KPI_CONFIG[targetKpi];

  // 그리드 데이터 생성
  const { xValues, yValues, matrix, minVal, maxVal } = useMemo(() => {
    const xMin = xVariable.range[0];
    const xMax = xVariable.range[1];
    const yMin = yVariable.range[0];
    const yMax = yVariable.range[1];

    const xStep = (xMax - xMin) / (gridSize - 1);
    const yStep = (yMax - yMin) / (gridSize - 1);

    const xVals = Array.from({ length: gridSize }, (_, i) => xMin + i * xStep);
    const yVals = Array.from({ length: gridSize }, (_, i) => yMin + i * yStep);

    let min = Infinity;
    let max = -Infinity;

    const mat = yVals.map((yVal) =>
      xVals.map((xVal) => {
        const kpi = calculateKpi(xVal, yVal);
        if (kpi < min) min = kpi;
        if (kpi > max) max = kpi;
        return kpi;
      })
    );

    return { xValues: xVals, yValues: yVals, matrix: mat, minVal: min, maxVal: max };
  }, [xVariable, yVariable, gridSize, calculateKpi]);

  // 색상 계산
  const getColor = (value: number): string => {
    const range = maxVal - minVal;
    if (range === 0) return '#f3f4f6';

    let normalized = (value - minVal) / range;
    if (config.colorReverse) normalized = 1 - normalized;

    // 빨강(나쁨) -> 노랑(중립) -> 초록(좋음)
    if (normalized < 0.5) {
      const t = normalized * 2;
      // 빨강 -> 노랑
      const r = 239;
      const g = Math.round(68 + (234 - 68) * t);
      const b = Math.round(68 + (179 - 68) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (normalized - 0.5) * 2;
      // 노랑 -> 초록
      const r = Math.round(234 + (34 - 234) * t);
      const g = Math.round(179 + (197 - 179) * t);
      const b = Math.round(68 + (94 - 68) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // 기준점 위치 찾기
  const baseXIdx = xValues.findIndex((v) => Math.abs(v - baseValues.xValue) < (xValues[1] - xValues[0]) * 0.6);
  const baseYIdx = yValues.findIndex((v) => Math.abs(v - baseValues.yValue) < (yValues[1] - yValues[0]) * 0.6);

  // 축 포맷팅
  const formatAxisValue = (value: number, unit: string): string => {
    if (unit === '원' || unit === '억원') {
      if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(0)}조`;
      if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(0)}억`;
      if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(0)}만`;
      return value.toFixed(0);
    }
    if (unit === '원/kWh') return `${value.toFixed(0)}`;
    if (unit === '%') return `${value.toFixed(0)}%`;
    return value.toFixed(1);
  };

  return (
    <Card
      title={`${xVariable.label} vs ${yVariable.label} → ${config.label}`}
      description="두 변수 변동에 따른 지표 변화"
    >
      <div className="space-y-4">
        {/* 범례 */}
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="text-rose-600 font-medium">
            {config.colorReverse ? '높음 (나쁨)' : '낮음 (나쁨)'}
          </span>
          <div className="flex-1 mx-4 h-3 rounded-full overflow-hidden">
            <div
              className="w-full h-full"
              style={{
                background: config.colorReverse
                  ? 'linear-gradient(to right, #22c55e, #eab308, #ef4444)'
                  : 'linear-gradient(to right, #ef4444, #eab308, #22c55e)',
              }}
            />
          </div>
          <span className="text-emerald-600 font-medium">
            {config.colorReverse ? '낮음 (좋음)' : '높음 (좋음)'}
          </span>
        </div>

        {/* 히트맵 */}
        <div className="relative pl-16 pb-8">
          {/* Y축 레이블 */}
          <div className="absolute left-0 top-0 bottom-8 w-14 flex flex-col justify-between items-end pr-2">
            {[...yValues].reverse().map((value, i) => (
              <div key={i} className="text-xs text-dark-500">
                {formatAxisValue(value, yVariable.unit)}
              </div>
            ))}
          </div>

          {/* Y축 이름 */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}
          >
            <span className="text-xs font-medium text-dark-600">{yVariable.label}</span>
          </div>

          {/* 그리드 */}
          <div
            className="grid gap-0.5 bg-dark-200 rounded-lg overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {[...matrix].reverse().map((row, yi) =>
              row.map((value, xi) => {
                const isBase = xi === baseXIdx && (gridSize - 1 - yi) === baseYIdx;
                return (
                  <div
                    key={`${xi}-${yi}`}
                    className={`relative flex items-center justify-center p-2 min-h-[48px] transition-all hover:opacity-80 ${
                      isBase ? 'ring-2 ring-primary-500 ring-inset' : ''
                    }`}
                    style={{ backgroundColor: getColor(value) }}
                    title={`${xVariable.label}: ${formatAxisValue(xValues[xi], xVariable.unit)}\n${yVariable.label}: ${formatAxisValue(yValues[gridSize - 1 - yi], yVariable.unit)}\n${config.label}: ${config.format(value)}`}
                  >
                    <span className={`text-xs font-medium ${
                      value > (maxVal + minVal) / 2
                        ? (config.colorReverse ? 'text-dark-700' : 'text-white')
                        : (config.colorReverse ? 'text-white' : 'text-dark-700')
                    }`}>
                      {config.format(value)}
                    </span>
                    {isBase && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* X축 레이블 */}
          <div className="flex justify-between mt-2 px-1">
            {xValues.map((value, i) => (
              <div key={i} className="text-xs text-dark-500 text-center">
                {formatAxisValue(value, xVariable.unit)}
              </div>
            ))}
          </div>

          {/* X축 이름 */}
          <div className="text-center text-xs font-medium text-dark-600 mt-1">
            {xVariable.label}
          </div>
        </div>

        {/* 기준점 정보 */}
        <div className="flex items-center justify-center gap-2 p-3 bg-primary-50 rounded-xl text-sm">
          <div className="w-3 h-3 bg-primary-500 rounded-full" />
          <span className="text-dark-600">기준점:</span>
          <span className="font-semibold text-dark-800">
            {xVariable.label} = {formatAxisValue(baseValues.xValue, xVariable.unit)},
            {' '}{yVariable.label} = {formatAxisValue(baseValues.yValue, yVariable.unit)}
          </span>
          <span className="text-dark-600">→</span>
          <span className="font-bold text-primary-600">
            {config.label}: {config.format(baseValues.kpiValue)}
          </span>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="p-2 bg-rose-50 rounded-lg">
            <div className="text-xs text-rose-600">최소</div>
            <div className="font-semibold text-rose-700">{config.format(config.colorReverse ? maxVal : minVal)}</div>
          </div>
          <div className="p-2 bg-amber-50 rounded-lg">
            <div className="text-xs text-amber-600">기준</div>
            <div className="font-semibold text-amber-700">{config.format(baseValues.kpiValue)}</div>
          </div>
          <div className="p-2 bg-emerald-50 rounded-lg">
            <div className="text-xs text-emerald-600">최대</div>
            <div className="font-semibold text-emerald-700">{config.format(config.colorReverse ? minVal : maxVal)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
