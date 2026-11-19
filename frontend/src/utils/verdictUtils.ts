import { VerificationStatus, ReviewStatus, EvidenceType } from '../types';

export interface VerdictConfig {
  key: VerificationStatus;
  label: string;
  badgeLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  chartColor: string;
  iconType: 'check' | 'partially' | 'unsupported' | 'contradictory' | 'outdated' | 'insufficient';
}

export const VERDICT_CONFIGS: Record<VerificationStatus, VerdictConfig> = {
  supported: {
    key: 'supported',
    label: 'SUPPORTED',
    badgeLabel: 'SUPPORTED',
    description: 'Evidence directly substantiates and corroborates the extracted proposition.',
    badgeBg: 'bg-verdict-supported-bg',
    badgeText: 'text-verdict-supported',
    badgeBorder: 'border-verdict-supported-border',
    chartColor: '#156938',
    iconType: 'check',
  },
  partially_supported: {
    key: 'partially_supported',
    label: 'PARTIALLY_SUPPORTED',
    badgeLabel: 'PARTIALLY SUPPORTED',
    description: 'Evidence corroborates the general finding under specific conditions or scope qualifiers.',
    badgeBg: 'bg-verdict-partially-bg',
    badgeText: 'text-verdict-partially',
    badgeBorder: 'border-verdict-partially-border',
    chartColor: '#1a6468',
    iconType: 'partially',
  },
  unsupported: {
    key: 'unsupported',
    label: 'UNSUPPORTED',
    badgeLabel: 'UNSUPPORTED',
    description: 'The cited work exists but does not substantiate or report the stated proposition.',
    badgeBg: 'bg-verdict-unsupported-bg',
    badgeText: 'text-verdict-unsupported',
    badgeBorder: 'border-verdict-unsupported-border',
    chartColor: '#8a5b10',
    iconType: 'unsupported',
  },
  contradictory: {
    key: 'contradictory',
    label: 'CONTRADICTORY',
    badgeLabel: 'CONTRADICTORY',
    description: 'Primary empirical findings in the cited literature directly refute or conflict with this claim.',
    badgeBg: 'bg-verdict-contradictory-bg',
    badgeText: 'text-verdict-contradictory',
    badgeBorder: 'border-verdict-contradictory-border',
    chartColor: '#9c3224',
    iconType: 'contradictory',
  },
  possibly_outdated: {
    key: 'possibly_outdated',
    label: 'POSSIBLY_OUTDATED',
    badgeLabel: 'POSSIBLY OUTDATED',
    description: 'The claim matched its original publication, but subsequent literature revisions raise superseding evidence.',
    badgeBg: 'bg-verdict-outdated-bg',
    badgeText: 'text-verdict-outdated',
    badgeBorder: 'border-verdict-outdated-border',
    chartColor: '#6b3fa0',
    iconType: 'outdated',
  },
  insufficient_evidence: {
    key: 'insufficient_evidence',
    label: 'INSUFFICIENT_EVIDENCE',
    badgeLabel: 'INSUFFICIENT EVIDENCE',
    description: 'Abstention under scientific precision rules: paper paywalled, passage unindexed, or metadata only.',
    badgeBg: 'bg-verdict-insufficient-bg',
    badgeText: 'text-verdict-insufficient',
    badgeBorder: 'border-verdict-insufficient-border',
    chartColor: '#4e6457',
    iconType: 'insufficient',
  },
};

export const REVIEW_STATUS_CONFIGS: Record<
  ReviewStatus,
  { label: string; badgeBg: string; badgeText: string; badgeBorder: string; icon: string }
> = {
  pending: {
    label: 'PENDING REVIEW',
    badgeBg: 'bg-sage-subtle',
    badgeText: 'text-forest-text-secondary',
    badgeBorder: 'border-sage-border',
    icon: 'hourglass',
  },
  confirmed: {
    label: 'AUDIT CONFIRMED',
    badgeBg: 'bg-verdict-supported-bg',
    badgeText: 'text-verdict-supported',
    badgeBorder: 'border-verdict-supported-border',
    icon: 'check',
  },
  overridden: {
    label: 'AUDIT OVERRIDDEN',
    badgeBg: 'bg-verdict-partially-bg',
    badgeText: 'text-verdict-partially',
    badgeBorder: 'border-verdict-partially-border',
    icon: 'edit',
  },
  flagged: {
    label: 'FLAGGED FOR INQUIRY',
    badgeBg: 'bg-verdict-contradictory-bg',
    badgeText: 'text-verdict-contradictory',
    badgeBorder: 'border-verdict-contradictory-border',
    icon: 'flag',
  },
};

export const EVIDENCE_TYPE_CONFIGS: Record<EvidenceType, { label: string; badge: string }> = {
  full_text: {
    label: 'Full-Text Ground Truth',
    badge: 'Peer-Reviewed Full Passage',
  },
  abstract_only: {
    label: 'Abstract Excerpt',
    badge: 'Abstract Evidence',
  },
  metadata_only: {
    label: 'Metadata Only',
    badge: 'Bibliographic Record',
  },
};

export function getConfidenceAssessment(score: number): {
  percentage: number;
  label: string;
  tone: 'high' | 'medium' | 'low';
} {
  const percentage = Math.round(score * 100);
  if (percentage >= 85) {
    return { percentage, label: 'High Concordance', tone: 'high' };
  }
  if (percentage >= 65) {
    return { percentage, label: 'Moderate Concordance', tone: 'medium' };
  }
  return { percentage, label: 'Low Concordance', tone: 'low' };
}
