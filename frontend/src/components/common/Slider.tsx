import { formatNumber } from '../../utils/formatters';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  helpText?: string;
}

export default function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  formatValue,
  helpText,
}: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : formatNumber(value);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-dark-700">{label}</label>
        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-hydrogen-50 to-primary-50 border border-hydrogen-100">
          <span className="text-sm font-bold text-hydrogen-700">{displayValue}</span>
          {unit && <span className="text-dark-400 ml-1 text-sm">{unit}</span>}
        </span>
      </div>

      <div className="relative">
        {/* Track background with gradient fill */}
        <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full bg-dark-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-hydrogen-400 to-hydrogen-500 rounded-full transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
          style={{
            WebkitAppearance: 'none',
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-dark-400">
        <span className="px-1.5 py-0.5 rounded bg-dark-50">
          {formatValue ? formatValue(min) : min}
          {unit}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-dark-50">
          {formatValue ? formatValue(max) : max}
          {unit}
        </span>
      </div>
      {helpText && <p className="text-xs text-dark-400">{helpText}</p>}
    </div>
  );
}
