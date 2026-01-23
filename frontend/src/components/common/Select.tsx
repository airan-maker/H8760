interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  helpText?: string;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  helpText,
}: SelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-dark-700">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full px-4 py-3 border border-dark-200 rounded-xl
            focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500
            bg-white appearance-none cursor-pointer
            transition-all duration-200
            text-dark-700 font-medium
          "
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dark-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {helpText && <p className="text-xs text-dark-400">{helpText}</p>}
    </div>
  );
}
