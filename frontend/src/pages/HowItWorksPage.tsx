import React from 'react';
import { Link } from 'react-router-dom';
import { CiteVerifyLogo, ChevronLeftIcon } from '../components/common/Icons';

export const HowItWorksPage: React.FC = () => {
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
              SYSTEM ARCHITECTURE
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-forest-text tracking-tight">
              The CiteVerify Verification Pipeline
            </h1>
            <p className="text-sm sm:text-base text-forest-text-secondary max-w-xl mx-auto leading-relaxed">
              A 4-stage systematic pipeline that links every verdict to traceable research evidence.
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-forest-text bg-sage-mint px-2.5 py-0.5 rounded-full">STAGE 01</span>
                <span className="text-[11px] font-mono text-forest-text-muted">PDF Extractor</span>
              </div>
              <h2 className="text-base font-bold text-forest-text">Manuscript Layout Ingestion</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                The local FastAPI backend receives the PDF file and splits text streams into hierarchical sections (Abstract, Introduction, Results, Discussion, References). Optical coordinates preserve line-level bounding boxes for exact page mapping.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-forest-text bg-sage-mint px-2.5 py-0.5 rounded-full">STAGE 02</span>
                <span className="text-[11px] font-mono text-forest-text-muted">Claim Miner & Parser</span>
              </div>
              <h2 className="text-base font-bold text-forest-text">Claim Mining & Bibliographic Linking</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Pattern extractors identify assertions coupled with numeric reference tags ([1], [2-4]). The bibliography parser isolates reference titles, author listings, and publication dates to build an in-memory citation graph.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-forest-text bg-sage-mint px-2.5 py-0.5 rounded-full">STAGE 03</span>
                <span className="text-[11px] font-mono text-forest-text-muted">Federated Harvester</span>
              </div>
              <h2 className="text-base font-bold text-forest-text">Federated Evidence Harvesting</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                CiteVerify dispatches concurrent queries to Crossref, OpenAlex, Semantic Scholar, Europe PMC, and arXiv. Open-access full texts are mined for ground-truth passages that directly match the extracted proposition.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-forest-text bg-sage-mint px-2.5 py-0.5 rounded-full">STAGE 04</span>
                <span className="text-[11px] font-mono text-forest-text-muted">Review & Provenance</span>
              </div>
              <h2 className="text-base font-bold text-forest-text">Evaluator & Human Audit Oversight</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                The natural language evaluator compares proposition semantics against ground-truth passages, outputting concordance scores and classifications. In the workspace, human researchers confirm or override verdicts before exporting structured reports.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-sage-border bg-white py-6 px-6 text-center text-xs font-mono text-forest-text-muted">
        CiteVerify · Developed by Alpha Dev · Research Platform
      </footer>
    </div>
  );
};
