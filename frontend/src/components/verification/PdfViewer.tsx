import React, { useState } from 'react';
import {
  ZoomInIcon,
  ZoomOutIcon,
  PagePrevIcon,
  PageNextIcon,
  DownloadIcon,
  FilePdfIcon,
} from '../common/Icons';
import { Claim } from '../../types';

interface PdfViewerProps {
  docId: string;
  filename: string;
  totalPages: number;
  pdfUrl: string;
  activeClaim?: Claim | null;
  onPageChange?: (page: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  docId,
  filename,
  totalPages,
  pdfUrl,
  activeClaim,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(activeClaim?.page_number || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [pdfLoadError, setPdfLoadError] = useState<boolean>(false);

  // Sync with active claim page when claim changes
  React.useEffect(() => {
    if (activeClaim?.page_number) {
      setCurrentPage(activeClaim.page_number);
      if (onPageChange) onPageChange(activeClaim.page_number);
    }
  }, [activeClaim]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const next = currentPage - 1;
      setCurrentPage(next);
      if (onPageChange) onPageChange(next);
    }
  };

  const handleNextPage = () => {
    if (currentPage < Math.max(totalPages, 1)) {
      const next = currentPage + 1;
      setCurrentPage(next);
      if (onPageChange) onPageChange(next);
    }
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 15, 175));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 15, 75));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-sage-border overflow-hidden shadow-card">
      {/* Top PDF Controls Toolbar */}
      <div className="h-12 border-b border-sage-border bg-sage-subtle px-4 py-2 flex items-center justify-between gap-2 shrink-0 text-xs">
        {/* Left: Document info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
            <FilePdfIcon size={13} />
          </div>
          <span className="font-bold text-forest-text truncate max-w-[160px] sm:max-w-[220px]" title={filename}>
            {filename}
          </span>
        </div>

        {/* Center: Page Controls */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white px-2.5 py-1 rounded-full border border-sage-border shadow-xs">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-0.5 text-forest-text-secondary hover:text-forest-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <PagePrevIcon size={12} />
          </button>
          <span className="text-forest-text font-semibold">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-0.5 text-forest-text-secondary hover:text-forest-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <PageNextIcon size={12} />
          </button>
        </div>

        {/* Right: Zoom & Download Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-full text-forest-text-secondary hover:text-forest-text hover:bg-white transition-colors"
            title="Zoom out"
          >
            <ZoomOutIcon size={14} />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-[10px] font-mono rounded-full text-forest-text-secondary hover:text-forest-text hover:bg-white transition-colors font-semibold"
            title="Reset zoom"
          >
            {zoomLevel}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-full text-forest-text-secondary hover:text-forest-text hover:bg-white transition-colors"
            title="Zoom in"
          >
            <ZoomInIcon size={14} />
          </button>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={filename}
            className="p-1.5 ml-1 rounded-full text-forest-text-secondary hover:text-forest-text hover:bg-white transition-colors"
            title="Download original PDF"
          >
            <DownloadIcon size={14} />
          </a>
        </div>
      </div>

      {/* PDF Viewer Body */}
      <div className="flex-1 bg-sage-bg p-4 overflow-auto flex items-start justify-center relative">
        {/* Render PDF Object */}
        {!pdfLoadError ? (
          <div
            className="w-full h-full max-w-3xl bg-white rounded-2xl border border-sage-border shadow-card relative overflow-hidden transition-all duration-150 flex flex-col"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {/* Embedded Native PDF Viewer */}
            <object
              data={`${pdfUrl}#page=${currentPage}&zoom=${zoomLevel}`}
              type="application/pdf"
              className="w-full h-full min-h-[550px] border-0"
              onError={() => setPdfLoadError(true)}
            >
              {/* Fallback layout representation when embed is unsupported or offline */}
              <div className="p-8 space-y-6 text-forest-text max-w-xl mx-auto h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-sage-border pb-3 flex justify-between items-center text-xs font-mono text-forest-text-muted">
                    <span className="font-semibold">{filename}</span>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>

                  <h3 className="text-xl font-bold text-forest-text leading-tight">
                    {filename.replace('.pdf', '')}
                  </h3>

                  <div className="text-xs text-forest-text-secondary font-mono">
                    Manuscript Extract · Section Evaluation
                  </div>

                  {activeClaim ? (
                    <div className="p-5 rounded-2xl border border-forest-text/20 bg-sage-mint/50 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-forest-text font-bold">
                        <span>ANCHORED CLAIM [{activeClaim.claim_id}]</span>
                        <span>PAGE {activeClaim.page_number}</span>
                      </div>
                      <p className="text-sm font-sans text-forest-text leading-relaxed font-medium">
                        "{activeClaim.statement}"
                      </p>
                      <div className="text-xs font-mono text-forest-text-secondary pt-1">
                        In-text Context: {activeClaim.context_sentence}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-forest-text-secondary leading-relaxed">
                      Select an extracted claim from the right-hand panel to inspect highlighted citation locations and passage concordance.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-sage-border text-[11px] font-mono text-forest-text-muted flex justify-between items-center">
                  <span>CiteVerify Academic Viewer</span>
                  <span>DOI Resolvers Synchronized</span>
                </div>
              </div>
            </object>
          </div>
        ) : (
          /* Error State with Graceful Fallback */
          <div className="p-8 max-w-md mx-auto text-center space-y-3 bg-white rounded-3xl border border-sage-border shadow-card">
            <FilePdfIcon size={32} className="mx-auto text-forest-text-muted" />
            <h4 className="text-sm font-bold text-forest-text">Interactive PDF Preview</h4>
            <p className="text-xs text-forest-text-secondary leading-relaxed">
              Native PDF plugin unavailable in current browser sandbox. You can download the manuscript or inspect extracted claims in the review panel.
            </p>
            <a
              href={pdfUrl}
              download={filename}
              className="inline-flex items-center gap-2 btn-lime-gradient px-5 py-2.5 rounded-full font-bold text-xs text-forest-text shadow-sm"
            >
              <DownloadIcon size={14} />
              Download Original PDF
            </a>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="h-8 border-t border-sage-border bg-sage-subtle px-4 flex items-center justify-between text-[11px] font-mono text-forest-text-muted shrink-0">
        <span>Document ID: {docId}</span>
        {activeClaim && (
          <span className="text-forest-text font-bold">
            Synced to Claim {activeClaim.claim_id} (Page {activeClaim.page_number})
          </span>
        )}
      </div>
    </div>
  );
};
