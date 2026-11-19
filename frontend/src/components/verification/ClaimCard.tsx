import React from 'react';
import { Link } from 'react-router-dom';
import { VerificationResult } from '../../types';
import { VerdictBadge } from '../common/VerdictBadge';
import { ChevronRightIcon } from '../common/Icons';

interface ClaimCardProps {
  claim: VerificationResult;
  documentId: string;
  className?: string;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({
  claim,
  documentId,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-sage-border p-5 transition-all hover:border-forest-text/30 hover:shadow-card ${className}`}
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-sage-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-forest-text-muted font-bold">
            {claim.claim_id}
          </span>
          <VerdictBadge status={claim.status} size="sm" />
        </div>
        <span className="text-[11px] font-mono font-semibold text-forest-text-secondary bg-sage-subtle px-2 py-0.5 rounded-full">
          {(claim.confidence_score * 100).toFixed(0)}% concordance
        </span>
      </div>

      <div className="mt-3">
        <h4 className="text-xs sm:text-sm font-bold text-forest-text leading-snug">
          {claim.claim_statement}
        </h4>
        <p className="mt-1.5 text-xs text-forest-text-secondary leading-relaxed line-clamp-2">
          {claim.explanation}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-sage-border flex items-center justify-between text-xs font-mono text-forest-text-secondary">
        <span>
          {claim.matched_citations.length} cited source{claim.matched_citations.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2.5">
          <Link
            to={`/documents/${documentId}/claims/${claim.claim_id}`}
            className="font-bold text-forest-text hover:underline inline-flex items-center gap-0.5"
          >
            <span>Inspect detail</span>
            <ChevronRightIcon size={12} />
          </Link>
          <span>·</span>
          <Link
            to={`/documents/${documentId}/review?claimId=${claim.claim_id}`}
            className="font-bold text-forest-text hover:underline"
          >
            Review
          </Link>
        </div>
      </div>
    </div>
  );
};
