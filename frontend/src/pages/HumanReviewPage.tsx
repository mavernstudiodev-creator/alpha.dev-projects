import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { DocumentVerificationReport, VerificationResult, ReviewStatus, VerificationStatus } from '../types';
import { VerdictBadge, ReviewStatusBadge } from '../components/common/VerdictBadge';
import { useToast } from '../components/common/Toast';
import { ChevronLeftIcon, CheckIcon } from '../components/common/Icons';
import { Skeleton } from '../components/common/SkeletonLoader';

export const HumanReviewPage: React.FC = () => {
  const { docId = '' } = useParams<{ docId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClaimId = searchParams.get('claimId');

  const { addToast } = useToast();

  const [document, setDocument] = useState<DocumentVerificationReport | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<VerificationResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [decision, setDecision] = useState<ReviewStatus>('confirmed');
  const [overriddenStatus, setOverriddenStatus] = useState<VerificationStatus>('partially_supported');
  const [notes, setNotes] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const doc = await apiService.getDocument(docId);
        setDocument(doc);
        if (doc && doc.results.length > 0) {
          const matchIdx = initialClaimId
            ? doc.results.findIndex((c) => c.claim_id === initialClaimId)
            : 0;
          const safeIdx = matchIdx >= 0 ? matchIdx : 0;
          const c = doc.results[safeIdx];
          setSelectedClaim(c);
          setCurrentIndex(safeIdx + 1);
          setNotes(c.human_notes || '');
          if (c.review_status !== 'pending') {
            setDecision(c.review_status);
          }
        }
      } catch {
        setDocument(null);
        setSelectedClaim(null);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [docId, initialClaimId]);

  const handleSelectIndex = (idx: number) => {
    if (!document || !document.results[idx]) return;
    const c = document.results[idx];
    setSelectedClaim(c);
    setCurrentIndex(idx + 1);
    setSearchParams({ claimId: c.claim_id });
    setNotes(c.human_notes || '');
    if (c.review_status !== 'pending') {
      setDecision(c.review_status);
    }
  };

  const handleRecordReview = async () => {
    if (!selectedClaim || !document) return;
    setIsSubmitting(true);
    try {
      await apiService.submitReview(document.document_id, selectedClaim.claim_id, {
        decision,
        overridden_status: decision === 'overridden' ? overriddenStatus : undefined,
        notes: notes || 'Verified against cited literature context.',
        reviewer_name: reviewerName,
      });

      addToast({
        type: 'success',
        title: 'Audit Decision Recorded',
        message: `Claim ${selectedClaim.claim_id} audit saved (${decision.toUpperCase()}).`,
      });

      // Update local state
      const updated = await apiService.getDocument(document.document_id);
      if (updated) {
        setDocument(updated);
        const nextIdx = currentIndex < updated.results.length ? currentIndex : currentIndex - 1;
        setSelectedClaim(updated.results[nextIdx]);
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Review Error',
        message: 'Could not record review decision.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!document || !selectedClaim) {
    return (
      <div className="py-16 text-center text-xs text-forest-text-secondary space-y-3">
        <p>No claims available for review.</p>
        <Link to={`/documents/${docId}`} className="text-forest-text font-bold hover:underline font-mono">
          Return to Document Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sage-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/documents/${docId}`}
            className="p-2 rounded-full border border-sage-border bg-white text-forest-text-secondary hover:text-forest-text transition-colors shadow-xs"
            title="Back to Workspace"
          >
            <ChevronLeftIcon size={14} />
          </Link>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
              Human Review & Audit Queue
            </h2>
            <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
              Manuscript: {document.filename} · {document.document_id}
            </p>
          </div>
        </div>

        <div className="text-xs font-mono font-bold text-forest-text bg-sage-subtle px-3 py-1 rounded-full border border-sage-border">
          Claim {currentIndex} of {document.results.length}
        </div>
      </div>

      {/* Claim Selection Pager */}
      <div className="flex items-center gap-2 overflow-x-auto p-3 bg-white rounded-2xl border border-sage-border shadow-card text-xs font-mono">
        {document.results.map((c, idx) => {
          const isSelected = c.claim_id === selectedClaim.claim_id;
          return (
            <button
              key={c.claim_id}
              onClick={() => handleSelectIndex(idx)}
              className={`px-3.5 py-1.5 rounded-full border text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'border-forest-text bg-forest-text text-white font-bold shadow-xs'
                  : 'border-sage-border bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
              }`}
            >
              <span>{c.claim_id}</span>
              <VerdictBadge status={c.status} size="sm" showIcon={false} />
            </button>
          );
        })}
      </div>

      {/* Review Card */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-mono text-base font-bold text-forest-text">
              {selectedClaim.claim_id}
            </span>
            <span className="text-[11px] font-mono text-forest-text-muted block">
              Confidence: {Math.round(selectedClaim.confidence_score * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <VerdictBadge status={selectedClaim.status} size="md" />
            <ReviewStatusBadge status={selectedClaim.review_status} size="sm" />
          </div>
        </div>

        <blockquote className="p-4 sm:p-5 rounded-2xl border border-forest-text/20 bg-sage-mint/50 text-forest-text text-sm sm:text-base font-sans font-medium leading-relaxed">
          "{selectedClaim.claim_statement}"
        </blockquote>

        <div className="text-xs text-forest-text-secondary leading-relaxed">
          <strong className="text-forest-text">System Explanation:</strong> {selectedClaim.explanation}
        </div>

        {/* Harvested Evidence Excerpts */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-forest-text-muted font-bold block">
            CITATIONS & EVIDENCE EXCERPTS ({selectedClaim.evidence_items.length})
          </span>

          {selectedClaim.evidence_items.map((ev) => (
            <div
              key={ev.passage_id}
              className="p-4 rounded-2xl border border-sage-border bg-sage-subtle space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between font-bold text-forest-text">
                <span>{ev.source_work_title}</span>
                <span className="text-forest-text font-mono text-[10px] bg-white px-2 py-0.5 rounded-full border border-sage-border">
                  {Math.round(ev.relevance_score * 100)}% Relevance
                </span>
              </div>
              <p className="italic text-forest-text-secondary leading-relaxed">"{ev.passage_text}"</p>
            </div>
          ))}
        </div>

        {/* Decision Form */}
        <div className="pt-5 border-t border-sage-border space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest-text block">
            Auditor Consensus Submission
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDecision('confirmed')}
              className={`py-2.5 px-3 rounded-full border text-xs font-bold transition-all ${
                decision === 'confirmed'
                  ? 'border-verdict-supported bg-verdict-supported-bg text-verdict-supported shadow-xs'
                  : 'border-sage-border bg-white text-forest-text-secondary hover:text-forest-text'
              }`}
            >
              Confirm System Verdict
            </button>
            <button
              type="button"
              onClick={() => setDecision('overridden')}
              className={`py-2.5 px-3 rounded-full border text-xs font-bold transition-all ${
                decision === 'overridden'
                  ? 'border-forest-text bg-forest-text text-white shadow-xs'
                  : 'border-sage-border bg-white text-forest-text-secondary hover:text-forest-text'
              }`}
            >
              Override Verdict
            </button>
            <button
              type="button"
              onClick={() => setDecision('flagged')}
              className={`py-2.5 px-3 rounded-full border text-xs font-bold transition-all ${
                decision === 'flagged'
                  ? 'border-verdict-contradictory bg-verdict-contradictory-bg text-verdict-contradictory shadow-xs'
                  : 'border-sage-border bg-white text-forest-text-secondary hover:text-forest-text'
              }`}
            >
              Flag for Panel Review
            </button>
          </div>

          {decision === 'overridden' && (
            <div className="space-y-1.5 p-4 rounded-2xl border border-sage-border bg-sage-subtle">
              <label className="text-xs font-bold text-forest-text block">
                Select Corrected Scientific Verdict:
              </label>
              <select
                value={overriddenStatus}
                onChange={(e: any) => setOverriddenStatus(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-sage-border bg-white text-forest-text text-xs focus:outline-none focus:border-forest-text font-mono font-semibold"
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-forest-text block">
              Reviewer Notes (Citation Rationale)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record justification based on cited text..."
              rows={3}
              className="w-full p-3 rounded-2xl border border-sage-border bg-white text-forest-text text-xs focus:outline-none focus:border-forest-text resize-none font-sans placeholder:text-forest-text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-forest-text block">
              Auditor Name / Academic Attribution
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-sage-border bg-white text-forest-text text-xs font-mono font-semibold focus:outline-none focus:border-forest-text"
            />
          </div>

          <button
            onClick={handleRecordReview}
            disabled={isSubmitting}
            className="w-full py-3 rounded-full btn-lime-gradient text-forest-text font-bold shadow-sm transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckIcon size={14} />
            {isSubmitting ? 'Recording Decision...' : 'Save Audit Decision & Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
