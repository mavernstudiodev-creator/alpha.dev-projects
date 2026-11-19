import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UploadZone } from '../components/upload/UploadZone';
import { apiService } from '../services/api';
import { useToast } from '../components/common/Toast';
import { DocumentListItem } from '../types';
import { FilePdfIcon, ChevronRightIcon, InfoIcon } from '../components/common/Icons';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocumentListItem[]>([]);

  useEffect(() => {
    async function loadRecent() {
      try {
        const docs = await apiService.getDocuments();
        setRecentDocs(docs.slice(0, 4));
      } catch {
        // ignore
      }
    }
    loadRecent();
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setProgress(15);
    setError(null);
    setStage('Ingesting PDF and extracting structural layout...');

    try {
      const report = await apiService.uploadDocument(file, (p, currentStage) => {
        setProgress(p);
        if (currentStage) setStage(currentStage);
      });

      setProgress(100);
      setStage('Verification complete');

      addToast({
        type: 'success',
        title: 'Document Verified',
        message: `Extracted ${report.summary.total_claims} claims from "${report.filename}"`,
      });

      setTimeout(() => {
        navigate(`/documents/${report.document_id}`);
      }, 500);
    } catch (err: any) {
      setIsUploading(false);
      setError(err?.message || 'Could not complete verification pipeline. Ensure FastAPI backend is running.');
      addToast({
        type: 'error',
        title: 'Analysis Failed',
        message: err?.message || 'Verification pipeline encountered an error.',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-sage-border pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
          New Document Analysis
        </h2>
        <p className="text-sm text-forest-text-secondary mt-1">
          Upload an academic research PDF for automated claim mining, bibliographic resolution, and evidence harvesting.
        </p>
      </div>

      {/* Upload Zone Card */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-8 shadow-card space-y-4">
        <UploadZone
          onFileSelect={handleFileUpload}
          isUploading={isUploading}
          uploadProgress={progress}
          processingStage={stage}
          error={error}
          onReset={() => {
            setError(null);
            setIsUploading(false);
          }}
        />
      </div>

      {/* Information Callout */}
      <div className="p-5 rounded-2xl border border-sage-border bg-sage-subtle text-xs text-forest-text-secondary space-y-2 leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-forest-text">
          <InfoIcon size={16} className="text-forest-text" />
          <span>Scientific Ingestion & Paywall Abstention Policy</span>
        </div>
        <p>
          Uploaded documents are parsed locally. Reference callouts are mapped against OpenAlex, Crossref, Semantic Scholar, and Europe PMC. In accordance with CiteVerify metascience principles, paywalled works without open text passages are classified as <strong className="text-forest-text">INSUFFICIENT_EVIDENCE</strong> rather than speculative assertion.
        </p>
      </div>

      {/* Recent Upload History */}
      {recentDocs.length > 0 && !isUploading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-forest-text">
              Recent Workspace Documents
            </h3>
            <Link to="/documents" className="text-xs font-semibold text-forest-text hover:text-forest-text-secondary">
              View All ({recentDocs.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="p-4 rounded-2xl border border-sage-border bg-white hover:border-forest-text/30 hover:shadow-card transition-all flex items-center justify-between group"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
                      <FilePdfIcon size={13} />
                    </div>
                    <span className="text-xs font-bold text-forest-text truncate group-hover:text-forest-text transition-colors">
                      {doc.filename}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-forest-text-muted pl-9">
                    {doc.id} · {doc.summary?.total_claims || 0} claims · {doc.total_pages} pages
                  </div>
                </div>
                <ChevronRightIcon size={14} className="text-forest-text-muted group-hover:text-forest-text shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
