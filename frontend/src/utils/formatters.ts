/**
 * 숫자 및 통화 포맷터
 */

// 숫자 포맷 (천 단위 구분)
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// 통화 포맷 (원)
export function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000_000) {
      return `${formatNumber(value / 1_000_000_000_000, 1)}조원`;
    }
    if (Math.abs(value) >= 100_000_000) {
      return `${formatNumber(value / 100_000_000, 1)}억원`;
    }
    if (Math.abs(value) >= 10_000) {
      return `${formatNumber(value / 10_000, 1)}만원`;
    }
  }
  return `₩${formatNumber(value)}`;
}

// 백분율 포맷
export function formatPercent(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

// 수소 생산량 포맷
export function formatH2Production(kg: number): string {
  if (kg >= 1000) {
    return `${formatNumber(kg / 1000, 1)} 톤`;
  }
  return `${formatNumber(kg, 0)} kg`;
}

// 전력 용량 포맷
export function formatPower(mw: number): string {
  if (mw >= 1000) {
    return `${formatNumber(mw / 1000, 2)} GW`;
  }
  return `${formatNumber(mw, 1)} MW`;
}

// 시간 포맷
export function formatHours(hours: number): string {
  if (hours >= 1000) {
    return `${formatNumber(hours / 1000, 1)}천 시간`;
  }
  return `${formatNumber(hours, 0)} 시간`;
}

// 연도 포맷
export function formatYears(years: number): string {
  return `${formatNumber(years, 1)} 년`;
}

// NPV/IRR 값을 신뢰 수준에 따라 선택
export function getValueByConfidence<T extends { p50: number; p90: number; p99: number }>(
  values: T,
  confidence: 'P50' | 'P90' | 'P99'
): number {
  switch (confidence) {
    case 'P50':
      return values.p50;
    case 'P90':
      return values.p90;
    case 'P99':
      return values.p99;
    default:
      return values.p50;
  }
}

// 색상 결정 (양수/음수)
export function getValueColor(value: number): string {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
}

// 배경 색상 결정
export function getValueBgColor(value: number): string {
  if (value > 0) return 'bg-green-50';
  if (value < 0) return 'bg-red-50';
  return 'bg-gray-50';
}
