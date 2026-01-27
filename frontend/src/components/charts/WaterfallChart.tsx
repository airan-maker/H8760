import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card } from '../common';
import type { RiskWaterfallItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  data: RiskWaterfallItem[];
}

export default function WaterfallChart({ data }: Props) {
  // 폭포수 차트 데이터 변환
  const chartData = data.map((item, index) => {
    const isFirst = index === 0;
    const isLast = index === data.length - 1;

    return {
      name: item.factor,
      value: item.impact,
      isPositive: item.impact >= 0,
      isTotal: isFirst || isLast,
    };
  });

  const getBarColor = (entry: typeof chartData[0]) => {
    if (entry.isTotal) return '#0ea5e9';
    return entry.isPositive ? '#22c55e' : '#ef4444';
  };

  return (
    <Card title="리스크 폭포수 차트" description="NPV에 대한 리스크 요인별 영향">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatCurrency(v, true)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={90}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value, true), 'NPV 영향']}
            />
            <ReferenceLine x={0} stroke="#9ca3af" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="flex justify-center space-x-6 mt-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-primary-500 rounded mr-2" />
          <span>기준/최종 NPV</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2" />
          <span>긍정적 영향</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded mr-2" />
          <span>부정적 영향</span>
        </div>
      </div>

      {/* 계산 로직 설명 */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 space-y-1">
        <p className="font-semibold mb-2 text-gray-600">리스크 분해 분석 (simulation_runner.py)</p>
        <p>• 기준 NPV: 결정론적 시나리오 (변동성 제외)</p>
        <p>• 기상 변동성: 발전량 불확실성 → 수소 생산량 영향</p>
        <p>• 전력가격 변동: 시간대별 전력비용 변동 영향</p>
        <p>• 효율 저하: 연간 성능 저하율 적용</p>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="font-medium text-gray-600">최종 NPV = 기준 NPV + Σ(리스크 요인별 영향)</p>
        </div>
      </div>
    </Card>
  );
}
