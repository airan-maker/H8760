/**
 * KPI 목표 설정 컴포넌트
 */
import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { KPITarget } from '../../types/optimization';
import { KPI_DISPLAY_NAMES } from '../../types/optimization';

interface Props {
  targets: KPITarget[];
  onChange: (targets: KPITarget[]) => void;
  maxTargets?: number;
}

const KPI_OPTIONS: Array<{ value: KPITarget['kpi']; label: string; unit: string }> = [
  { value: 'npv', label: 'NPV', unit: '억원' },
  { value: 'irr', label: 'IRR', unit: '%' },
  { value: 'lcoh', label: 'LCOH', unit: '원/kg' },
  { value: 'dscr', label: 'DSCR', unit: '' },
];

const CONDITION_OPTIONS: Array<{ value: KPITarget['condition']; label: string }> = [
  { value: '>=', label: '이상' },
  { value: '<=', label: '이하' },
  { value: '==', label: '같음' },
];

export default function TargetSelector({
  targets,
  onChange,
  maxTargets = 4,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);

  // 이미 선택된 KPI 제외
  const availableKpis = KPI_OPTIONS.filter(
    (opt) => !targets.some((t) => t.kpi === opt.value)
  );

  const handleAdd = () => {
    if (targets.length >= maxTargets || availableKpis.length === 0) return;

    const newTarget: KPITarget = {
      kpi: availableKpis[0].value,
      condition: availableKpis[0].value === 'lcoh' ? '<=' : '>=',
      value: getDefaultValue(availableKpis[0].value),
      priority: targets.length + 1,
    };

    onChange([...targets, newTarget]);
    setShowAdd(false);
  };

  const handleRemove = (index: number) => {
    const newTargets = [...targets];
    newTargets.splice(index, 1);
    // 우선순위 재정렬
    newTargets.forEach((t, i) => (t.priority = i + 1));
    onChange(newTargets);
  };

  const handleUpdate = (
    index: number,
    field: keyof KPITarget,
    value: KPITarget['kpi'] | KPITarget['condition'] | number
  ) => {
    const newTargets = [...targets];
    newTargets[index] = { ...newTargets[index], [field]: value };

    // KPI 변경 시 기본값 설정
    if (field === 'kpi') {
      newTargets[index].value = getDefaultValue(value as KPITarget['kpi']);
      newTargets[index].condition = value === 'lcoh' ? '<=' : '>=';
    }

    onChange(newTargets);
  };

  const getDefaultValue = (kpi: KPITarget['kpi']): number => {
    switch (kpi) {
      case 'npv':
        return 100; // 100억원 이상
      case 'irr':
        return 10; // 10% 이상
      case 'lcoh':
        return 5000; // 5000원/kg 이하
      case 'dscr':
        return 1.2; // 1.2 이상
      default:
        return 0;
    }
  };

  const getUnit = (kpi: KPITarget['kpi']): string => {
    return KPI_OPTIONS.find((opt) => opt.value === kpi)?.unit || '';
  };

  return (
    <div className="space-y-3">
      {targets.map((target, index) => (
        <div
          key={index}
          className="p-3 bg-gray-50 rounded-xl border border-gray-200"
        >
          {/* 상단: 우선순위 + KPI + 삭제 버튼 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-hydrogen-100 text-hydrogen-600 flex items-center justify-center text-xs font-bold">
                {target.priority}
              </div>
              <select
                value={target.kpi}
                onChange={(e) =>
                  handleUpdate(index, 'kpi', e.target.value as KPITarget['kpi'])
                }
                className="px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500 text-sm font-medium bg-white"
              >
                {KPI_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={targets.some(
                      (t, i) => i !== index && t.kpi === opt.value
                    )}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handleRemove(index)}
              className="p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 하단: 조건 + 값 + 단위 */}
          <div className="flex items-center gap-2">
            <select
              value={target.condition}
              onChange={(e) =>
                handleUpdate(
                  index,
                  'condition',
                  e.target.value as KPITarget['condition']
                )
              }
              className="px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500 text-sm bg-white"
            >
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={target.value}
              onChange={(e) =>
                handleUpdate(index, 'value', parseFloat(e.target.value) || 0)
              }
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500 text-sm text-right bg-white"
            />
            <span className="text-sm text-dark-500 flex-shrink-0">
              {getUnit(target.kpi)}
            </span>
          </div>
        </div>
      ))}

      {/* 추가 버튼 */}
      {targets.length < maxTargets && availableKpis.length > 0 && (
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-dark-500 hover:border-hydrogen-500 hover:text-hydrogen-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          목표 추가 ({targets.length}/{maxTargets})
        </button>
      )}

      {targets.length === 0 && (
        <div className="text-center py-6 text-dark-400 text-sm">
          목표를 추가하여 AI에게 최적화 방향을 알려주세요
        </div>
      )}
    </div>
  );
}
