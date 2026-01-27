import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card } from '../common';
import type { YearlyCashflow } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  data: YearlyCashflow[];
}

export default function CashflowChart({ data }: Props) {
  return (
    <Card title="연간 현금흐름" description="프로젝트 기간 동안의 현금흐름 추이">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}년`}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatCurrency(v, true)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatCurrency(v, true)}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  netCashflow: '순현금흐름',
                  cumulativeCashflow: '누적현금흐름',
                  revenue: '수익',
                  opex: '운영비',
                };
                return [formatCurrency(value, true), labels[name] || name];
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  netCashflow: '순현금흐름',
                  cumulativeCashflow: '누적현금흐름',
                };
                return labels[value] || value;
              }}
            />
            <ReferenceLine yAxisId="left" y={0} stroke="#9ca3af" />
            <Bar
              yAxisId="left"
              dataKey="netCashflow"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativeCashflow"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 투자회수점 표시 */}
      {(() => {
        const paybackYear = data.findIndex((d) => d.cumulativeCashflow >= 0);
        if (paybackYear > 0) {
          return (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                투자회수점: {paybackYear}년차
              </span>
            </div>
          );
        }
        return null;
      })()}

      {/* 계산 로직 설명 */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 space-y-1">
        <p className="font-semibold mb-2 text-gray-600">연간 현금흐름 (financial.py)</p>
        <p>• 수익 = 수소판매수익 + 부산물(산소) 판매수익</p>
        <p>• 운영비(OPEX) = 전력구매비 + 유지보수비 + 인건비 + 보험료</p>
        <p>• 원리금상환 = 원금상환 + 이자비용 (대출기간 동안)</p>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="font-medium text-gray-600">순현금흐름 = 수익 - OPEX - 원리금상환 - 법인세</p>
          <p className="font-medium text-gray-600">누적현금흐름 = -CAPEX + Σ(연간 순현금흐름)</p>
          <p className="mt-1">* 투자회수점 = 누적현금흐름 ≥ 0 최초 연도</p>
        </div>
      </div>
    </Card>
  );
}
