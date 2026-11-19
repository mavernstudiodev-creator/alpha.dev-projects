import React from 'react';
import { Link } from 'react-router-dom';
import { CiteVerifyLogo, ChevronLeftIcon, ProviderIcon, ExternalLinkIcon } from '../components/common/Icons';
import { apiService } from '../services/api';

export const SourcesInfoPage: React.FC = () => {
  const resolvers = apiService.getResolvers();

  return (
    <div className="min-h-screen bg-sage-bg text-forest-text flex flex-col font-sans">
      <header className="border-b border-sage-border bg-white sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <CiteVerifyLogo size="md" />
            </Link>
            <span className="text-xs font-mono text-forest-text-muted">|</span>
            <Link to="/" className="text-xs text-forest-text-secondary hover:text-forest-text flex items-center gap-1 font-bold">
              <ChevronLeftIcon size={12} />
              Home
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/upload"
              className="btn-lime-gradient px-4 py-2 rounded-full text-forest-text text-xs font-bold shadow-sm"
            >
              Start an analysis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-forest-text-secondary">
              SCHOLARLY INTEGRATIONS
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-forest-text tracking-tight">
              Federated Academic Registries
            </h1>
            <p className="text-sm sm:text-base text-forest-text-secondary max-w-xl mx-auto leading-relaxed">
              CiteVerify interfaces with the global academic knowledge graph to cross-reference scientific assertions against peer-reviewed records.
            </p>
          </div>

          <div className="space-y-6">
            {resolvers.map((res) => (
              <div
                key={res.id}
                className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-4 hover:border-forest-text/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-forest-text font-bold text-base">
                    <div className="w-8 h-8 rounded-lg bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
                      <ProviderIcon provider={res.id} size={18} />
                    </div>
                    <span>{res.name}</span>
                  </div>
                  <span className="text-xs font-mono text-forest-text font-bold bg-sage-subtle px-3 py-1 rounded-full border border-sage-border">
                    {res.indexedWorks} Works Indexed
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-forest-text-secondary leading-relaxed">
                  {res.description}
                </p>

                <div className="pt-3 border-t border-sage-border flex items-center justify-between text-xs font-mono text-forest-text-muted">
                  <span>API Latency: {res.latency}</span>
                  <a
                    href={res.endpoint}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest-text font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLinkIcon size={12} />
                    Documentation
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-sage-border bg-white py-6 px-6 text-center text-xs font-mono text-forest-text-muted">
        CiteVerify · Developed by Alpha Dev · Research Platform
      </footer>
    </div>
  );
};
