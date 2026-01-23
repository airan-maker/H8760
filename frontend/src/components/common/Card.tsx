import { clsx } from 'clsx';

interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'gradient' | 'bordered';
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function Card({
  title,
  description,
  children,
  className,
  hover = false,
  padding = 'md',
  variant = 'default',
  icon,
  action,
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const variantClasses = {
    default: 'bg-white border border-dark-100 shadow-card',
    glass: 'glass shadow-glass',
    gradient: 'bg-gradient-to-br from-white to-dark-50 border border-dark-100/50 shadow-card',
    bordered: 'bg-white border-2 border-dark-100 shadow-none',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-300',
        variantClasses[variant],
        hover && 'hover:shadow-card-hover hover:-translate-y-1 cursor-pointer',
        paddingClasses[padding],
        className
      )}
    >
      {(title || description || icon || action) && (
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-hydrogen-100 to-primary-100 flex items-center justify-center text-hydrogen-600">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-dark-800 tracking-tight">{title}</h3>
              )}
              {description && (
                <p className="text-sm text-dark-400 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
