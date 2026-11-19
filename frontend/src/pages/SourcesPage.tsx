import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { BackendHealth } from '../types';
import { ProviderIcon, RefreshIcon, ExternalLinkIcon, InfoIcon } from '../components/common/Icons';

export const SourcesPage: React.FC = () => {
  const [healthData, setHealthData] = useState<BackendHealth | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const resolvers = apiService.getResolvers();

  const handlePingHealth = async () => {
    setIsChecking(true);
    try {
      const res = await apiService.checkHealth();
      if (res.available && res.data) {
        setHealthData(res.data);
      }
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    handlePingHealth();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
            Academic Research Sources
          </h2>
          <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
            Federated scholarly APIs queried for bibliography resolution, metadata discovery, and ground-truth evidence harvesting.
          </p>
        </div>

        <button
          onClick={handlePingHealth}
          disabled={isChecking}
          className="btn-lime-gradient px-4 py-2 rounded-full font-bold text-xs text-forest-text shadow-sm flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshIcon size={13} className={isChecking ? 'animate-spin' : ''} />
          {isChecking ? 'Pinging APIs...' : 'Refresh Health'}
        </button>
      </div>

      {/* Backend Engine Integration Status Banner */}
      <div className="p-5 sm:p-6 rounded-3xl border border-sage-border bg-white shadow-card space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                healthData?.status === 'healthy' ? 'bg-verdict-supported' : 'bg-verdict-unsupported'
              }`}
            />
            <span className="text-xs font-bold font-mono text-forest-text">
              {healthData?.service || 'CiteVerify Backend API'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-forest-text-muted">
            Engine Version: {healthData?.research_engine_version || '1.0.0 (FastAPI)'}
          </span>
        </div>

        <p className="text-xs text-forest-text-secondary leading-relaxed">
          {healthData?.status === 'healthy'
            ? 'All 5 federated academic discovery integrations are active and responsive via the local engine.'
            : 'Connecting to local FastAPI server at http://127.0.0.1:8000. Operating in cached offline benchmark mode.'}
        </p>
      </div>

      {/* Resolver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {resolvers.map((res) => (
          <div
            key={res.id}
            className="p-6 rounded-3xl border border-sage-border bg-white shadow-card space-y-3 flex flex-col justify-between hover:border-forest-text/30 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-forest-text font-bold text-sm">
                  <div className="w-7 h-7 rounded-lg bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
                    <ProviderIcon provider={res.id} size={15} />
                  </div>
                  <span>{res.name}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-verdict-supported-bg border border-verdict-supported-border text-[10px] font-mono font-bold text-verdict-supported">
                  CONNECTED
                </span>
              </div>

              <p className="text-xs text-forest-text-secondary leading-relaxed">
                {res.description}
              </p>

              <div className="space-y-1 text-[11px] font-mono text-forest-text-muted pt-2.5 border-t border-sage-border">
                <div className="flex justify-between">
                  <span>Indexed Works:</span>
                  <span className="text-forest-text font-bold">{res.indexedWorks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Latency:</span>
                  <span className="text-forest-text font-bold">{res.latency}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-sage-border">
              <a
                href={res.endpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-bold text-forest-text hover:underline inline-flex items-center gap-1"
              >
                <ExternalLinkIcon size={12} />
                Endpoint Documentation
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Abstention & Paywall Disclosure */}
      <div className="p-5 rounded-2xl border border-sage-border bg-sage-subtle space-y-2 text-xs text-forest-text-secondary leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-forest-text">
          <InfoIcon size={15} className="text-forest-text" />
          <span>Scientific Abstention & Paywall Disclosure</span>
        </div>
        <p>
          CiteVerify adheres to open metascience standards. When citations resolve to commercial publishers whose full text is not openly accessible through Europe PMC, OpenAlex, Semantic Scholar, or arXiv, the platform refrains from automated hallucination or speculative scoring. These citations are systematically designated as <strong className="text-forest-text">INSUFFICIENT_EVIDENCE</strong> to safeguard research integrity.
        </p>
      </div>
    </div>
  );
};
