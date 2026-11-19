import React from 'react';
import { EvidencePassage } from '../../types';
import { ProviderIcon } from '../common/Icons';

interface EvidenceCardProps {
  evidence: EvidencePassage;
  className?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, className = '' }) => {
  return (
    <div
      className={`rounded-2xl border border-sage-border bg-sage-subtle p-5 space-y-3 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between text-xs text-forest-text-secondary pb-2 border-b border-sage-border">
        <div className="flex items-center gap-2 font-bold text-forest-text">
          <div className="w-5 h-5 rounded-md bg-sage-mint flex items-center justify-center text-forest-text">
            <ProviderIcon provider={evidence.source_database} size={12} />
          </div>
          <span>Linked evidence · {evidence.source_database.replace('_', ' ')}</span>
        </div>
        <span className="font-mono text-forest-text font-bold text-[11px] bg-white px-2 py-0.5 rounded-full border border-sage-border">
          {(evidence.relevance_score * 100).toFixed(0)}% relevance
        </span>
      </div>

      <div>
        <h5 className="text-xs font-bold text-forest-text">{evidence.source_work_title}</h5>
        {evidence.section && (
          <p className="text-[11px] text-forest-text-muted font-mono mt-0.5">{evidence.section}</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-3.5 border border-sage-border text-xs text-forest-text leading-relaxed font-sans shadow-xs">
        "{evidence.passage_text}"
      </div>

      {evidence.source_doi && (
        <div className="pt-1 text-[11px] text-forest-text-muted font-mono">
          DOI: https://doi.org/{evidence.source_doi}
        </div>
      )}
    </div>
  );
};
