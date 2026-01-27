import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '../common';
import type { HistogramBin } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface Props {
  title?: string;
  data: HistogramBin[];
  p50?: number;
  p90?: number;
  p99?: number;
  unit?: string;
  formatFn?: (value: number) => string;
}

export default function DistributionHistogram({
  title = 'NPV 분포',
  data,
  p50,
  p90,
  p99,
  unit: _unit = '원',
  formatFn = (v) => formatCurrency(v, true),
}: Props) {
  // 데이터 변환
  const chartData = data.map((d) => ({
    bin: d.bin,
    count: d.count,
    label: formatFn(d.bin),
  }));

  return (
    <Card title={title}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="bin"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatFn(v)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip
              formatter={(value: number) => [formatNumber(value), '빈도']}
              labelFormatter={(label) => `${formatFn(Number(label))}`}
            />
            <Bar
              dataKey="count"
              fill="#0ea5e9"
              radius={[2, 2, 0, 0]}
            />
            {p50 !== undefined && (
              <ReferenceLine
                x={p50}
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ value: 'P50', fill: '#22c55e', fontSize: 10 }}
              />
            )}
            {p90 !== undefined && (
              <ReferenceLine
                x={p90}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ value: 'P90', fill: '#f59e0b', fontSize: 10 }}
              />
            )}
            {p99 !== undefined && (
              <ReferenceLine
                x={p99}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ value: 'P99', fill: '#ef4444', fontSize: 10 }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="flex justify-center space-x-6 mt-4 text-sm">
        {p50 !== undefined && (
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2" />
            <span>P50: {formatFn(p50)}</span>
          </div>
        )}
        {p90 !== undefined && (
          <div className="flex items-center">
            <div className="w-3 h-3 bg-amber-500 rounded mr-2" />
            <span>P90: {formatFn(p90)}</span>
          </div>
        )}
        {p99 !== undefined && (
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2" />
            <span>P99: {formatFn(p99)}</span>
          </div>
        )}
      </div>

      {/* 계산 로직 설명 */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 space-y-1">
        <p className="font-semibold mb-2 text-gray-600">몬테카를로 시뮬레이션 (monte_carlo.py)</p>
        <p>• 반복 횟수: 10,000회 (설정 가능)</p>
        <p>• 가격 변동성: 로그정규분포 (σ=0.15)</p>
        <p>• 기상 변동성: 정규분포 (σ=0.1)</p>
        <p>• 효율 저하: 연간 0.5% 감소 반영</p>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="font-medium text-gray-600">P50 = 중앙값 (50번째 백분위)</p>
          <p className="font-medium text-gray-600">P90 = 90번째 백분위 (보수적 추정)</p>
          <p className="font-medium text-gray-600">P99 = 99번째 백분위 (극단적 시나리오)</p>
        </div>
      </div>
    </Card>
  );
}
