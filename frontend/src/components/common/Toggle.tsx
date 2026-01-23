import { clsx } from 'clsx';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export default function Toggle({
  label,
  checked,
  onChange,
  description,
}: ToggleProps) {
  return (
    <div className="flex items-start group">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-hydrogen-500 focus-visible:ring-offset-2',
          checked
            ? 'bg-gradient-to-r from-hydrogen-500 to-hydrogen-600 shadow-md shadow-hydrogen-500/30'
            : 'bg-dark-200 hover:bg-dark-300'
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        >
          {checked && (
            <span className="absolute inset-0 flex items-center justify-center">
              <svg className="w-3 h-3 text-hydrogen-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </span>
      </button>
      <div className="ml-3">
        <label className="text-sm font-semibold text-dark-700 group-hover:text-dark-800 transition-colors cursor-pointer" onClick={() => onChange(!checked)}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-dark-400 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
