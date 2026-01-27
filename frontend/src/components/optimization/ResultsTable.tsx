/**
 * 최적화 결과 테이블 컴포넌트
 */
import { useState } from 'react';
import {
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { GridSearchResultItem } from '../../types/optimization';
import { VARIABLE_DISPLAY_NAMES } from '../../types/optimization';

interface Props {
  results: GridSearchResultItem[];
  onApply?: (result: GridSearchResultItem) => void;
  showRank?: boolean;
}

type SortField = 'rank' | 'npvP50' | 'irrP50' | 'lcoh' | 'dscrMin';
type SortDirection = 'asc' | 'desc';

export default function ResultsTable({ results, onApply, showRank = true }: Props) {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 정렬 처리
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'lcoh' ? 'asc' : 'desc'); // LCOH는 낮을수록 좋음
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aVal - bVal) * multiplier;
  });

  // CSV 다운로드
  const handleDownloadCSV = () => {
    const headers = [
      '순위',
      ...Object.keys(results[0]?.combination || {}).map(
        (k) => VARIABLE_DISPLAY_NAMES[k] || k
      ),
      'NPV P50 (억원)',
      'NPV P90 (억원)',
      'IRR P50 (%)',
      'LCOH (원/kg)',
      'DSCR 최소',
      '연간 수소생산 (톤)',
    ];

    const rows = results.map((r) => [
      r.rank,
      ...Object.values(r.combination),
      (r.npvP50 / 1e8).toFixed(2),
      (r.npvP90 / 1e8).toFixed(2),
      r.irrP50.toFixed(2),
      r.lcoh.toFixed(0),
      r.dscrMin.toFixed(2),
      r.annualH2Production.toFixed(1),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grid_search_results_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 값 포맷팅
  const formatNPV = (value: number) => `${(value / 1e8).toFixed(1)}억`;
  const formatIRR = (value: number) => `${value.toFixed(1)}%`;
  const formatLCOH = (value: number) => `${value.toLocaleString()}`;
  const formatDSCR = (value: number) => value.toFixed(2);

  // 정렬 아이콘
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4" />
    ) : (
      <ChevronDownIcon className="w-4 h-4" />
    );
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-dark-400">
        결과가 없습니다. Grid Search를 실행해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-dark-500">
          총 {results.length}개 결과
        </span>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-hydrogen-600 hover:bg-hydrogen-50 rounded-lg transition-colors"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          CSV 다운로드
        </button>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {showRank && (
                <th
                  onClick={() => handleSort('rank')}
                  className="px-4 py-3 text-left font-medium text-dark-600 cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    순위
                    <SortIcon field="rank" />
                  </div>
                </th>
              )}
              {/* 조합 변수들 */}
              {Object.keys(results[0].combination).map((key) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left font-medium text-dark-600"
                >
                  {VARIABLE_DISPLAY_NAMES[key] || key}
                </th>
              ))}
              <th
                onClick={() => handleSort('npvP50')}
                className="px-4 py-3 text-right font-medium text-dark-600 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  NPV P50
                  <SortIcon field="npvP50" />
                </div>
              </th>
              <th
                onClick={() => handleSort('irrP50')}
                className="px-4 py-3 text-right font-medium text-dark-600 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  IRR P50
                  <SortIcon field="irrP50" />
                </div>
              </th>
              <th
                onClick={() => handleSort('lcoh')}
                className="px-4 py-3 text-right font-medium text-dark-600 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  LCOH
                  <SortIcon field="lcoh" />
                </div>
              </th>
              <th
                onClick={() => handleSort('dscrMin')}
                className="px-4 py-3 text-right font-medium text-dark-600 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  DSCR 최소
                  <SortIcon field="dscrMin" />
                </div>
              </th>
              {onApply && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedResults.slice(0, 50).map((result, idx) => {
              const isTop3 = result.rank <= 3;
              const isSelected = selectedId === result.rank;

              return (
                <tr
                  key={idx}
                  className={`
                    ${isTop3 ? 'bg-hydrogen-50/50' : 'bg-white'}
                    ${isSelected ? 'ring-2 ring-inset ring-hydrogen-500' : ''}
                    hover:bg-gray-50 transition-colors
                  `}
                >
                  {showRank && (
                    <td className="px-4 py-3">
                      <span
                        className={`
                          inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                          ${
                            result.rank === 1
                              ? 'bg-yellow-400 text-yellow-900'
                              : result.rank === 2
                              ? 'bg-gray-300 text-gray-700'
                              : result.rank === 3
                              ? 'bg-amber-600 text-white'
                              : 'bg-dark-100 text-dark-600'
                          }
                        `}
                      >
                        {result.rank}
                      </span>
                    </td>
                  )}
                  {/* 조합 변수 값들 */}
                  {Object.entries(result.combination).map(([key, value]) => (
                    <td key={key} className="px-4 py-3 text-dark-700">
                      {typeof value === 'number'
                        ? value >= 1e9
                          ? `${(value / 1e9).toFixed(0)}B`
                          : value >= 1e6
                          ? `${(value / 1e6).toFixed(0)}M`
                          : value.toLocaleString()
                        : value}
                    </td>
                  ))}
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      result.npvP50 > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatNPV(result.npvP50)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      result.irrP50 > 10 ? 'text-green-600' : 'text-dark-600'
                    }`}
                  >
                    {formatIRR(result.irrP50)}
                  </td>
                  <td className="px-4 py-3 text-right text-dark-600">
                    {formatLCOH(result.lcoh)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      result.dscrMin >= 1.2 ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {formatDSCR(result.dscrMin)}
                  </td>
                  {onApply && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedId(result.rank);
                          onApply(result);
                        }}
                        className={`
                          flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                          ${
                            isSelected
                              ? 'bg-hydrogen-500 text-white'
                              : 'bg-hydrogen-50 text-hydrogen-600 hover:bg-hydrogen-100'
                          }
                        `}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircleIcon className="w-4 h-4" />
                            적용됨
                          </>
                        ) : (
                          '적용'
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {results.length > 50 && (
        <p className="text-center text-sm text-dark-400">
          상위 50개 결과만 표시됩니다. 전체 결과는 CSV로 다운로드하세요.
        </p>
      )}
    </div>
  );
}
