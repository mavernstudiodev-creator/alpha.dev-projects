import React from 'react';

export const Skeleton: React.FC<{
  className?: string;
  width?: string;
  height?: string;
}> = ({ className = '', width, height }) => {
  return (
    <div
      style={{ width, height }}
      className={`skeleton-pulse rounded-lg ${className}`}
    />
  );
};

export const ClaimCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-white border border-sage-border rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="w-16 h-5 rounded-full" />
        <Skeleton className="w-24 h-5 rounded-full" />
      </div>
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-4/5 h-4" />
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 border-b border-sage-border gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? 'w-1/3' : i === 1 ? 'w-1/4' : 'w-16'}`}
        />
      ))}
    </div>
  );
};
