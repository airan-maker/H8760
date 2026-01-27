/**
 * AI 추천 결과 카드 컴포넌트
 */
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type { AIRecommendation } from '../../types/optimization';
import { VARIABLE_DISPLAY_NAMES } from '../../types/optimization';

interface Props {
  recommendation: AIRecommendation;
  baseKpis?: Record<string, number>;
  isSelected?: boolean;
  onApply?: () => void;
  onApplyAndRun?: () => void;
}

export default function RecommendationCard({
  recommendation,
  baseKpis,
  isSelected = false,
  onApply,
  onApplyAndRun,
}: Props) {
  const { rank, recommendedInput, expectedKpis, reasoning, confidence, tradeOffs } =
    recommendation;

  // 값 포맷팅
  const formatKpiValue = (kpi: string, value: number): string => {
    if (kpi.includes('npv')) {
      return `${(value / 1e8).toFixed(1)}억`;
    } else if (kpi.includes('irr')) {
      return `${value.toFixed(1)}%`;
    } else if (kpi.includes('lcoh')) {
      return `${value.toLocaleString()}원/kg`;
    } else if (kpi.includes('dscr')) {
      return value.toFixed(2);
    }
    return value.toFixed(2);
  };

  // 변수값 포맷팅
  const formatVarValue = (key: string, value: unknown): string => {
    const numValue = Number(value);
    if (key.includes('capex')) {
      return `${(numValue / 1e8).toFixed(0)}억원`;
    } else if (key.includes('price') && !key.includes('ppa')) {
      return `${numValue.toLocaleString()}원/kg`;
    } else if (key.includes('ppa')) {
      return `${numValue}원/kWh`;
    } else if (key.includes('capacity')) {
      return `${numValue}MW`;
    } else if (
      key.includes('rate') ||
      key.includes('ratio') ||
      key.includes('efficiency') ||
      key.includes('availability')
    ) {
      return `${numValue}%`;
    }
    return String(value);
  };

  // 개선율 계산
  const getImprovement = (kpi: string): number | null => {
    if (!baseKpis) return null;
    const baseKey = kpi.replace('_p50', '').replace('P50', '');
    const baseValue =
      baseKpis[kpi] || baseKpis[baseKey + '_p50'] || baseKpis[baseKey + 'P50'];
    const newValue = expectedKpis[kpi];

    if (baseValue === undefined || newValue === undefined) return null;
    if (baseValue === 0) return null;

    return ((newValue - baseValue) / Math.abs(baseValue)) * 100;
  };

  // 랭크별 스타일
  const rankStyles = {
    1: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300',
    2: 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300',
    3: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400',
  };

  const rankBadgeStyles = {
    1: 'bg-yellow-400 text-yellow-900',
    2: 'bg-gray-300 text-gray-700',
    3: 'bg-amber-600 text-white',
  };

  return (
    <div
      className={`
        p-5 rounded-2xl border-2 transition-all
        ${
          isSelected
            ? 'border-hydrogen-500 ring-2 ring-hydrogen-200'
            : rank <= 3
            ? rankStyles[rank as 1 | 2 | 3]
            : 'bg-white border-gray-200'
        }
      `}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold
              ${
                rank <= 3
                  ? rankBadgeStyles[rank as 1 | 2 | 3]
                  : 'bg-dark-100 text-dark-600'
              }
            `}
          >
            {rank}
          </div>
          <div>
            <div className="font-semibold text-dark-800">추천안 #{rank}</div>
            <div className="text-sm text-dark-400 flex items-center gap-1">
              <SparklesIcon className="w-4 h-4" />
              신뢰도: {(confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onApply && (
            <button
              onClick={onApply}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  isSelected
                    ? 'bg-hydrogen-500 text-white'
                    : 'bg-hydrogen-50 text-hydrogen-600 hover:bg-hydrogen-100'
                }
              `}
            >
              {isSelected ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                  적용됨
                </>
              ) : (
                '설정 적용'
              )}
            </button>
          )}
          {onApplyAndRun && (
            <button
              onClick={onApplyAndRun}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-hydrogen-500 to-primary-600 text-white hover:from-hydrogen-600 hover:to-primary-700 transition-colors"
            >
              적용 후 시뮬레이션 실행
            </button>
          )}
        </div>
      </div>

      {/* 추천 변수값 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-dark-600 mb-2">추천 파라미터</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(recommendedInput).map(([key, value]) => (
            <div
              key={key}
              className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm"
            >
              <span className="text-dark-500">
                {VARIABLE_DISPLAY_NAMES[key] || key}:
              </span>{' '}
              <span className="font-medium text-dark-700">
                {formatVarValue(key, value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 예상 KPI */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-dark-600 mb-2">예상 결과</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(expectedKpis).map(([kpi, value]) => {
            const improvement = getImprovement(kpi);
            const isPositive =
              kpi.includes('lcoh') ? improvement && improvement < 0 : improvement && improvement > 0;

            return (
              <div
                key={kpi}
                className="p-3 bg-white rounded-lg border border-gray-100"
              >
                <div className="text-xs text-dark-400 uppercase">
                  {kpi.replace('_p50', '').replace('P50', '')}
                </div>
                <div className="text-lg font-bold text-dark-800">
                  {formatKpiValue(kpi, value)}
                </div>
                {improvement !== null && (
                  <div
                    className={`text-xs font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {improvement > 0 ? '+' : ''}
                    {improvement.toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 추천 근거 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-dark-600 mb-2">추천 근거</h4>
        <p className="text-sm text-dark-700 bg-gray-50 rounded-lg p-3">
          {reasoning}
        </p>
      </div>

      {/* 트레이드오프 */}
      {tradeOffs && tradeOffs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-dark-600 mb-2 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
            고려 사항
          </h4>
          <ul className="text-sm text-dark-600 space-y-1">
            {tradeOffs.map((tradeOff, index) => (
              <li
                key={index}
                className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2"
              >
                <span className="text-amber-500">•</span>
                {tradeOff}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
