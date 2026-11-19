import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-sage-border p-5 shadow-card transition-all duration-200 hover:border-sage-mint-dark/30 ${className}`}
    >
      <span className="text-[11px] font-mono uppercase tracking-wider text-forest-text-muted block font-semibold">
        {title}
      </span>
      <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight font-sans">
        {value}
      </div>
      {subtitle && (
        <span className="text-xs text-forest-text-secondary block mt-1 font-medium">
          {subtitle}
        </span>
      )}
    </div>
  );
};
