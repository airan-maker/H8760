/**
 * 등고선 차트 컴포넌트
 *
 * 2D 등고선 시각화 (히트맵 + 최적점 표시)
 */
import { useMemo } from 'react';
import type { ContourData } from '../../types/optimization';
import { VARIABLE_DISPLAY_NAMES } from '../../types/optimization';

interface Props {
  data: ContourData;
  targetKpi?: string;
  showOptimalPoint?: boolean;
}

export default function ContourChart({
  data,
  targetKpi = 'npv_p50',
  showOptimalPoint = true,
}: Props) {
  // 색상 스케일 계산
  const { minZ, maxZ, colorScale } = useMemo(() => {
    const allValues = data.zMatrix.flat().filter((v) => v !== null) as number[];
    if (allValues.length === 0) {
      return { minZ: 0, maxZ: 1, colorScale: () => '#f3f4f6' };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // LCOH는 낮을수록 좋음
    const isReverse = targetKpi === 'lcoh';

    const getColor = (value: number | null): string => {
      if (value === null) return '#f3f4f6';

      let normalized = (value - min) / (max - min || 1);
      if (isReverse) normalized = 1 - normalized;

      // 파랑(나쁨) -> 초록 -> 노랑 -> 빨강(좋음) 그라데이션
      if (normalized < 0.25) {
        const t = normalized * 4;
        return interpolateColor('#3b82f6', '#10b981', t);
      } else if (normalized < 0.5) {
        const t = (normalized - 0.25) * 4;
        return interpolateColor('#10b981', '#84cc16', t);
      } else if (normalized < 0.75) {
        const t = (normalized - 0.5) * 4;
        return interpolateColor('#84cc16', '#eab308', t);
      } else {
        const t = (normalized - 0.75) * 4;
        return interpolateColor('#eab308', '#ef4444', t);
      }
    };

    return { minZ: min, maxZ: max, colorScale: getColor };
  }, [data, targetKpi]);

  // 색상 보간
  function interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  // 값 포맷팅
  const formatValue = (value: number | null): string => {
    if (value === null) return '-';

    if (targetKpi === 'npv_p50') {
      if (Math.abs(value) >= 1e12) {
        return `${(value / 1e12).toFixed(1)}조`;
      }
      return `${(value / 1e8).toFixed(1)}억`;
    } else if (targetKpi === 'irr_p50') {
      return `${value.toFixed(1)}%`;
    } else if (targetKpi === 'lcoh') {
      return `${value.toLocaleString()}`;
    }
    return value.toFixed(2);
  };

  // 축 값 포맷팅
  const formatAxisValue = (value: number): string => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(0)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toFixed(1);
  };

  // 최적점 위치 계산
  const optimalPosition = useMemo(() => {
    if (!data.optimalPoint) return null;

    const xIdx = data.xValues.findIndex(
      (v) => Math.abs(v - data.optimalPoint!.x) < 0.001
    );
    const yIdx = data.yValues.findIndex(
      (v) => Math.abs(v - data.optimalPoint!.y) < 0.001
    );

    if (xIdx === -1 || yIdx === -1) return null;

    return {
      xPercent: (xIdx / (data.xValues.length - 1)) * 100,
      yPercent: (1 - yIdx / (data.yValues.length - 1)) * 100,
    };
  }, [data]);

  const xDisplayName =
    VARIABLE_DISPLAY_NAMES[data.xVariable] || data.xVariable;
  const yDisplayName =
    VARIABLE_DISPLAY_NAMES[data.yVariable] || data.yVariable;

  // 간소화된 축 레이블 (5개만 표시)
  const xLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(data.xValues.length / 5));
    return data.xValues.filter((_, i) => i % step === 0);
  }, [data.xValues]);

  const yLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(data.yValues.length / 5));
    return data.yValues.filter((_, i) => i % step === 0);
  }, [data.yValues]);

  return (
    <div className="space-y-4">
      {/* 레전드 */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-dark-500">
          {targetKpi === 'lcoh' ? '높음 (나쁨)' : '낮음 (나쁨)'}
        </span>
        <div className="flex-1 mx-4 h-4 rounded-full overflow-hidden">
          <div
            className="w-full h-full"
            style={{
              background:
                targetKpi === 'lcoh'
                  ? 'linear-gradient(to right, #ef4444, #eab308, #84cc16, #10b981, #3b82f6)'
                  : 'linear-gradient(to right, #3b82f6, #10b981, #84cc16, #eab308, #ef4444)',
            }}
          />
        </div>
        <span className="text-sm text-dark-500">
          {targetKpi === 'lcoh' ? '낮음 (좋음)' : '높음 (좋음)'}
        </span>
      </div>

      {/* 차트 영역 */}
      <div className="relative">
        {/* Y축 레이블 */}
        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-right pr-2">
          {[...yLabels].reverse().map((value, i) => (
            <div key={i} className="text-xs text-dark-400">
              {formatAxisValue(value)}
            </div>
          ))}
        </div>

        {/* 메인 차트 */}
        <div className="ml-16">
          <div
            className="relative grid gap-px bg-gray-200 rounded-lg overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${data.xValues.length}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${data.yValues.length}, minmax(0, 1fr))`,
              aspectRatio: `${data.xValues.length}/${data.yValues.length}`,
              minHeight: '300px',
            }}
          >
            {/* 등고선 셀 */}
            {data.zMatrix
              .slice()
              .reverse()
              .map((row, yi) =>
                row.map((value, xi) => (
                  <div
                    key={`${xi}-${yi}`}
                    className="transition-opacity hover:opacity-80"
                    style={{ backgroundColor: colorScale(value) }}
                    title={`${xDisplayName}: ${formatAxisValue(
                      data.xValues[xi]
                    )}, ${yDisplayName}: ${formatAxisValue(
                      data.yValues[data.yValues.length - 1 - yi]
                    )}, 값: ${formatValue(value)}`}
                  />
                ))
              )}

            {/* 최적점 마커 */}
            {showOptimalPoint && optimalPosition && (
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  left: `${optimalPosition.xPercent}%`,
                  top: `${optimalPosition.yPercent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative">
                  <div className="absolute inset-0 w-8 h-8 bg-white rounded-full animate-ping opacity-75" />
                  <div className="relative w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-gradient-to-br from-hydrogen-500 to-primary-600 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* X축 레이블 */}
          <div className="flex justify-between mt-2">
            {xLabels.map((value, i) => (
              <div key={i} className="text-xs text-dark-400">
                {formatAxisValue(value)}
              </div>
            ))}
          </div>

          {/* X축 이름 */}
          <div className="text-center text-sm font-medium text-dark-600 mt-2">
            {xDisplayName}
          </div>
        </div>

        {/* Y축 이름 */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          <span className="text-sm font-medium text-dark-600">
            {yDisplayName}
          </span>
        </div>
      </div>

      {/* 최적점 정보 */}
      {data.optimalPoint && (
        <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-hydrogen-50 to-primary-50 rounded-xl">
          <div className="w-4 h-4 bg-gradient-to-br from-hydrogen-500 to-primary-600 rounded-full" />
          <div className="text-sm">
            <span className="text-dark-600">최적점: </span>
            <span className="font-semibold text-dark-800">
              {xDisplayName} = {formatAxisValue(data.optimalPoint.x)},{' '}
              {yDisplayName} = {formatAxisValue(data.optimalPoint.y)}
            </span>
            <span className="text-dark-600 ml-2">
              → {targetKpi === 'lcoh' ? 'LCOH' : targetKpi === 'irr_p50' ? 'IRR' : 'NPV'}:{' '}
              <span className="font-bold text-hydrogen-600">
                {formatValue(data.optimalPoint.z)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 범위 정보 */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div className="p-2 bg-dark-50 rounded-lg">
          <div className="text-xs text-dark-400">최소값</div>
          <div className="font-semibold text-dark-700">{formatValue(minZ)}</div>
        </div>
        <div className="p-2 bg-dark-50 rounded-lg">
          <div className="text-xs text-dark-400">평균값</div>
          <div className="font-semibold text-dark-700">
            {formatValue(
              data.zMatrix.flat().filter((v) => v !== null).reduce((a, b) => a! + b!, 0)! /
                data.zMatrix.flat().filter((v) => v !== null).length
            )}
          </div>
        </div>
        <div className="p-2 bg-dark-50 rounded-lg">
          <div className="text-xs text-dark-400">최대값</div>
          <div className="font-semibold text-dark-700">{formatValue(maxZ)}</div>
        </div>
      </div>
    </div>
  );
}
