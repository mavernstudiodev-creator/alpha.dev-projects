import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { DocumentVerificationReport, Claim, ReviewSubmissionPayload } from '../types';
import { PdfViewer } from '../components/verification/PdfViewer';
import { VerificationPanel } from '../components/verification/VerificationPanel';
import { VerdictBadge } from '../components/common/VerdictBadge';
import { SearchIcon, ChevronLeftIcon, DownloadIcon, FilePdfIcon } from '../components/common/Icons';
import { Skeleton } from '../components/common/SkeletonLoader';
import { useToast } from '../components/common/Toast';
import { DocumentStatus } from '../services/api';

export const VerificationResultsPage: React.FC = () => {
  const { docId = '' } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [document, setDocument] = useState<DocumentVerificationReport | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pdf' | 'verification'>('verification'); // For mobile
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<DocumentStatus | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchReport() {
      setIsLoading(true);
      setLoadError('');
      try {
        const deadline = Date.now() + 15 * 60 * 1000;
        let status = await apiService.getDocumentStatus(docId);
        while (status.status === 'pending' || status.status === 'processing') {
          if (cancelled) return;
          setProcessingStatus(status);
          if (Date.now() >= deadline) throw new Error('Verification is taking longer than expected. Refresh the document later.');
          await new Promise((resolve) => window.setTimeout(resolve, 1400));
          status = await apiService.getDocumentStatus(docId);
        }
        if (status.status === 'failed') throw new Error(status.error_message || 'Document verification failed.');
        if (cancelled) return;
        setProcessingStatus(null);
        const doc = await apiService.getDocument(docId);
        if (cancelled) return;
        setDocument(doc);
        if (doc && doc.results && doc.results.length > 0) {
          setSelectedClaimId(doc.results[0].claim_id);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Could not retrieve verification report for document.');
        addToast({
          type: 'error',
          title: 'Document Load Error',
          message: err instanceof Error ? err.message : 'Could not retrieve verification report for document.',
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchReport();
    return () => { cancelled = true; };
  }, [docId]);

  if (isLoading) {
    if (processingStatus) return (
      <div className="max-w-lg mx-auto my-16 rounded-3xl border border-sage-border bg-white p-7 text-center shadow-card">
        <div className="mx-auto h-10 w-10 rounded-full border-3 border-forest-text border-t-transparent animate-spin" />
        <h2 className="mt-4 text-lg font-bold text-forest-text">Document verification in progress</h2>
        <p className="mt-1 text-xs capitalize text-forest-text-secondary">{processingStatus.job?.stage?.replace(/_/g, ' ') || processingStatus.status}</p>
        <div className="mt-4 h-2 rounded-full bg-sage-subtle overflow-hidden"><div className="h-full bg-forest-text transition-all" style={{ width: `${processingStatus.job?.progress_percent || 0}%` }} /></div>
        <p className="mt-1 text-[11px] font-mono text-forest-text-muted">{processingStatus.job?.progress_percent || 0}%</p>
      </div>
    );
    return (
      <div className="space-y-4 pb-12">
        <div className="flex justify-between items-center border-b border-sage-border pb-4">
          <Skeleton className="h-6 w-64 rounded-xl" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sage-border p-4 shadow-card">
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-6 bg-white rounded-3xl border border-sage-border p-5 space-y-4 shadow-card">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-sage-subtle border border-sage-border flex items-center justify-center mx-auto text-forest-text-muted">
          <FilePdfIcon size={32} />
        </div>
        <h3 className="text-lg font-bold text-forest-text">Document Not Found</h3>
        <p className="text-xs text-forest-text-secondary max-w-sm mx-auto">
          {loadError || `The requested verification record (${docId}) could not be loaded.`}
        </p>
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 btn-lime-gradient px-5 py-2.5 rounded-full font-bold text-xs text-forest-text shadow-sm"
        >
          <ChevronLeftIcon size={14} />
          Back to Documents
        </Link>
      </div>
    );
  }

  // Filter claims
  const filteredResults = document.results.filter((res) => {
    const matchesFilter =
      verdictFilter === 'all' || res.status === verdictFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      res.claim_statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeResult =
    document.results.find((r) => r.claim_id === selectedClaimId) ||
    document.results[0];

  const activeClaim: Claim | undefined = document.claims?.find(
    (c) => c.claim_id === activeResult?.claim_id
  );

  const handleReviewSubmit = async (claimId: string, payload: ReviewSubmissionPayload) => {
    setIsSubmittingReview(true);
    try {
      await apiService.submitReview(document.document_id, claimId, payload);
      // Refresh local document representation
      const updatedDoc = await apiService.getDocument(document.document_id);
      if (updatedDoc) {
        setDocument(updatedDoc);
      }
      addToast({
        type: 'success',
        title: 'Audit Decision Recorded',
        message: `Claim ${claimId} successfully marked as ${payload.decision.toUpperCase()}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Review Submission Failed',
        message: err?.message || 'Could not record review decision.',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const pdfUrl = apiService.getDocumentPdfUrl(document.document_id);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Action & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sage-border pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/documents"
            className="p-2 rounded-full border border-sage-border bg-white text-forest-text-secondary hover:text-forest-text transition-colors shrink-0 shadow-xs"
            title="Back to Documents"
          >
            <ChevronLeftIcon size={14} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-extrabold text-forest-text truncate">
                {document.filename}
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-sage-subtle border border-sage-border text-forest-text font-bold shrink-0">
                {document.document_id}
              </span>
            </div>
            <div className="text-[11px] font-mono text-forest-text-muted flex items-center gap-3 mt-0.5">
              <span>{document.total_pages} Pages</span>
              <span>·</span>
              <span>{document.summary.total_claims} Claims Evaluated</span>
              <span>·</span>
              <span className="text-verdict-supported font-bold">
                {document.summary.supported} Supported
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Link
            to={`/documents/${document.document_id}/export`}
            className="btn-lime-gradient px-4 py-2 rounded-full font-bold text-xs text-forest-text shadow-sm flex items-center gap-1.5"
          >
            <DownloadIcon size={13} />
            Export Audit Report
          </Link>
        </div>
      </div>

      {/* 2. Mobile Responsive Tab Switcher (<1024px) */}
      <div className="flex lg:hidden border border-sage-border rounded-full bg-sage-subtle p-1 text-xs font-mono font-medium">
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 py-1.5 rounded-full text-center transition-all ${
            activeTab === 'pdf'
              ? 'bg-white text-forest-text font-bold shadow-xs'
              : 'text-forest-text-secondary'
          }`}
        >
          Research PDF Manuscript
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={`flex-1 py-1.5 rounded-full text-center transition-all ${
            activeTab === 'verification'
              ? 'bg-white text-forest-text font-bold shadow-xs'
              : 'text-forest-text-secondary'
          }`}
        >
          Verification & Evidence ({filteredResults.length})
        </button>
      </div>

      {/* 3. Main Two-Panel Research Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-185px)] min-h-[640px]">
        {/* Left Panel: High-Precision PDF Viewer */}
        <div
          className={`lg:col-span-6 h-full ${
            activeTab === 'pdf' ? 'block' : 'hidden lg:block'
          }`}
        >
          <PdfViewer
            docId={document.document_id}
            filename={document.filename}
            totalPages={document.total_pages}
            pdfUrl={pdfUrl}
            activeClaim={activeClaim}
          />
        </div>

        {/* Right Panel: Verification Workspace & Evidence Inspector */}
        <div
          className={`lg:col-span-6 h-full flex flex-col gap-4 ${
            activeTab === 'verification' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Claim Selector Horizontal Bar */}
          <div className="bg-white rounded-3xl border border-sage-border p-4 shrink-0 space-y-3 shadow-card">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="relative flex-1">
                <SearchIcon size={13} className="absolute left-3 top-3 text-forest-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter claims by assertion or quote..."
                  className="w-full pl-9 pr-3 py-2 rounded-full border border-sage-border bg-sage-subtle text-forest-text text-xs focus:outline-none focus:border-forest-text placeholder:text-forest-text-muted"
                />
              </div>

              {/* Verdict Filter Select */}
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                className="px-3 py-2 rounded-full border border-sage-border bg-white text-forest-text text-xs focus:outline-none focus:border-forest-text font-mono font-semibold"
              >
                <option value="all">All Verdicts ({document.results.length})</option>
                <option value="supported">SUPPORTED</option>
                <option value="partially_supported">PARTIALLY_SUPPORTED</option>
                <option value="unsupported">UNSUPPORTED</option>
                <option value="contradictory">CONTRADICTORY</option>
                <option value="possibly_outdated">POSSIBLY_OUTDATED</option>
                <option value="insufficient_evidence">INSUFFICIENT_EVIDENCE</option>
              </select>
            </div>

            {/* Claim Quick Switcher Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
              {filteredResults.map((res) => {
                const isSelected = res.claim_id === activeResult?.claim_id;
                return (
                  <button
                    key={res.claim_id}
                    onClick={() => setSelectedClaimId(res.claim_id)}
                    className={`px-3 py-1.5 rounded-full border text-[11px] shrink-0 transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-forest-text bg-forest-text text-white font-bold shadow-xs'
                        : 'border-sage-border bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
                    }`}
                  >
                    <span>{res.claim_id}</span>
                    <VerdictBadge status={res.status} size="sm" showIcon={false} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Claim Detail & Evidence Auditor */}
          <div className="flex-1 min-h-0">
            {activeResult ? (
              <VerificationPanel
                docId={document.document_id}
                result={activeResult}
                onSubmitReview={handleReviewSubmit}
                isSubmitting={isSubmittingReview}
              />
            ) : (
              <div className="h-full bg-white rounded-3xl border border-sage-border p-8 flex items-center justify-center text-center text-xs text-forest-text-muted shadow-card">
                No claims match the selected search or filter criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
