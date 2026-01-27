/**
 * 변수 범위 선택 컴포넌트
 */
import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { VariableRange, OptimizableVariable } from '../../types/optimization';
import { OPTIMIZABLE_VARIABLES } from '../../types/optimization';

interface Props {
  selectedRanges: VariableRange[];
  onChange: (ranges: VariableRange[]) => void;
  maxVariables?: number;
}

export default function VariableRangeSelector({
  selectedRanges,
  onChange,
  maxVariables = 3,
}: Props) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  // 이미 선택된 변수 제외
  const availableVariables = OPTIMIZABLE_VARIABLES.filter(
    (v) => !selectedRanges.some((r) => r.name === v.name)
  );

  const handleAddVariable = (variable: OptimizableVariable) => {
    if (selectedRanges.length >= maxVariables) return;

    const newRange: VariableRange = {
      name: variable.name,
      displayName: variable.displayName,
      minValue: variable.minValue,
      maxValue: variable.maxValue,
      step: variable.step,
      unit: variable.unit,
    };

    onChange([...selectedRanges, newRange]);
    setShowAddMenu(false);
  };

  const handleRemoveVariable = (index: number) => {
    const newRanges = [...selectedRanges];
    newRanges.splice(index, 1);
    onChange(newRanges);
  };

  const handleUpdateRange = (
    index: number,
    field: 'minValue' | 'maxValue' | 'step',
    value: number
  ) => {
    const newRanges = [...selectedRanges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    onChange(newRanges);
  };

  // 예상 조합 수 계산
  const calculateCombinations = (): number => {
    if (selectedRanges.length === 0) return 0;

    return selectedRanges.reduce((total, range) => {
      const steps = Math.floor((range.maxValue - range.minValue) / range.step) + 1;
      return total * Math.max(1, steps);
    }, 1);
  };

  const combinations = calculateCombinations();

  return (
    <div className="space-y-4">
      {/* 선택된 변수 목록 */}
      {selectedRanges.map((range, index) => (
        <div
          key={range.name}
          className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-dark-800">
                {range.displayName}
              </span>
              <span className="text-sm text-dark-400">({range.unit})</span>
            </div>
            <button
              onClick={() => handleRemoveVariable(index)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-500 mb-1">
                최소값
              </label>
              <input
                type="number"
                value={range.minValue}
                onChange={(e) =>
                  handleUpdateRange(index, 'minValue', parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-500 mb-1">
                최대값
              </label>
              <input
                type="number"
                value={range.maxValue}
                onChange={(e) =>
                  handleUpdateRange(index, 'maxValue', parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-500 mb-1">
                스텝
              </label>
              <input
                type="number"
                value={range.step}
                onChange={(e) =>
                  handleUpdateRange(index, 'step', parseFloat(e.target.value) || 1)
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 범위 프리뷰 */}
          <div className="mt-3 text-xs text-dark-400">
            탐색 범위:{' '}
            <span className="font-medium text-dark-600">
              {range.minValue} ~ {range.maxValue} ({range.unit})
            </span>
            , 스텝:{' '}
            <span className="font-medium text-dark-600">{range.step}</span>
            {' → '}
            <span className="font-medium text-hydrogen-600">
              {Math.floor((range.maxValue - range.minValue) / range.step) + 1}개 값
            </span>
          </div>
        </div>
      ))}

      {/* 변수 추가 버튼 */}
      {selectedRanges.length < maxVariables && (
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-dark-500 hover:border-hydrogen-500 hover:text-hydrogen-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            변수 추가 ({selectedRanges.length}/{maxVariables})
          </button>

          {/* 변수 선택 드롭다운 */}
          {showAddMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10 max-h-64 overflow-y-auto">
              {availableVariables.length === 0 ? (
                <div className="px-4 py-2 text-sm text-dark-400">
                  추가 가능한 변수가 없습니다
                </div>
              ) : (
                availableVariables.map((variable) => (
                  <button
                    key={variable.name}
                    onClick={() => handleAddVariable(variable)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-dark-700">
                        {variable.displayName}
                      </div>
                      <div className="text-xs text-dark-400">
                        {variable.minValue} ~ {variable.maxValue} {variable.unit}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-dark-100 rounded-full text-dark-500">
                      {variable.category}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 조합 수 표시 */}
      {selectedRanges.length > 0 && (
        <div
          className={`p-3 rounded-lg ${
            combinations > 1000
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-hydrogen-50 border border-hydrogen-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-600">예상 조합 수:</span>
            <span
              className={`text-lg font-bold ${
                combinations > 1000 ? 'text-amber-600' : 'text-hydrogen-600'
              }`}
            >
              {combinations.toLocaleString()}개
            </span>
          </div>
          {combinations > 1000 && (
            <p className="text-xs text-amber-600 mt-1">
              조합 수가 많으면 실행 시간이 길어집니다. 범위나 스텝을 조정해보세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
