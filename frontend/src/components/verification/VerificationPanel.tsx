import React, { useState } from 'react';
import {
  VerificationResult,
  VerificationStatus,
  ReviewStatus,
  ReviewSubmissionPayload,
} from '../../types';
import { getConfidenceAssessment } from '../../utils/verdictUtils';
import { VerdictBadge, ReviewStatusBadge } from '../common/VerdictBadge';
import {
  ExternalLinkIcon,
  AuditIcon,
  CheckIcon,
  InfoIcon,
  ProviderIcon,
} from '../common/Icons';

interface VerificationPanelProps {
  docId: string;
  result: VerificationResult;
  onSubmitReview: (claimId: string, payload: ReviewSubmissionPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  docId,
  result,
  onSubmitReview,
  isSubmitting = false,
}) => {
  // Reviewer form state
  const [reviewDecision, setReviewDecision] = useState<ReviewStatus>(
    result.review_status !== 'pending' ? result.review_status : 'confirmed'
  );
  const [overriddenStatus, setOverriddenStatus] = useState<VerificationStatus>(
    result.status === 'supported' ? 'partially_supported' : 'supported'
  );
  const [notes, setNotes] = useState<string>(result.human_notes || '');
  const [reviewerName, setReviewerName] = useState<string>(
    result.reviewed_by || 'Dr. Elena Vance, Ph.D.'
  );

  const confidence = getConfidenceAssessment(result.confidence_score);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ReviewSubmissionPayload = {
      decision: reviewDecision,
      overridden_status: reviewDecision === 'overridden' ? overriddenStatus : undefined,
      notes: notes.trim() || undefined,
      reviewer_name: reviewerName.trim() || undefined,
    };
    await onSubmitReview(result.claim_id, payload);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-sage-border overflow-hidden shadow-card text-xs">
      {/* 1. Header with Claim ID & System Verdict */}
      <div className="border-b border-sage-border bg-sage-subtle p-5 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-forest-text">
              {result.claim_id}
            </span>
            <span className="text-forest-text-muted">·</span>
            <span className="text-[11px] font-mono text-forest-text-muted">
              Page {result.matched_citations[0]?.key || '1'} Locator
            </span>
          </div>

          <div className="flex items-center gap-2">
            <VerdictBadge status={result.status} size="md" />
            <ReviewStatusBadge status={result.review_status} size="sm" />
          </div>
        </div>

        {/* System Explanation */}
        <p className="text-xs text-forest-text-secondary leading-relaxed font-sans">
          {result.explanation}
        </p>
      </div>

      {/* 2. Scrollable Body: Claim, Citation, Evidence & Human Review */}
      <div className="flex-1 p-5 overflow-y-auto space-y-6">
        {/* Extracted Claim Block */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-forest-text-muted font-bold block">
            EXTRACTED SCIENTIFIC PROPOSITION
          </span>
          <blockquote className="p-4 rounded-2xl border border-forest-text/20 bg-sage-mint/50 text-forest-text text-xs sm:text-sm font-sans font-medium leading-relaxed">
            "{result.claim_statement}"
          </blockquote>
        </div>

        {/* Model Concordance Assessment */}
        <div className="p-4 rounded-2xl border border-sage-border bg-sage-subtle space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-forest-text font-bold">
              Model Concordance Score
            </span>
            <span className="font-mono font-bold text-forest-text bg-white px-2 py-0.5 rounded-full border border-sage-border">
              {confidence.percentage}% · {confidence.label}
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2 border border-sage-border overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-btn-from to-lime-btn-to transition-all duration-300"
              style={{ width: `${confidence.percentage}%` }}
            />
          </div>
          <div className="text-[11px] text-forest-text-muted flex items-center gap-1.5 font-mono">
            <InfoIcon size={13} className="shrink-0" />
            <span>Passage concordance assessment reflects algorithmic similarity against cited open literature.</span>
          </div>
        </div>

        {/* Matched Bibliographic Citations */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-forest-text-muted font-bold block">
            CITED LITERATURE & RESOLUTION
          </span>

          {result.matched_citations.length > 0 ? (
            <div className="space-y-2.5">
              {result.matched_citations.map((bib) => (
                <div
                  key={bib.key}
                  className="p-4 rounded-2xl border border-sage-border bg-sage-subtle space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-forest-text">
                      [{bib.key}] {bib.title || 'Citation Reference'}
                    </span>
                    <span className="text-[10px] font-mono text-verdict-supported font-bold bg-white px-2 py-0.5 rounded-full border border-sage-border">
                      {bib.resolved ? 'RESOLVED' : 'UNRESOLVED'}
                    </span>
                  </div>

                  <p className="text-xs text-forest-text-secondary">
                    Authors: {bib.authors && bib.authors.length > 0 ? bib.authors.join(', ') : 'Unknown Author'}{' '}
                    {bib.year ? `(${bib.year})` : ''}
                  </p>

                  {bib.journal && (
                    <p className="text-xs text-forest-text-muted italic">
                      Venue: {bib.journal}
                    </p>
                  )}

                  {bib.doi && (
                    <div className="pt-1">
                      <a
                        href={`https://doi.org/${bib.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono font-bold text-forest-text hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLinkIcon size={11} />
                        DOI: {bib.doi}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-sage-border text-forest-text-muted text-center text-xs">
              No direct bibliography links discovered in text block.
            </div>
          )}
        </div>

        {/* Harvested Evidence Passages */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-forest-text-muted font-bold block">
              HARVESTED GROUND-TRUTH EVIDENCE ({result.evidence_items.length})
            </span>
            <span className="text-[11px] font-mono font-bold text-forest-text bg-sage-mint px-2 py-0.5 rounded-full">
              Federated Extraction
            </span>
          </div>

          {result.evidence_items.length > 0 ? (
            <div className="space-y-3">
              {result.evidence_items.map((ev) => (
                <div
                  key={ev.passage_id}
                  className="p-4 rounded-2xl border border-sage-border bg-white space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-forest-text truncate">
                      <div className="w-6 h-6 rounded-md bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
                        <ProviderIcon provider={ev.source_database} size={13} />
                      </div>
                      <span className="truncate">{ev.source_work_title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full border border-sage-border text-[10px] font-mono text-forest-text-muted shrink-0 bg-sage-subtle">
                      {ev.evidence_type}
                    </span>
                  </div>

                  {/* Verbatim Passage Quote */}
                  <div className="p-3.5 rounded-xl border border-sage-border bg-sage-subtle">
                    <p className="text-xs text-forest-text leading-relaxed font-sans">
                      "{ev.passage_text}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-forest-text-secondary">
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
                        Source Link
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-sage-border bg-sage-subtle text-center text-xs space-y-1">
              <span className="font-bold text-forest-text block">
                No Ground-Truth Passage Excerpt Available
              </span>
              <p className="text-xs text-forest-text-secondary">
                Reference may be paywalled or unavailable in open repositories. Marked under scientific abstention.
              </p>
            </div>
          )}
        </div>

        {/* 3. Human Review & Audit Controls */}
        <div className="pt-4 border-t border-sage-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-forest-text font-bold block">
              HUMAN AUDITOR DECISION & OVERRIDE
            </span>
            <AuditIcon size={15} className="text-forest-text" />
          </div>

          {result.reviewed_by && (
            <div className="p-3.5 rounded-2xl border border-sage-border bg-sage-subtle text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-forest-text">
                  Audited by {result.reviewed_by}
                </span>
                <ReviewStatusBadge status={result.review_status} size="sm" />
              </div>
              {result.human_notes && (
                <p className="text-xs text-forest-text-secondary italic">
                  "{result.human_notes}"
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            {/* Review Decision Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-forest-text block">
                Review Decision
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDecision('confirmed')}
                  className={`py-2 px-2.5 rounded-full border text-xs font-bold transition-all ${
                    reviewDecision === 'confirmed'
                      ? 'border-verdict-supported bg-verdict-supported-bg text-verdict-supported shadow-xs'
                      : 'border-sage-border bg-white text-forest-text-secondary hover:text-forest-text'
                  }`}
                >
                  Confirm Verdict
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('overridden')}
                  className={`py-2 px-2.5 rounded-full border text-xs font-bold transition-all ${
                    reviewDecision === 'overridden'
                      ? 'border-forest-text bg-forest-text text-white shadow-xs'
                      : 'border-sage-border bg-white text-forest-text-secondary hover:text-forest-text'
                  }`}
                >
                  Override Verdict
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('flagged')}
                  className={`py-2 px-2.5 rounded-full border text-xs font-bold transition-all ${
                    reviewDecision === 'flagged'
                      ? 'border-verdict-contradictory bg-verdict-contradictory-bg text-verdict-contradictory shadow-xs'
                      : 'border-sage-border bg-white text-forest-text-secondary hover:text-forest-text'
                  }`}
                >
                  Flag for Inquiry
                </button>
              </div>
            </div>

            {/* If Overridden, select new verdict */}
            {reviewDecision === 'overridden' && (
              <div className="space-y-1.5 p-4 rounded-2xl border border-sage-border bg-sage-subtle">
                <label className="text-xs font-bold text-forest-text block">
                  Select Corrected Scientific Verdict:
                </label>
                <select
                  value={overriddenStatus}
                  onChange={(e: any) => setOverriddenStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sage-border bg-white text-forest-text text-xs focus:outline-none focus:border-forest-text font-mono font-semibold"
                >
                  <option value="supported">SUPPORTED</option>
                  <option value="partially_supported">PARTIALLY_SUPPORTED</option>
                  <option value="unsupported">UNSUPPORTED</option>
                  <option value="contradictory">CONTRADICTORY</option>
                  <option value="possibly_outdated">POSSIBLY_OUTDATED</option>
                  <option value="insufficient_evidence">INSUFFICIENT_EVIDENCE</option>
                </select>
              </div>
            )}

            {/* Auditor Notes Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-forest-text block">
                Auditor Assessment Notes (Traceable Evidence Citation)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the rationale for confirmation or override based on literature passages..."
                rows={3}
                className="w-full p-3 rounded-2xl border border-sage-border bg-white text-forest-text text-xs focus:outline-none focus:border-forest-text font-sans resize-none placeholder:text-forest-text-muted"
              />
            </div>

            {/* Reviewer Identifier */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-forest-text block">
                Auditor Attribution
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-sage-border bg-white text-forest-text text-xs focus:outline-none focus:border-forest-text font-mono font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-full btn-lime-gradient text-forest-text font-bold shadow-sm transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckIcon size={14} />
              {isSubmitting ? 'Recording Decision...' : 'Save Audit Decision'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
