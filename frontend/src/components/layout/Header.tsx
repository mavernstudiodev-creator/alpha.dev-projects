import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuIcon, UploadIcon } from '../common/Icons';
import { apiService } from '../../services/api';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title = 'Overview',
  subtitle,
}) => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    async function verifyBackend() {
      const res = await apiService.checkHealth();
      setBackendOnline(res.available);
    }
    verifyBackend();
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-sage-border px-4 sm:px-8 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-forest-text-secondary hover:text-forest-text hover:bg-sage-subtle lg:hidden transition-colors"
          aria-label="Toggle navigation"
        >
          <MenuIcon size={18} />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold text-forest-text truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <span className="text-xs text-forest-text-secondary hidden sm:inline truncate font-medium">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right: Backend Status, User & Gradient CTA Action */}
      <div className="flex items-center gap-3 text-xs shrink-0">
        {/* Backend Connectivity Status Pill */}
        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-sage-border bg-sage-subtle font-mono text-[11px]"
          title={
            backendOnline
              ? 'FastAPI backend active at http://127.0.0.1:8000'
              : 'Backend not detected at 127.0.0.1:8000. Running in offline benchmark mode.'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendOnline ? 'bg-verdict-supported' : 'bg-verdict-unsupported'
            }`}
          />
          <span className="text-forest-text-secondary font-medium">
            {backendOnline ? 'API Live (127.0.0.1:8000)' : 'Offline Benchmark'}
          </span>
        </div>

        {/* Auditor Profile Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-sage-border">
          <div className="w-7 h-7 rounded-full bg-sage-mint text-forest-text border border-sage-border flex items-center justify-center font-bold font-mono text-[11px]">
            EV
          </div>
          <div className="text-left leading-none hidden xl:block">
            <span className="text-xs font-bold text-forest-text block">Dr. Elena Vance</span>
            <span className="text-[10px] text-forest-text-muted font-medium">Lead Auditor</span>
          </div>
        </div>

        {/* Primary Yellow-to-Green Gradient CTA Button */}
        <Link
          to="/upload"
          className="btn-lime-gradient px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shrink-0"
        >
          <UploadIcon size={14} />
          <span>Upload PDF</span>
        </Link>
      </div>
    </header>
  );
};
