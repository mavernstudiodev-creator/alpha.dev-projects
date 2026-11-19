import React, { useState, useRef } from 'react';
import { UploadIcon, RefreshIcon, InfoIcon } from '../common/Icons';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
  processingStage?: string;
  error?: string | null;
  onReset?: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelect,
  isUploading,
  uploadProgress,
  processingStage = 'Extracting claims and references...',
  error,
  onReset,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandle = (file: File) => {
    setLocalError(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setLocalError('Invalid file format. Only scientific research PDF manuscripts are accepted.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setLocalError('Document size exceeds the 50 MB processing limit.');
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const activeError = error || localError;

  return (
    <div className="w-full space-y-6">
      {/* Drag & Drop Surface */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-forest-text bg-sage-mint/60'
            : isUploading
            ? 'border-sage-border bg-sage-subtle'
            : activeError
            ? 'border-verdict-contradictory bg-verdict-contradictory-bg/40'
            : 'border-sage-border bg-sage-bg/70 hover:border-forest-text/40 hover:bg-sage-subtle/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              validateAndHandle(e.target.files[0]);
            }
          }}
          disabled={isUploading}
        />

        {isUploading ? (
          /* Real Upload Progress & Processing Status */
          <div className="space-y-4 max-w-md mx-auto py-4">
            <div className="w-12 h-12 rounded-full border-3 border-forest-text border-t-transparent animate-spin mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-forest-text">
                Analyzing Research Manuscript...
              </h3>
              <p className="text-xs font-mono text-forest-text-secondary mt-1">
                {processingStage}
              </p>
            </div>

            {/* Continuous Progress Bar */}
            <div className="w-full bg-sage-subtle rounded-full h-2.5 border border-sage-border overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-lime-btn-from to-lime-btn-to h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-forest-text-muted">
              <span>FastAPI Verification Pipeline</span>
              <span className="font-semibold text-forest-text">{Math.round(uploadProgress)}%</span>
            </div>
          </div>
        ) : activeError ? (
          /* Error & Retry State */
          <div className="space-y-4 max-w-md mx-auto py-2">
            <div className="w-12 h-12 rounded-full bg-verdict-contradictory-bg border border-verdict-contradictory-border flex items-center justify-center text-verdict-contradictory mx-auto">
              <InfoIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-verdict-contradictory">
                Upload Validation Failed
              </h3>
              <p className="text-xs text-forest-text-secondary mt-1">
                {activeError}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  setLocalError(null);
                  if (onReset) onReset();
                }}
                className="px-4 py-2 rounded-full bg-white border border-sage-border text-forest-text text-xs font-medium hover:bg-sage-subtle transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <RefreshIcon size={13} />
                Try Another File
              </button>
            </div>
          </div>
        ) : (
          /* Ready Upload Prompt */
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-sage-border flex items-center justify-center text-forest-text mx-auto shadow-sm">
              <UploadIcon size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-forest-text">
                Drag and drop your scientific manuscript PDF here
              </h3>
              <p className="text-xs text-forest-text-secondary">
                or select from your local file system to extract claims & citations
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-lime-gradient px-6 py-2.5 rounded-full text-xs font-bold text-forest-text shadow-sm"
              >
                Choose PDF File
              </button>
            </div>

            <div className="text-[11px] font-mono text-forest-text-muted flex items-center justify-center gap-3 pt-2">
              <span>PDF format required</span>
              <span>·</span>
              <span>Up to 50 MB</span>
              <span>·</span>
              <span>Local extraction</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
