import type { KPIs } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/formatters';

interface Props {
  kpis: KPIs;
  confidenceLevel?: 'P50' | 'P90' | 'P99';
}

export default function KPICards({ kpis }: Props) {
  const cards = [
    {
      title: 'NPV',
      value: formatCurrency(kpis.npv.p50, true),
      subValues: [
        { label: 'P90', value: formatCurrency(kpis.npv.p90, true) },
        { label: 'P99', value: formatCurrency(kpis.npv.p99, true) },
      ],
      subtitle: 'P50 기준',
      color: kpis.npv.p50 >= 0 ? 'green' : 'red',
      trend: kpis.npv.p50 >= 0 ? 'up' : 'down',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: 'IRR',
      value: formatPercent(kpis.irr.p50, 1),
      subValues: [
        { label: 'P90', value: formatPercent(kpis.irr.p90, 1) },
        { label: 'P99', value: formatPercent(kpis.irr.p99, 1) },
      ],
      subtitle: 'P50 기준',
      color: kpis.irr.p50 >= 8 ? 'green' : kpis.irr.p50 >= 5 ? 'yellow' : 'red',
      trend: kpis.irr.p50 >= 8 ? 'up' : 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      title: 'DSCR',
      value: `${formatNumber(kpis.dscr.min, 2)}x`,
      subValues: [
        { label: '평균', value: `${formatNumber(kpis.dscr.avg, 2)}x` },
      ],
      subtitle: '최저값',
      color: kpis.dscr.min >= 1.3 ? 'green' : kpis.dscr.min >= 1.1 ? 'yellow' : 'red',
      trend: kpis.dscr.min >= 1.3 ? 'up' : 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      title: '연간 생산량',
      value: `${formatNumber(kpis.annualH2Production.p50, 0)} 톤`,
      subValues: [
        { label: 'P90', value: `${formatNumber(kpis.annualH2Production.p90, 0)} 톤` },
        { label: 'P99', value: `${formatNumber(kpis.annualH2Production.p99, 0)} 톤` },
      ],
      subtitle: 'P50 기준',
      color: 'hydrogen',
      trend: 'up',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
    },
    {
      title: 'VaR 95%',
      value: formatCurrency(kpis.var95, true),
      subValues: [],
      subtitle: '최대 손실',
      color: 'purple',
      trend: 'down',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    {
      title: 'LCOH',
      value: `${formatNumber(kpis.lcoh, 0)} 원/kg`,
      subValues: [],
      subtitle: '수소 균등화 비용',
      color: kpis.lcoh <= 5000 ? 'green' : kpis.lcoh <= 7000 ? 'yellow' : 'red',
      trend: kpis.lcoh <= 5000 ? 'up' : 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
  ];

  const colorConfig = {
    green: {
      gradient: 'from-emerald-500 to-green-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      text: 'text-emerald-700',
      glow: 'shadow-emerald-100',
      subBg: 'bg-emerald-50/50',
    },
    red: {
      gradient: 'from-rose-500 to-red-600',
      bg: 'bg-gradient-to-br from-rose-50 to-red-50',
      border: 'border-rose-100',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      text: 'text-rose-700',
      glow: 'shadow-rose-100',
      subBg: 'bg-rose-50/50',
    },
    yellow: {
      gradient: 'from-amber-500 to-yellow-600',
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      text: 'text-amber-700',
      glow: 'shadow-amber-100',
      subBg: 'bg-amber-50/50',
    },
    hydrogen: {
      gradient: 'from-hydrogen-500 to-hydrogen-600',
      bg: 'bg-gradient-to-br from-hydrogen-50 to-emerald-50',
      border: 'border-hydrogen-100',
      iconBg: 'bg-hydrogen-100',
      iconColor: 'text-hydrogen-600',
      text: 'text-hydrogen-700',
      glow: 'shadow-hydrogen-100',
      subBg: 'bg-hydrogen-50/50',
    },
    purple: {
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50',
      border: 'border-violet-100',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      text: 'text-violet-700',
      glow: 'shadow-violet-100',
      subBg: 'bg-violet-50/50',
    },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const colors = colorConfig[card.color as keyof typeof colorConfig];
        return (
          <div
            key={card.title}
            className={`
              relative overflow-hidden rounded-2xl p-4
              ${colors.bg} border ${colors.border}
              transition-all duration-300 hover:shadow-lg ${colors.glow}
              hover:-translate-y-1 group
              animate-slide-up
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Background decoration */}
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${colors.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">{card.title}</span>
                <div className={`p-1.5 rounded-lg ${colors.iconBg}`}>
                  <span className={colors.iconColor}>{card.icon}</span>
                </div>
              </div>

              <div className={`text-2xl font-bold ${colors.text} tracking-tight mb-1`}>
                {card.value}
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-400">{card.subtitle}</span>
                {card.trend === 'up' && (
                  <span className="flex items-center text-xs text-emerald-600">
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {card.trend === 'down' && (
                  <span className="flex items-center text-xs text-rose-600">
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>

              {/* P90/P99 서브 값 표시 */}
              {card.subValues.length > 0 && (
                <div className={`flex gap-2 pt-2 border-t border-dark-100/50`}>
                  {card.subValues.map((sub) => (
                    <div key={sub.label} className={`flex-1 px-1.5 py-1 rounded ${colors.subBg} text-center`}>
                      <div className="text-[10px] text-dark-400 font-medium">{sub.label}</div>
                      <div className="text-xs font-semibold text-dark-600 truncate">{sub.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
