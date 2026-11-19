import React from 'react';
import { Link } from 'react-router-dom';
import { CiteVerifyLogo, ChevronLeftIcon } from '../components/common/Icons';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-sage-bg text-forest-text flex flex-col font-sans">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-forest-text-secondary">
              SCIENTIFIC PLATFORM CAPABILITIES
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-forest-text tracking-tight">
              Engineered for Transparent Research Verification
            </h1>
            <p className="text-sm sm:text-base text-forest-text-secondary max-w-xl mx-auto leading-relaxed">
              Every feature of CiteVerify is built around scientific credibility, source traceability, and human-in-the-loop oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <span className="text-xs font-mono text-forest-text font-bold uppercase">01 · EXTRACTION</span>
              <h2 className="text-base font-bold text-forest-text">Scientific Claim Extraction</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Extracts testable propositions, empirical assertions, and causal conclusions from research PDFs. Maps propositions directly to their in-text citation markers ([1], [2-4]) with page and paragraph bounding coordinates.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <span className="text-xs font-mono text-forest-text font-bold uppercase">02 · PARSING</span>
              <h2 className="text-base font-bold text-forest-text">Bibliography Parsing & Normalization</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Deconstructs messy, unstructured reference sections into structured bibliographic entities. Resolves author lists, publication years, journal venues, and official Digital Object Identifiers (DOIs).
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <span className="text-xs font-mono text-forest-text font-bold uppercase">03 · DISCOVERY</span>
              <h2 className="text-base font-bold text-forest-text">Multi-Database Citation Resolution</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Connects across Crossref, OpenAlex, Semantic Scholar, Europe PMC, and arXiv to verify publication authority, examine citation velocity, and locate open-access full-text depositions.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <span className="text-xs font-mono text-forest-text font-bold uppercase">04 · EVIDENCE</span>
              <h2 className="text-base font-bold text-forest-text">Ground-Truth Passage Harvesting</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Harvests verbatim passages directly from peer-reviewed articles. Aligns semantic propositions against cited excerpts to prevent paraphrasing distortions and citation bias.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <span className="text-xs font-mono text-forest-text font-bold uppercase">05 · TAXONOMY</span>
              <h2 className="text-base font-bold text-forest-text">6-Class Scientific Verdict Taxonomy</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Classifies claims into Supported, Partially Supported, Unsupported, Contradictory, Possibly Outdated, or Insufficient Evidence. Enforces explicit abstention when literature is paywalled.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-sage-border bg-white shadow-card space-y-3">
              <span className="text-xs font-mono text-forest-text font-bold uppercase">06 · AUDIT</span>
              <h2 className="text-base font-bold text-forest-text">Human-in-the-Loop Review Controls</h2>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Qualified researchers inspect source excerpts side-by-side with original PDFs, record override justifications, and generate permanent audit logs for peer review transparency.
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
