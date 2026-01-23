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
import type { SensitivityItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  data: SensitivityItem[];
  baseNpv: number;
}

const variableLabels: Record<string, string> = {
  electricity_price: '전력가격',
  h2_price: '수소가격',
  availability: '가동률',
  efficiency: '효율',
  capex: 'CAPEX',
};

export default function TornadoChart({ data, baseNpv }: Props) {
  // 토네이도 차트 데이터 변환
  const chartData = data.map((item) => ({
    name: variableLabels[item.variable] || item.variable,
    low: item.lowCase - baseNpv,
    high: item.highCase - baseNpv,
    lowPct: item.lowChangePct,
    highPct: item.highChangePct,
    range: Math.abs(item.highCase - item.lowCase),
  })).sort((a, b) => b.range - a.range);

  return (
    <Card title="민감도 분석 (토네이도 차트)" description="변수 변동에 따른 NPV 민감도">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatCurrency(v, true)}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={70}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const label = name === 'low' ? '하위 케이스' : '상위 케이스';
                return [formatCurrency(value + baseNpv, true), label];
              }}
            />
            <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={2} />
            <Bar dataKey="low" stackId="a" fill="#ef4444" radius={[4, 0, 0, 4]} />
            <Bar dataKey="high" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 상세 테이블 */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">변수</th>
              <th className="text-right py-2 font-medium text-gray-600">-20% 시 NPV</th>
              <th className="text-right py-2 font-medium text-gray-600">+20% 시 NPV</th>
              <th className="text-right py-2 font-medium text-gray-600">영향 범위</th>
            </tr>
          </thead>
          <tbody>
            {chartData.slice(0, 5).map((item) => (
              <tr key={item.name} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{item.name}</td>
                <td className="py-2 text-right text-red-600">
                  {formatCurrency(item.low + baseNpv, true)}
                </td>
                <td className="py-2 text-right text-green-600">
                  {formatCurrency(item.high + baseNpv, true)}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {formatCurrency(item.range, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 계산 로직 설명 (임시) */}
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
        <p className="font-semibold mb-1">민감도 분석 (sensitivity.py)</p>
        <p>- 각 변수를 ±범위로 변동시킨 후 NPV 재계산</p>
        <p>- 전력가격 ±20%, 수소가격 ±10%, 가동률 ±5%</p>
        <p>- 효율 ±3%, CAPEX ±15%</p>
        <p className="mt-1">영향 범위 = |고케이스 NPV - 저케이스 NPV|</p>
      </div>
    </Card>
  );
}
