import React from 'react';
import { CloseIcon } from './Icons';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-text/25 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-sage-border max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage-border bg-sage-subtle/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-forest-text">
              {type === 'terms' ? 'CiteVerify Terms of Service' : 'CiteVerify Privacy Policy'}
            </h3>
            <p className="text-xs text-forest-text-secondary mt-0.5">
              Scientific claim verification & literature audit platform guidelines
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-forest-text-muted hover:text-forest-text transition-colors"
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-xs text-forest-text-secondary space-y-4 leading-relaxed font-sans">
          {type === 'terms' ? (
            <>
              <div>
                <h4 className="font-bold text-forest-text mb-1">1. Research Scope and Verification Purpose</h4>
                <p>
                  CiteVerify provides automated linguistic extraction, bibliography parsing, and academic database cross-referencing for research manuscripts. All outputs, concordance scores, and classifications serve as assistive research review tools and do not substitute for formal peer evaluation, institutional ethics review, or empirical replication.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-forest-text mb-1">2. Ground-Truth Data & Abstention Principles</h4>
                <p>
                  Where original publication text is restricted by paywalls or unavailable via open-access repositories (Crossref, OpenAlex, Semantic Scholar, Europe PMC, arXiv), CiteVerify explicitly marks claims as INSUFFICIENT_EVIDENCE. Users acknowledge that abstention indicates absence of open text confirmation, not empirical invalidity.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-forest-text mb-1">3. Human Auditor Responsibility</h4>
                <p>
                  Users who record decisions, overrides, or verification notes in the review workspace affirm that observations reflect careful reading of cited literature and comply with standard academic integrity codes. Audit logs maintain transparent traceability between automated model output and human reviewer decisions.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-forest-text mb-1">4. Legal & Institutional Disclaimers</h4>
                <p>
                  [Operating Entity: Alpha Dev / CiteVerify Project]. Platform services are provided on an "as is" research evaluation basis. Model concordance scores reflect algorithmic text comparison, not scientific certainty.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-bold text-forest-text mb-1">1. Document and File Processing</h4>
                <p>
                  Uploaded research PDFs are processed locally by the CiteVerify backend server to extract text, bibliography entries, and claim passages. Files are stored within local data directories (<code className="font-mono text-forest-text">data/uploads/</code>) and are not shared with unvetted commercial third parties.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-forest-text mb-1">2. Academic Resolver Queries</h4>
                <p>
                  Bibliographic search queries (titles, DOIs, arXiv IDs, author names) are transmitted to public academic APIs including Crossref REST API, OpenAlex API, Semantic Scholar API, Europe PMC API, and arXiv API solely to retrieve public research metadata and open-access evidence passages.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-forest-text mb-1">3. Local State & Review Audits</h4>
                <p>
                  Human review annotations, overrides, and notes are stored in the local SQLite database to provide verifiable audit trails.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-forest-text mb-1">4. Contact & Inquiries</h4>
                <p>
                  For questions regarding research data handling or engine methodology, contact [Project Team Contact: citeverify-dev@alphadev.local].
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-sage-border bg-sage-subtle/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-forest-text text-white text-xs font-semibold hover:bg-forest-text/90 transition-colors shadow-subtle"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
