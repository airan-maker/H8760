import { formatNumber } from '../../utils/formatters';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  helpText?: string;
  placeholder?: string;
}

export default function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  helpText,
  placeholder,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === '' ? 0 : Number(e.target.value.replace(/,/g, ''));
    if (min !== undefined && newValue < min) return;
    if (max !== undefined && newValue > max) return;
    onChange(newValue);
  };

  const increment = () => {
    const newValue = value + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  };

  const decrement = () => {
    const newValue = value - step;
    if (min === undefined || newValue >= min) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-dark-700">{label}</label>
      <div className="relative flex items-center">
        {/* Decrement button */}
        <button
          type="button"
          onClick={decrement}
          className="absolute left-1 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-dark-50 hover:bg-dark-100 text-dark-500 hover:text-dark-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <input
          type="text"
          value={formatNumber(value)}
          onChange={handleChange}
          placeholder={placeholder}
          className="
            w-full px-12 py-3 border border-dark-200 rounded-xl
            focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500
            text-center font-semibold text-dark-700
            transition-all duration-200
          "
        />

        {/* Increment button */}
        <button
          type="button"
          onClick={increment}
          className="absolute right-1 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-dark-50 hover:bg-dark-100 text-dark-500 hover:text-dark-700 transition-colors"
          style={{ right: unit ? '3rem' : '0.25rem' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-dark-400">
            {unit}
          </span>
        )}
      </div>
      {helpText && <p className="text-xs text-dark-400">{helpText}</p>}
    </div>
  );
}
