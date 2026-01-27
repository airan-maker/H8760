/**
 * 민감도 순위 컴포넌트
 */
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import type { SensitivityRank } from '../../types/optimization';

interface Props {
  ranking: SensitivityRank[];
  selectedVariables: string[];
  onSelectVariable: (variable: string) => void;
  maxSelect?: number;
}

export default function SensitivityRanking({
  ranking,
  selectedVariables,
  onSelectVariable,
  maxSelect = 2,
}: Props) {
  // 영향도 점수의 최대값 (바 너비 계산용)
  const maxImpact = Math.max(...ranking.map((r) => r.impactScore), 1);

  // 값 포맷팅
  const formatNPV = (value: number): string => {
    if (Math.abs(value) >= 1e12) {
      return `${(value / 1e12).toFixed(1)}조`;
    }
    if (Math.abs(value) >= 1e8) {
      return `${(value / 1e8).toFixed(1)}억`;
    }
    return `${(value / 1e6).toFixed(0)}백만`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-dark-500 mb-4">
        <span>변수별 NPV 영향도</span>
        <span>
          {selectedVariables.length}/{maxSelect} 선택됨
        </span>
      </div>

      {ranking.map((item, index) => {
        const isSelected = selectedVariables.includes(item.variable);
        const canSelect =
          isSelected || selectedVariables.length < maxSelect;

        return (
          <button
            key={item.variable}
            onClick={() => canSelect && onSelectVariable(item.variable)}
            disabled={!canSelect}
            className={`
              w-full p-4 rounded-xl border-2 transition-all text-left
              ${
                isSelected
                  ? 'border-hydrogen-500 bg-hydrogen-50'
                  : canSelect
                  ? 'border-gray-200 bg-white hover:border-hydrogen-300'
                  : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`
                    inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${
                      index === 0
                        ? 'bg-yellow-400 text-yellow-900'
                        : index === 1
                        ? 'bg-gray-300 text-gray-700'
                        : index === 2
                        ? 'bg-amber-600 text-white'
                        : 'bg-dark-100 text-dark-600'
                    }
                  `}
                >
                  {index + 1}
                </span>
                <span className="font-semibold text-dark-800">
                  {item.displayName}
                </span>
              </div>
              {isSelected && (
                <span className="text-xs px-2 py-0.5 bg-hydrogen-500 text-white rounded-full">
                  선택됨
                </span>
              )}
            </div>

            {/* 영향도 바 */}
            <div className="mb-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    isSelected
                      ? 'bg-gradient-to-r from-hydrogen-500 to-primary-600'
                      : 'bg-dark-400'
                  }`}
                  style={{
                    width: `${(item.impactScore / maxImpact) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-dark-400 mt-1">
                <span>영향도: {item.impactScore.toFixed(1)}%</span>
                <span>NPV 변동폭: {formatNPV(item.npvSwing)}</span>
              </div>
            </div>

            {/* 변화율 */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <ArrowTrendingDownIcon
                  className={`w-4 h-4 ${
                    item.lowCasePct < 0 ? 'text-red-500' : 'text-green-500'
                  }`}
                />
                <span className="text-dark-500">-20%:</span>
                <span
                  className={`font-medium ${
                    item.lowCasePct < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {item.lowCasePct > 0 ? '+' : ''}
                  {item.lowCasePct.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowTrendingUpIcon
                  className={`w-4 h-4 ${
                    item.highCasePct > 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                />
                <span className="text-dark-500">+20%:</span>
                <span
                  className={`font-medium ${
                    item.highCasePct > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.highCasePct > 0 ? '+' : ''}
                  {item.highCasePct.toFixed(1)}%
                </span>
              </div>
            </div>
          </button>
        );
      })}

      {ranking.length === 0 && (
        <div className="text-center py-8 text-dark-400">
          민감도 분석 실행 후 결과가 표시됩니다.
        </div>
      )}
    </div>
  );
}
