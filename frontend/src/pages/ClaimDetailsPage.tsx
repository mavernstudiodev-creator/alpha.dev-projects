import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { DocumentVerificationReport, VerificationResult } from '../types';
import { VerdictBadge, ReviewStatusBadge } from '../components/common/VerdictBadge';
import { ChevronLeftIcon, ExternalLinkIcon, ProviderIcon } from '../components/common/Icons';
import { Skeleton } from '../components/common/SkeletonLoader';
import { getConfidenceAssessment } from '../utils/verdictUtils';

export const ClaimDetailsPage: React.FC = () => {
  const { docId = 'DOC-A9F82B01', claimId = 'CLM-001' } = useParams<{ docId: string; claimId: string }>();

  const [document, setDocument] = useState<DocumentVerificationReport | null>(null);
  const [claim, setClaim] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const doc = await apiService.getDocument(docId);
        setDocument(doc);
        if (doc) {
          const match = doc.results.find((c) => c.claim_id === claimId);
          setClaim(match || doc.results[0]);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [docId, claimId]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto py-6">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  if (!claim || !document) {
    return (
      <div className="py-16 text-center text-xs text-forest-text-secondary space-y-3">
        <p>Claim not found in document record.</p>
        <Link to={`/documents/${docId}`} className="text-forest-text font-bold hover:underline font-mono">
          ← Return to Document Workspace
        </Link>
      </div>
    );
  }

  const confidence = getConfidenceAssessment(claim.confidence_score);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 font-sans">
      {/* Back button */}
      <div>
        <Link
          to={`/documents/${docId}`}
          className="inline-flex items-center gap-1.5 text-xs text-forest-text-secondary hover:text-forest-text transition-colors font-bold"
        >
          <ChevronLeftIcon size={12} />
          <span>Back to Verification Workspace ({document.filename})</span>
        </Link>
      </div>

      {/* Claim Overview Card */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-forest-text">
              {claim.claim_id}
            </span>
            <span className="text-forest-text-muted">·</span>
            <span className="font-mono text-xs text-forest-text-muted">{document.document_id}</span>
          </div>

          <div className="flex items-center gap-2">
            <VerdictBadge status={claim.status} size="md" />
            <ReviewStatusBadge status={claim.review_status} size="sm" />
          </div>
        </div>

        <blockquote className="p-4 rounded-2xl border border-forest-text/20 bg-sage-mint/50 text-forest-text text-sm sm:text-base font-sans font-medium leading-relaxed">
          "{claim.claim_statement}"
        </blockquote>

        <div className="p-4 rounded-2xl border border-sage-border bg-sage-subtle space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-forest-text font-bold">Model Concordance</span>
            <span className="text-forest-text font-bold bg-white px-2 py-0.5 rounded-full border border-sage-border">
              {confidence.percentage}% · {confidence.label}
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2 border border-sage-border overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-btn-from to-lime-btn-to transition-all duration-300"
              style={{ width: `${confidence.percentage}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-forest-text-secondary leading-relaxed font-sans pt-1">
          <strong className="text-forest-text">System Explanation:</strong> {claim.explanation}
        </div>
      </div>

      {/* Harvested Evidence Passages */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-forest-text">
          Retrieved Ground-Truth Passages ({claim.evidence_items.length})
        </h3>

        {claim.evidence_items.map((ev) => (
          <div
            key={ev.passage_id}
            className="p-6 rounded-3xl border border-sage-border bg-white shadow-card space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-forest-text font-bold text-xs">
                <div className="w-6 h-6 rounded-md bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
                  <ProviderIcon provider={ev.source_database} size={13} />
                </div>
                <span>{ev.source_work_title}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full border border-sage-border text-[10px] font-mono text-forest-text-muted bg-sage-subtle">
                {ev.evidence_type}
              </span>
            </div>

            <p className="text-xs text-forest-text leading-relaxed font-sans bg-sage-subtle p-3.5 rounded-xl border border-sage-border">
              "{ev.passage_text}"
            </p>

            <div className="flex items-center justify-between text-[11px] font-mono text-forest-text-secondary pt-1">
              <span>Database: {ev.source_database}</span>
              <span className="text-forest-text font-bold">
                Relevance: {Math.round(ev.relevance_score * 100)}%
              </span>
              {ev.source_doi && (
                <a
                  href={`https://doi.org/${ev.source_doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest-text font-bold hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLinkIcon size={11} />
                  DOI Link
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
