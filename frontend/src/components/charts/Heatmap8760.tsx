import { useMemo } from 'react';
import { Card } from '../common';

interface Props {
  data: number[]; // 8760개 시간별 데이터
  title?: string;
  description?: string;
  colorScale?: 'green' | 'blue' | 'red';
}

export default function Heatmap8760({
  data,
  title = '8760 시간별 운영 패턴',
  description = '365일 x 24시간 가동 히트맵',
  colorScale = 'green',
}: Props) {
  // 데이터를 365일 x 24시간 행렬로 변환
  const heatmapData = useMemo(() => {
    const matrix: number[][] = [];
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    for (let day = 0; day < 365; day++) {
      const dayData: number[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const index = day * 24 + hour;
        const value = data[index] || 0;
        // 0-1 정규화
        const normalized = (value - minValue) / range;
        dayData.push(normalized);
      }
      matrix.push(dayData);
    }

    return matrix;
  }, [data]);

  // 색상 스케일
  const getColor = (value: number): string => {
    const intensity = Math.round(value * 255);
    switch (colorScale) {
      case 'green':
        return `rgb(${255 - intensity}, 255, ${255 - intensity})`;
      case 'blue':
        return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
      case 'red':
        return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
      default:
        return `rgb(${255 - intensity}, 255, ${255 - intensity})`;
    }
  };

  // 월별 라벨
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return (
    <Card title={title} description={description}>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* 시간 라벨 */}
          <div className="flex ml-12 mb-1">
            {[0, 6, 12, 18, 23].map((hour) => (
              <div
                key={hour}
                className="text-xs text-gray-500"
                style={{ marginLeft: hour === 0 ? 0 : `${((hour - (hour > 0 ? [0, 6, 12, 18][Math.floor(hour / 6) - 1] || 0 : 0)) / 24) * 100}%` }}
              >
                {hour}시
              </div>
            ))}
          </div>

          {/* 히트맵 */}
          <div className="flex">
            {/* 월 라벨 */}
            <div className="w-12 flex flex-col">
              {months.map((month, i) => {
                const daysBefore = monthDays.slice(0, i).reduce((a, b) => a + b, 0);
                const top = (daysBefore / 365) * 100;
                return (
                  <div
                    key={month}
                    className="text-xs text-gray-500 absolute"
                    style={{ top: `${top}%` }}
                  >
                    {month}
                  </div>
                );
              })}
            </div>

            {/* 히트맵 그리드 */}
            <div className="flex-1 relative" style={{ height: '300px' }}>
              <svg width="100%" height="100%" viewBox="0 0 24 365" preserveAspectRatio="none">
                {heatmapData.map((dayData, day) => (
                  dayData.map((value, hour) => (
                    <rect
                      key={`${day}-${hour}`}
                      x={hour}
                      y={day}
                      width={1}
                      height={1}
                      fill={getColor(value)}
                    />
                  ))
                ))}
              </svg>
            </div>
          </div>

          {/* 컬러바 */}
          <div className="mt-4 flex items-center justify-center space-x-4">
            <span className="text-xs text-gray-500">낮음</span>
            <div
              className="w-32 h-4 rounded"
              style={{
                background: `linear-gradient(to right, ${getColor(0)}, ${getColor(0.5)}, ${getColor(1)})`,
              }}
            />
            <span className="text-xs text-gray-500">높음</span>
          </div>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">총 가동 시간</div>
          <div className="text-lg font-semibold text-gray-900">
            {data.filter((v) => v > 0).length.toLocaleString()} 시간
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">가동률</div>
          <div className="text-lg font-semibold text-gray-900">
            {((data.filter((v) => v > 0).length / 8760) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">평균 생산량</div>
          <div className="text-lg font-semibold text-gray-900">
            {(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)} kg/h
          </div>
        </div>
      </div>

      {/* 계산 로직 설명 (임시) */}
      <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-700">
        <p className="font-semibold mb-1">8760 시간별 계산 (energy_8760.py)</p>
        <p>- 시간별 발전량 = 설비용량 × 이용률(t) × 효율</p>
        <p>- 시간별 수소생산 = 전력(kW) / 비소비량(kWh/kg)</p>
        <p>- 가동 판단: 전력가격(t) &lt; 기준가격 일 때 운전</p>
        <p>- 효율 보정: 부분부하 효율곡선 적용</p>
        <p className="mt-1">총 8760시간 (365일 × 24시간) 시뮬레이션</p>
        <p className="text-teal-600">* 기상데이터: 태양광/풍력 시간대별 이용률 반영</p>
      </div>
    </Card>
  );
}
