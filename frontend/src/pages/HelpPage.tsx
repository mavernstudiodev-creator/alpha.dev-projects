import React from 'react';
import { VERDICT_CONFIGS } from '../utils/verdictUtils';
import { VerdictBadge } from '../components/common/VerdictBadge';
import { VerificationStatus } from '../types';
import { InfoIcon } from '../components/common/Icons';

export const HelpPage: React.FC = () => {
  const statuses: VerificationStatus[] = [
    'supported',
    'partially_supported',
    'unsupported',
    'contradictory',
    'possibly_outdated',
    'insufficient_evidence',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="border-b border-sage-border pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
          Metascience Verification Methodology & Taxonomy
        </h2>
        <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
          Standardized criteria for algorithmic claim extraction, evidence harvesting, and human-in-the-loop review.
        </p>
      </div>

      {/* 1. Six Verdict Categories Deep Dive */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-4">
        <div>
          <h3 className="text-base font-bold text-forest-text">6-Class Scientific Verdict Taxonomy</h3>
          <p className="text-xs text-forest-text-secondary mt-0.5">
            CiteVerify strictly preserves backend classifications. Every classification is anchored by evidence excerpts.
          </p>
        </div>

        <div className="space-y-3">
          {statuses.map((st) => {
            const config = VERDICT_CONFIGS[st];
            return (
              <div
                key={st}
                className="p-4 rounded-2xl border border-sage-border bg-sage-subtle space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <VerdictBadge status={st} size="md" />
                  <span className="font-mono text-[11px] text-forest-text-muted">
                    Taxonomy Key: <code className="text-forest-text font-bold bg-white px-2 py-0.5 rounded-full border border-sage-border">{st}</code>
                  </span>
                </div>
                <p className="text-xs text-forest-text-secondary leading-relaxed pt-1">
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Scientific Abstention Rule */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-3">
        <div className="flex items-center gap-2.5 text-forest-text font-bold text-sm">
          <div className="w-6 h-6 rounded-md bg-sage-mint flex items-center justify-center text-forest-text shrink-0">
            <InfoIcon size={14} />
          </div>
          <span>The Scientific Abstention Protocol</span>
        </div>
        <p className="text-xs text-forest-text-secondary leading-relaxed">
          Standard language models frequently hallucinate consensus when evaluating academic claims whose source literature is paywalled. CiteVerify rejects this paradigm. Under the <strong className="text-forest-text">Scientific Abstention Rule</strong>, if a cited publication's full-text passages cannot be confirmed through Europe PMC, OpenAlex open access deposits, or arXiv preprints, the engine marks the assertion as <strong className="text-forest-text">INSUFFICIENT_EVIDENCE</strong>.
        </p>
        <p className="text-xs text-forest-text-muted leading-relaxed">
          Abstention guarantees that every SUPPORTED or CONTRADICTORY verdict is verified by real, traceable passage text rather than statistical conjecture.
        </p>
      </div>

      {/* 3. Model Concordance Interpretation */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-3">
        <h3 className="text-base font-bold text-forest-text">Interpreting Model Concordance Scores</h3>
        <p className="text-xs text-forest-text-secondary leading-relaxed">
          Confidence percentages reflect algorithmic semantic concordance between the proposition extracted from the manuscript and the harvested literature excerpt:
        </p>
        <ul className="list-disc pl-5 text-xs text-forest-text-secondary space-y-1.5">
          <li><strong className="text-forest-text">85% – 100%: High Concordance:</strong> Passage text explicitly mirrors the proposition's variables, methodology, and directional outcome.</li>
          <li><strong className="text-forest-text">65% – 84%: Moderate Concordance:</strong> General findings align, but scope boundaries, cell line variations, or qualifying conditions are present.</li>
          <li><strong className="text-forest-text">Below 65%: Low Concordance:</strong> Tangential overlap or conflicting empirical data. Requires human auditor inspection.</li>
        </ul>
      </div>

      {/* 4. Keyboard Shortcuts & Reviewer Workflow */}
      <div className="bg-white rounded-3xl border border-sage-border p-6 sm:p-7 shadow-card space-y-3">
        <h3 className="text-base font-bold text-forest-text">Reviewer Navigation & Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-2xl border border-sage-border bg-sage-subtle flex justify-between items-center">
            <span className="text-forest-text-secondary font-semibold">Next Claim:</span>
            <kbd className="px-2.5 py-1 rounded-full bg-white border border-sage-border text-forest-text font-bold shadow-xs">Alt + ↓</kbd>
          </div>
          <div className="p-3 rounded-2xl border border-sage-border bg-sage-subtle flex justify-between items-center">
            <span className="text-forest-text-secondary font-semibold">Previous Claim:</span>
            <kbd className="px-2.5 py-1 rounded-full bg-white border border-sage-border text-forest-text font-bold shadow-xs">Alt + ↑</kbd>
          </div>
          <div className="p-3 rounded-2xl border border-sage-border bg-sage-subtle flex justify-between items-center">
            <span className="text-forest-text-secondary font-semibold">Confirm Verdict:</span>
            <kbd className="px-2.5 py-1 rounded-full bg-white border border-sage-border text-forest-text font-bold shadow-xs">Alt + C</kbd>
          </div>
          <div className="p-3 rounded-2xl border border-sage-border bg-sage-subtle flex justify-between items-center">
            <span className="text-forest-text-secondary font-semibold">Override Verdict:</span>
            <kbd className="px-2.5 py-1 rounded-full bg-white border border-sage-border text-forest-text font-bold shadow-xs">Alt + O</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
