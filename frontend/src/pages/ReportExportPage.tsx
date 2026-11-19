import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { DocumentVerificationReport, DocumentListItem } from '../types';
import { DownloadIcon, CopyIcon, CheckIcon, ChevronLeftIcon, FilePdfIcon } from '../components/common/Icons';
import { useToast } from '../components/common/Toast';
import { Skeleton } from '../components/common/SkeletonLoader';

export const ReportExportPage: React.FC = () => {
  const { docId: paramDocId } = useParams<{ docId?: string }>();
  const { addToast } = useToast();

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(paramDocId || '');
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [currentDoc, setCurrentDoc] = useState<DocumentVerificationReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setSelectedDocId(paramDocId || '');
  }, [paramDocId]);

  useEffect(() => {
    async function init() {
      try {
        const docs = await apiService.getDocuments();
        setDocuments(docs);
        if (!paramDocId && docs.length > 0) {
          setSelectedDocId(docs[0].id);
        }
      } catch {
        setLoadError('Could not load the document list. Check the API connection and retry.');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [paramDocId]);

  useEffect(() => {
    async function loadReport() {
      if (!selectedDocId) {
        setIsLoading(false);
        setCurrentDoc(null);
        setMarkdownContent('');
        return;
      }
      setIsLoading(true);
      setLoadError('');
      try {
        const [doc, md] = await Promise.all([
          apiService.getDocument(selectedDocId),
          apiService.exportMarkdown(selectedDocId),
        ]);
        setCurrentDoc(doc);
        setMarkdownContent(md);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not generate report for the selected document.');
        addToast({
          type: 'error',
          title: 'Export Failed',
          message: err instanceof Error ? err.message : 'Could not generate report for the selected document.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [selectedDocId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setIsCopied(true);
    addToast({
      type: 'success',
      title: 'Report Copied',
      message: 'Markdown audit report copied to system clipboard.',
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CiteVerify_Audit_${selectedDocId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast({
      type: 'info',
      title: 'Report Downloaded',
      message: `Downloaded CiteVerify_Audit_${selectedDocId}.md`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={currentDoc ? `/documents/${currentDoc.document_id}` : '/dashboard'}
            className="p-2 rounded-full border border-sage-border bg-white text-forest-text-secondary hover:text-forest-text transition-colors shadow-xs"
            title="Back to Workspace"
          >
            <ChevronLeftIcon size={14} />
          </Link>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
              Verification Audit Reports
            </h2>
            <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
              Structured Markdown report generation with complete evidence passages and reviewer provenance.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            disabled={isLoading || !markdownContent}
            className="px-4 py-2 rounded-full border border-sage-border bg-white text-forest-text text-xs font-bold hover:bg-sage-subtle transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isCopied ? <CheckIcon size={13} className="text-verdict-supported" /> : <CopyIcon size={13} />}
            {isCopied ? 'Copied' : 'Copy Markdown'}
          </button>

          <button
            onClick={handleDownload}
            disabled={isLoading || !markdownContent}
            className="btn-lime-gradient px-4 py-2 rounded-full text-forest-text text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <DownloadIcon size={13} />
            Download .md File
          </button>
          {selectedDocId && (
            <a href={apiService.exportPdfUrl(selectedDocId)} className="px-4 py-2 rounded-full border border-sage-border bg-white text-forest-text text-xs font-bold hover:bg-sage-subtle transition-all flex items-center gap-1.5 shadow-xs">
              <FilePdfIcon size={13} />
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Document Selector Bar */}
      {documents.length > 0 && (
        <div className="flex items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-sage-border shadow-card text-xs">
          <span className="font-mono text-forest-text font-bold shrink-0">Select Document:</span>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full sm:w-auto px-4 py-1.5 rounded-full border border-sage-border bg-sage-subtle text-forest-text text-xs focus:outline-none focus:border-forest-text font-mono font-semibold"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.filename}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Markdown Preview Area */}
      <div className="bg-white rounded-3xl border border-sage-border shadow-card overflow-hidden">
        <div className="border-b border-sage-border bg-sage-subtle px-5 py-3 flex items-center justify-between text-xs font-mono text-forest-text-muted">
          <span>Raw Markdown Source ({markdownContent.length} bytes)</span>
          <span>GET /api/v1/documents/{selectedDocId}/export</span>
        </div>

        <div className="p-6 overflow-auto max-h-[600px] bg-sage-bg">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : (
            loadError ? <p role="alert" className="text-xs text-verdict-contradictory">{loadError}</p>
              : markdownContent ? <pre className="font-mono text-xs text-forest-text leading-relaxed whitespace-pre-wrap select-all">{markdownContent}</pre>
                : <p className="text-xs text-forest-text-secondary">Upload and verify a document to generate an audit report.</p>
          )}
        </div>
      </div>
    </div>
  );
};
