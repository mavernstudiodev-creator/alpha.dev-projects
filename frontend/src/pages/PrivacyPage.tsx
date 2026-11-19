import React from 'react';
import { Link } from 'react-router-dom';
import { CiteVerifyLogo, ChevronLeftIcon } from '../components/common/Icons';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-sage-bg text-forest-text flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-sage-border bg-white sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90">
              <CiteVerifyLogo size="md" />
            </Link>
            <span className="text-xs font-mono text-forest-text-muted">|</span>
            <Link to="/" className="text-xs text-forest-text-secondary hover:text-forest-text flex items-center gap-1 font-bold">
              <ChevronLeftIcon size={12} />
              Back to Home
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="btn-lime-gradient px-4 py-2 rounded-full text-forest-text text-xs font-bold shadow-sm"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-sage-border p-8 sm:p-12 shadow-card space-y-8">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-forest-text-secondary mb-2">
              Data Governance & Research Privacy
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-forest-text tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs font-mono text-forest-text-muted mt-2">
              Effective Date: November 2026 · Version 1.0.0
            </p>
          </div>

          <div className="border-t border-sage-border pt-6 space-y-6 text-sm text-forest-text-secondary leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-forest-text">
                1. Manuscript Ingestion & PDF Handling
              </h2>
              <p>
                When you upload a scientific paper to CiteVerify, the file is received by the local FastAPI application server and stored temporarily in the application data folder (<code className="font-mono text-xs px-2 py-0.5 rounded-full bg-sage-subtle text-forest-text border border-sage-border font-bold">data/uploads/</code>).
              </p>
              <p>
                PDFs are ingested exclusively for optical character layout extraction, bibliographic citation identification, and claim passage mapping. Uploaded files are never sold, rented, or distributed to advertising networks.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-forest-text">
                2. Academic Resolver Queries & API Telemetry
              </h2>
              <p>
                To resolve citations and retrieve ground-truth passages, CiteVerify queries public scholarly search APIs:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong className="text-forest-text">Crossref REST API:</strong> DOI authority metadata and publication years.</li>
                <li><strong className="text-forest-text">OpenAlex API:</strong> Scholarly entity graph, concepts, and open access URLs.</li>
                <li><strong className="text-forest-text">Semantic Scholar API:</strong> Citation contexts and paper abstracts.</li>
                <li><strong className="text-forest-text">Europe PMC REST Service:</strong> Full-text biomedical open-access articles.</li>
                <li><strong className="text-forest-text">arXiv API:</strong> Preprint identification and e-print records.</li>
              </ul>
              <p>
                Only non-confidential bibliographic search strings (titles, author lists, DOIs) are transmitted to these third-party scholarly APIs.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-forest-text">
                3. Review Records & Database Storage
              </h2>
              <p>
                When a researcher submits an audit review or overrides an automated verdict, the decision, notes, and reviewer identifier are recorded in the local CiteVerify SQLite database (<code className="font-mono text-xs px-2 py-0.5 rounded-full bg-sage-subtle text-forest-text border border-sage-border font-bold">data/citeverify.db</code>).
              </p>
              <p>
                These records serve as the audit trail for document verification reports and remain under the administrative control of the workspace operator.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-forest-text">
                4. Local Storage & Client Preferences
              </h2>
              <p>
                CiteVerify uses browser <code className="font-mono text-xs px-2 py-0.5 rounded-full bg-sage-subtle text-forest-text border border-sage-border font-bold">localStorage</code> solely to preserve application state. We do not deploy cross-site tracking cookies or third-party behavioral trackers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-forest-text">
                5. Institutional Placeholders
              </h2>
              <p className="italic text-xs text-forest-text-muted">
                [Data Controller: Alpha Dev CiteVerify Engineering Team]
                <br />
                [Data Retention Period: Locally maintained until cleared by administrator]
                <br />
                [Inquiries: privacy-research@alphadev.example]
              </p>
            </section>
          </div>

          <div className="border-t border-sage-border pt-6 flex items-center justify-between text-xs text-forest-text-muted">
            <span>CiteVerify Platform · Alpha Dev</span>
            <Link to="/terms" className="text-forest-text font-bold hover:underline">
              View Terms of Service →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
