export type VerificationStatus =
  | 'supported'
  | 'partially_supported'
  | 'unsupported'
  | 'contradictory'
  | 'possibly_outdated'
  | 'insufficient_evidence';

export type EvidenceType = 'full_text' | 'abstract_only' | 'metadata_only';

export type ReviewStatus = 'pending' | 'confirmed' | 'overridden' | 'flagged';

export interface BibEntry {
  key: string;
  raw_text: string;
  title?: string;
  authors: string[];
  year?: number;
  journal?: string;
  doi?: string;
  arxiv_id?: string;
  resolved: boolean;
  source_url?: string;
}

export interface AcademicWork {
  source_database: 'crossref' | 'openalex' | 'semantic_scholar' | 'europe_pmc' | 'arxiv';
  external_id?: string;
  doi?: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  citation_count?: number;
  is_open_access: boolean;
  oa_url?: string;
  pdf_url?: string;
  abstract?: string;
  has_full_text: boolean;
  full_text?: string;
}

export interface EvidencePassage {
  passage_id: string;
  source_work_title: string;
  source_database: string;
  source_doi?: string;
  source_url?: string;
  evidence_type: EvidenceType;
  page_number?: number;
  section?: string;
  passage_text: string;
  relevance_score: number;
  retrieved_at?: string;
}

export interface Claim {
  claim_id: string;
  statement: string;
  page_number: number;
  context_sentence: string;
  citation_keys: string[];
  section_name?: string;
  bounding_box?: number[];
}

export interface VerificationResult {
  claim_id: string;
  claim_statement: string;
  status: VerificationStatus;
  confidence_score: number; // 0 to 1
  explanation: string;
  evidence_items: EvidencePassage[];
  matched_citations: BibEntry[];
  is_abstract_only: boolean;
  is_outdated_risk: boolean;
  newer_work_details?: string;
  requires_human_review: boolean;
  review_status: ReviewStatus;
  human_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface VerificationSummary {
  total_claims: number;
  supported: number;
  partially_supported: number;
  unsupported: number;
  contradictory: number;
  possibly_outdated: number;
  insufficient_evidence: number;
  total_citations_found?: number;
  total_citations_resolved?: number;
  processing_time_seconds?: number;
  average_confidence?: number;
}

export interface DocumentVerificationReport {
  document_id: string;
  filename: string;
  file_size?: string;
  total_pages: number;
  uploaded_at?: string;
  status: 'processing' | 'completed' | 'failed' | 'requires_review' | string;
  summary: VerificationSummary;
  claims?: Claim[];
  results: VerificationResult[];
  bibliography: BibEntry[];
}

export interface DocumentListItem {
  id: string;
  filename: string;
  total_pages: number;
  uploaded_at: string | null;
  status: string;
  summary: VerificationSummary;
}

export interface BackendHealth {
  status: string;
  service: string;
  research_engine_version: string;
  academic_integrations: string[];
  verification_taxonomy: string[];
}

export interface HumanReviewRecord {
  id: string;
  document_id: string;
  claim_id: string;
  decision: ReviewStatus;
  overridden_status?: VerificationStatus;
  notes?: string;
  reviewed_at: string;
  reviewer_name: string;
}

export interface ReviewSubmissionPayload {
  decision: ReviewStatus;
  overridden_status?: VerificationStatus;
  notes?: string;
  reviewer_name?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'lead_investigator' | 'peer_reviewer' | 'researcher' | 'auditor';
  institution: string;
  avatar?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}
