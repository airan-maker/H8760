/**
 * Grid Search 히트맵 컴포넌트
 */
import { useMemo } from 'react';
import type { HeatmapData, GridSearchResultItem } from '../../types/optimization';
import { VARIABLE_DISPLAY_NAMES } from '../../types/optimization';

interface Props {
  data: HeatmapData;
  onCellClick?: (x: number, y: number, value: number) => void;
  selectedCell?: { x: number; y: number } | null;
}

export default function GridHeatmap({ data, onCellClick, selectedCell }: Props) {
  // 색상 스케일 계산
  const { minZ, maxZ, colorScale } = useMemo(() => {
    const allValues = data.zMatrix.flat().filter((v) => v !== null) as number[];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // NPV나 IRR은 높을수록 좋고, LCOH는 낮을수록 좋음
    const isReverse = data.zVariable === 'lcoh';

    const getColor = (value: number | null): string => {
      if (value === null) return '#f3f4f6';

      let normalized = (value - min) / (max - min || 1);
      if (isReverse) normalized = 1 - normalized;

      // 빨강(나쁨) -> 노랑 -> 초록(좋음) 그라데이션
      if (normalized < 0.5) {
        const t = normalized * 2;
        const r = 239;
        const g = Math.round(68 + (180 - 68) * t);
        const b = Math.round(68 + (30 - 68) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = (normalized - 0.5) * 2;
        const r = Math.round(239 + (34 - 239) * t);
        const g = Math.round(180 + (197 - 180) * t);
        const b = Math.round(30 + (94 - 30) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    return { minZ: min, maxZ: max, colorScale: getColor };
  }, [data]);

  // 값 포맷팅
  const formatValue = (value: number | null): string => {
    if (value === null) return '-';

    if (data.zVariable === 'npv_p50') {
      return `${(value / 1e8).toFixed(1)}억`;
    } else if (data.zVariable === 'irr_p50') {
      return `${value.toFixed(1)}%`;
    } else if (data.zVariable === 'lcoh') {
      return `${value.toLocaleString()}`;
    }
    return value.toFixed(2);
  };

  const xDisplayName = VARIABLE_DISPLAY_NAMES[data.xVariable] || data.xVariable;
  const yDisplayName = VARIABLE_DISPLAY_NAMES[data.yVariable] || data.yVariable;

  return (
    <div className="space-y-4">
      {/* 레전드 */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-dark-500">
          {data.zVariable === 'lcoh' ? '높음 (나쁨)' : '낮음 (나쁨)'}
        </span>
        <div className="flex-1 mx-4 h-4 rounded-full overflow-hidden">
          <div
            className="w-full h-full"
            style={{
              background:
                data.zVariable === 'lcoh'
                  ? 'linear-gradient(to right, #22c55e, #eab308, #ef4444)'
                  : 'linear-gradient(to right, #ef4444, #eab308, #22c55e)',
            }}
          />
        </div>
        <span className="text-sm text-dark-500">
          {data.zVariable === 'lcoh' ? '낮음 (좋음)' : '높음 (좋음)'}
        </span>
      </div>

      {/* 히트맵 */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* X축 레이블 */}
          <div className="flex">
            <div className="w-20 flex-shrink-0" /> {/* Y축 공간 */}
            {data.xValues.map((xVal, i) => (
              <div
                key={i}
                className="flex-1 min-w-[60px] text-center text-xs text-dark-500 pb-1"
              >
                {typeof xVal === 'number' && xVal >= 1e9
                  ? `${(xVal / 1e9).toFixed(0)}B`
                  : xVal}
              </div>
            ))}
          </div>

          {/* 그리드 */}
          <div className="flex flex-col">
            {data.yValues.map((yVal, yi) => (
              <div key={yi} className="flex">
                {/* Y축 레이블 */}
                <div className="w-20 flex-shrink-0 flex items-center justify-end pr-2 text-xs text-dark-500">
                  {typeof yVal === 'number' && yVal >= 1e9
                    ? `${(yVal / 1e9).toFixed(0)}B`
                    : yVal}
                </div>

                {/* 셀 */}
                {data.zMatrix[yi].map((zVal, xi) => {
                  const isSelected =
                    selectedCell?.x === xi && selectedCell?.y === yi;

                  return (
                    <div
                      key={xi}
                      onClick={() =>
                        onCellClick && zVal !== null && onCellClick(xi, yi, zVal)
                      }
                      className={`
                        flex-1 min-w-[60px] h-14 flex items-center justify-center
                        text-xs font-medium border border-white/50
                        ${onCellClick && zVal !== null ? 'cursor-pointer hover:opacity-80' : ''}
                        ${isSelected ? 'ring-2 ring-hydrogen-500 ring-offset-1' : ''}
                        transition-all
                      `}
                      style={{ backgroundColor: colorScale(zVal) }}
                      title={zVal !== null ? formatValue(zVal) : '데이터 없음'}
                    >
                      <span
                        className={`${
                          zVal !== null &&
                          ((data.zVariable !== 'lcoh' && zVal > (maxZ + minZ) / 2) ||
                            (data.zVariable === 'lcoh' && zVal < (maxZ + minZ) / 2))
                            ? 'text-white'
                            : 'text-dark-700'
                        }`}
                      >
                        {formatValue(zVal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 축 이름 */}
          <div className="flex mt-2">
            <div className="w-20 flex-shrink-0" />
            <div className="flex-1 text-center text-sm font-medium text-dark-600">
              {xDisplayName}
            </div>
          </div>
        </div>
      </div>

      {/* Y축 이름 */}
      <div className="text-center text-sm font-medium text-dark-600 -rotate-0">
        Y축: {yDisplayName}
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-dark-50 rounded-lg">
          <div className="text-xs text-dark-400">최소값</div>
          <div className="text-sm font-semibold text-dark-700">
            {formatValue(minZ)}
          </div>
        </div>
        <div className="p-3 bg-dark-50 rounded-lg">
          <div className="text-xs text-dark-400">평균값</div>
          <div className="text-sm font-semibold text-dark-700">
            {formatValue(
              data.zMatrix.flat().filter((v) => v !== null).reduce((a, b) => a! + b!, 0)! /
                data.zMatrix.flat().filter((v) => v !== null).length
            )}
          </div>
        </div>
        <div className="p-3 bg-dark-50 rounded-lg">
          <div className="text-xs text-dark-400">최대값</div>
          <div className="text-sm font-semibold text-dark-700">
            {formatValue(maxZ)}
          </div>
        </div>
      </div>
    </div>
  );
}
