import React from 'react';

export interface StatCardProps {
  title: string;
  value: number | string;
  helperText?: string;
  icon: React.ReactNode;
  badgeColor?: 'teal' | 'amber' | 'blue' | 'rose' | 'slate';
}

const colorStyles: Record<string, { bg: string; text: string; iconBg: string }> = {
  teal: {
    bg: 'bg-white',
    text: 'text-teal-700',
    iconBg: 'bg-teal-50 text-teal-600',
  },
  amber: {
    bg: 'bg-white',
    text: 'text-amber-700',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  blue: {
    bg: 'bg-white',
    text: 'text-blue-700',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  rose: {
    bg: 'bg-white',
    text: 'text-rose-700',
    iconBg: 'bg-rose-50 text-rose-600',
  },
  slate: {
    bg: 'bg-white',
    text: 'text-slate-700',
    iconBg: 'bg-slate-100 text-slate-600',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  helperText,
  icon,
  badgeColor = 'teal',
}) => {
  const styles = colorStyles[badgeColor] || colorStyles.teal;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-1 tracking-tight">
            {value}
          </p>
          {helperText && (
            <p className="text-xs text-slate-500 mt-1 font-normal">
              {helperText}
            </p>
          )}
        </div>
        <div
          className={`p-2.5 rounded-lg flex items-center justify-center shrink-0 ${styles.iconBg}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
