import React from 'react';
import { VerificationStatus, ReviewStatus } from '../../types';
import { VERDICT_CONFIGS, REVIEW_STATUS_CONFIGS } from '../../utils/verdictUtils';
import { VerdictIcon, CheckIcon } from './Icons';

interface VerdictBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const config = VERDICT_CONFIGS[status] || VERDICT_CONFIGS.insufficient_evidence;

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1 font-mono tracking-tight font-semibold',
    md: 'text-xs px-3 py-1 gap-1.5 font-mono tracking-tight font-bold',
    lg: 'text-sm px-4 py-1.5 gap-2 font-mono tracking-wide font-bold',
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border select-none ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${sizeClasses[size]} ${className}`}
      title={config.description}
    >
      {showIcon && (
        <VerdictIcon
          type={status}
          size={iconSizes[size]}
          className="shrink-0"
        />
      )}
      <span>{config.badgeLabel}</span>
    </span>
  );
};

export const ReviewStatusBadge: React.FC<{
  status: ReviewStatus;
  size?: 'sm' | 'md';
  className?: string;
}> = ({
  status,
  size = 'sm',
  className = '',
}) => {
  const config = REVIEW_STATUS_CONFIGS[status] || REVIEW_STATUS_CONFIGS.pending;
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2.5 py-0.5 gap-1' : 'text-xs px-3 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold select-none font-mono ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${sizeClasses} ${className}`}
    >
      {status === 'confirmed' && <CheckIcon size={12} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
