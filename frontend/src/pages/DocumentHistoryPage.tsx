import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { DocumentListItem, HumanReviewRecord } from '../types';
import { VerdictBadge } from '../components/common/VerdictBadge';
import { FilePdfIcon, AuditIcon, ChevronRightIcon } from '../components/common/Icons';

export const DocumentHistoryPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [reviews, setReviews] = useState<HumanReviewRecord[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'reviews' | 'uploads'>('all');

  useEffect(() => {
    async function load() {
      try {
        const [docs, revs] = await Promise.all([
          apiService.getDocuments(),
          Promise.resolve(apiService.getRecentReviews()),
        ]);
        setDocuments(docs);
        setReviews(revs);
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-sage-border pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
          Audit History & Ledger
        </h2>
        <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
          Chronological provenance trail of manuscript ingestions, algorithmic evaluations, and human auditor overrides.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-sage-border shadow-card text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-full border text-xs font-mono transition-all ${
              filterType === 'all'
                ? 'border-forest-text bg-forest-text text-white font-bold shadow-xs'
                : 'border-sage-border bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilterType('reviews')}
            className={`px-4 py-2 rounded-full border text-xs font-mono transition-all ${
              filterType === 'reviews'
                ? 'border-forest-text bg-forest-text text-white font-bold shadow-xs'
                : 'border-sage-border bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
            }`}
          >
            Human Audits ({reviews.length})
          </button>
          <button
            onClick={() => setFilterType('uploads')}
            className={`px-4 py-2 rounded-full border text-xs font-mono transition-all ${
              filterType === 'uploads'
                ? 'border-forest-text bg-forest-text text-white font-bold shadow-xs'
                : 'border-sage-border bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
            }`}
          >
            Manuscript Ingestions ({documents.length})
          </button>
        </div>

        <div className="text-[11px] font-mono text-forest-text-muted">
          Immutable SQLite Provenance Log
        </div>
      </div>

      {/* History Items Feed */}
      <div className="space-y-5">
        {/* Human Reviews Stream */}
        {(filterType === 'all' || filterType === 'reviews') && (
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest-text block">
              HUMAN AUDITOR DECISIONS
            </span>

            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 sm:p-6 rounded-3xl border border-sage-border bg-white shadow-card space-y-3 hover:border-forest-text/30 transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
                      <AuditIcon size={13} />
                    </div>
                    <span className="font-mono font-bold text-forest-text">{rev.id}</span>
                    <span className="text-forest-text-muted">·</span>
                    <span className="font-bold text-forest-text">
                      Claim {rev.claim_id} ({rev.document_id})
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-forest-text-muted">
                    {new Date(rev.reviewed_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-sage-subtle border border-sage-border text-[10px] font-mono font-bold uppercase text-forest-text">
                    Decision: {rev.decision}
                  </span>
                  {rev.overridden_status && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-forest-text-muted">
                      <span>Overridden status:</span>
                      <VerdictBadge status={rev.overridden_status} size="sm" />
                    </div>
                  )}
                </div>

                {rev.notes && (
                  <p className="text-xs text-forest-text-secondary italic bg-sage-subtle p-3 rounded-xl border border-sage-border leading-relaxed">
                    "{rev.notes}"
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono text-forest-text-secondary pt-1">
                  <span>Reviewer: {rev.reviewer_name}</span>
                  <Link
                    to={`/documents/${rev.document_id}`}
                    className="text-forest-text font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Open Document
                    <ChevronRightIcon size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Document Ingestion Stream */}
        {(filterType === 'all' || filterType === 'uploads') && (
          <div className="space-y-3 pt-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest-text-muted block">
              MANUSCRIPT INGESTIONS
            </span>

            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-5 sm:p-6 rounded-3xl border border-sage-border bg-white shadow-card space-y-3 hover:border-forest-text/30 transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
                      <FilePdfIcon size={13} />
                    </div>
                    <span className="font-mono font-bold text-forest-text">{doc.id}</span>
                    <span className="text-forest-text-muted">·</span>
                    <span className="font-bold text-forest-text truncate max-w-md">
                      {doc.filename}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-forest-text-muted">
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Active'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-forest-text-secondary pt-1">
                  <span>
                    {doc.total_pages} Pages · {doc.summary?.total_claims || 0} Claims Evaluated (
                    {doc.summary?.supported || 0} Supported, {doc.summary?.unsupported || 0} Unsupported)
                  </span>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="text-forest-text font-bold hover:underline inline-flex items-center gap-1"
                  >
                    View in Workspace
                    <ChevronRightIcon size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
