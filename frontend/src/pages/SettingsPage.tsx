import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { BackendHealth } from '../types';
import { RefreshIcon, CheckIcon } from '../components/common/Icons';
import { useToast } from '../components/common/Toast';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();

  const [apiUrl] = useState<string>(
    import.meta.env.VITE_API_URL || '/api (same-origin proxy)'
  );
  const [healthStatus, setHealthStatus] = useState<BackendHealth | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [preferOpenAccess, setPreferOpenAccess] = useState<boolean>(true);

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const res = await apiService.checkHealth();
      if (res.available && res.data) {
        setHealthStatus(res.data);
        addToast({
          type: 'success',
          title: 'Backend Connected',
          message: `Connected to ${res.data.service} (v${res.data.research_engine_version}).`,
        });
      } else {
        setHealthStatus(null);
        addToast({
          type: 'warning',
          title: 'Backend Unreachable',
          message: 'CiteVerify API is unavailable. Document and assistant actions require a backend connection.',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-sage-border pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
          Workspace Settings
        </h2>
        <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
          Interface preferences, backend API connection telemetry, and algorithmic verification thresholds.
        </p>
      </div>

      {/* 1. Theme Configuration Display */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-forest-text">Design System & Theme</h3>
          <p className="text-xs text-forest-text-secondary mt-0.5">
            Active visual system calibrated to research platform aesthetics.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-sage-border bg-sage-subtle flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-forest-text block">Pale Sage & Forest Botanical</span>
            <span className="text-[11px] font-mono text-forest-text-secondary">
              Soft off-white canvas, forest-green headings, mint accents, lime-gradient controls.
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-sage-mint text-forest-text text-xs font-mono font-bold flex items-center gap-1.5">
            <CheckIcon size={12} />
            Active
          </span>
        </div>
      </div>

      {/* 2. Backend API Endpoint Telemetry */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-forest-text">Backend API Endpoint</h3>
          <p className="text-xs text-forest-text-secondary mt-0.5">
            Configured environment variable: <code className="font-mono text-forest-text font-bold">VITE_API_URL</code>
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={apiUrl}
              readOnly
              className="flex-1 px-4 py-2.5 rounded-full border border-sage-border bg-sage-subtle text-forest-text font-mono text-xs focus:outline-none"
            />
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="btn-lime-gradient px-5 py-2.5 rounded-full text-forest-text text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <RefreshIcon size={13} className={isTesting ? 'animate-spin' : ''} />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-sage-border bg-sage-subtle text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-forest-text-secondary">Connection Status:</span>
              <span
                className={`font-bold ${
                  healthStatus ? 'text-verdict-supported' : 'text-verdict-unsupported'
                }`}
              >
                {healthStatus ? 'ONLINE · FASTAPI LIVE' : 'API UNAVAILABLE'}
              </span>
            </div>
            {healthStatus && (
              <div className="text-[11px] font-mono text-forest-text-muted space-y-0.5 pt-1">
                <div>Service: {healthStatus.service}</div>
                <div>Engine Version: {healthStatus.research_engine_version}</div>
                <div>Taxonomy: 6 verdict categories loaded</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Algorithmic Verification Thresholds */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-forest-text">Verification Engine Calibration</h3>
          <p className="text-xs text-forest-text-secondary mt-0.5">
            Engine policies are configured on the backend and are not changed by these workspace controls.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-forest-text">
                Minimum Concordance Threshold for SUPPORTED Verdict
              </label>
              <span className="font-mono font-bold text-forest-text bg-sage-subtle px-2.5 py-0.5 rounded-full border border-sage-border">
                {minConfidence}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              disabled
              className="w-full accent-forest-text cursor-pointer"
            />
            <p className="text-[11px] text-forest-text-secondary">
              Claims with concordance below this threshold will default to PARTIALLY_SUPPORTED or INSUFFICIENT_EVIDENCE.
            </p>
          </div>

          <div className="pt-3 border-t border-sage-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-forest-text block">
                Prioritize Open-Access Repositories
              </span>
              <span className="text-[11px] text-forest-text-secondary">
                Resolver order is configured by the backend and cannot be changed from this workspace.
              </span>
            </div>
            <input
              type="checkbox"
              checked={preferOpenAccess}
              onChange={(e) => setPreferOpenAccess(e.target.checked)}
              disabled
              className="w-4 h-4 accent-forest-text rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4. Session Data Management */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-forest-text">Document and Review Storage</h3>
          <p className="text-xs text-forest-text-secondary mt-0.5">
            Verification records and human review decisions are stored by the configured backend database.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-sage-subtle border border-sage-border text-[11px] font-mono font-bold text-forest-text shrink-0">Server managed</span>
      </div>
    </div>
  );
};
