import {
  BackendHealth,
  DocumentListItem,
  DocumentVerificationReport,
  HumanReviewRecord,
  ReviewSubmissionPayload,
} from '../types';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') || '';
const API_PREFIX = configuredApiUrl
  ? `${configuredApiUrl.endsWith('/api/v1') ? configuredApiUrl.slice(0, -7) : configuredApiUrl}/api/v1`
  : '/api/v1';
const HEALTH_URL = configuredApiUrl
  ? `${configuredApiUrl.replace(/\/api\/v1$/, '')}/api/health`
  : '/api/health';

export interface DocumentStatus {
  document_id: string;
  filename: string;
  status: string;
  total_pages: number;
  error_message?: string | null;
  job?: { id: string | null; status: string; stage: string; progress_percent: number } | null;
}

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string | null;
}

export interface AssistantConversation {
  id: string;
  title: string;
  document_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  messages?: AssistantMessage[];
  model?: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: unknown[] | null;
  created_at?: string | null;
}

export interface AcademicSearchResult {
  source_database: string;
  external_id?: string;
  doi?: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  is_open_access: boolean;
  oa_url?: string;
  pdf_url?: string;
  has_abstract: boolean;
  abstract_snippet?: string;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('CiteVerify API is unreachable. Check the backend URL and try again.', 0);
  }

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status})`;
    try {
      const payload = await response.json();
      message = payload.detail || payload.message || message;
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

class VerificationService {
  private backendAvailable: boolean | null = null;

  async checkHealth(): Promise<{ available: boolean; data?: BackendHealth }> {
    try {
      const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Health check failed');
      const data = (await response.json()) as BackendHealth;
      this.backendAvailable = true;
      return { available: true, data };
    } catch {
      this.backendAvailable = false;
      return { available: false };
    }
  }

  isBackendAvailable() { return this.backendAvailable; }

  getResolvers() {
    return [
      { id: 'crossref', name: 'Crossref', description: 'DOI metadata and publisher records.', endpoint: 'https://api.crossref.org/works' },
      { id: 'openalex', name: 'OpenAlex', description: 'Open scholarly works, authors, venues, and citation graph.', endpoint: 'https://api.openalex.org' },
      { id: 'semantic_scholar', name: 'Semantic Scholar', description: 'Scholarly metadata and citation discovery.', endpoint: 'https://api.semanticscholar.org' },
      { id: 'europe_pmc', name: 'Europe PMC', description: 'Biomedical literature and open access full text.', endpoint: 'https://www.ebi.ac.uk/europepmc/webservices/rest' },
      { id: 'arxiv', name: 'arXiv', description: 'Preprints in physics, mathematics, computer science, and related fields.', endpoint: 'https://export.arxiv.org/api' },
    ];
  }

  async getDocuments(): Promise<DocumentListItem[]> {
    const documents = await request<DocumentListItem[]>('/documents');
    this.backendAvailable = true;
    return documents;
  }

  async getDocument(docId: string): Promise<DocumentVerificationReport | null> {
    try {
      const report = await request<DocumentVerificationReport>(`/documents/${encodeURIComponent(docId)}`);
      this.backendAvailable = true;
      return { ...report, status: 'completed' };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getDocumentStatus(docId: string): Promise<DocumentStatus> {
    return request(`/documents/${encodeURIComponent(docId)}/status`);
  }

  getDocumentClaims(docId: string) {
    return request<{ document_id: string; total_claims: number; claims: DocumentVerificationReport['claims']; results: DocumentVerificationReport['results'] }>(`/documents/${encodeURIComponent(docId)}/claims`);
  }

  getDocumentCitations(docId: string) {
    return request<{ document_id: string; total_citations: number; bibliography: DocumentVerificationReport['bibliography'] }>(`/documents/${encodeURIComponent(docId)}/citations`);
  }

  getDocumentEvidence(docId: string) {
    return request<{ document_id: string; total_evidence_passages: number; claims_with_evidence: unknown[] }>(`/documents/${encodeURIComponent(docId)}/evidence`);
  }

  getDocumentPdfUrl(docId: string): string {
    return `${API_PREFIX}/documents/${encodeURIComponent(docId)}/pdf`;
  }

  async uploadDocument(file: File, onProgress?: (progress: number, stage: string) => void): Promise<DocumentVerificationReport> {
    const formData = new FormData();
    formData.append('file', file);
    onProgress?.(5, 'Uploading PDF to CiteVerify...');
    const queued = await request<{ document_id: string; job_id: string; status: string }>('/documents/upload-async', {
      method: 'POST', body: formData,
    });
    this.backendAvailable = true;
    onProgress?.(10, 'Document received; starting background verification...');

    const deadline = Date.now() + 15 * 60 * 1000;
    while (Date.now() < deadline) {
      const [job, status] = await Promise.all([
        request<{ status: string; stage: string; progress_percent: number; error_message?: string | null }>(`/jobs/${encodeURIComponent(queued.job_id)}`),
        this.getDocumentStatus(queued.document_id),
      ]);
      const stage = job.stage.replace(/_/g, ' ');
      onProgress?.(Math.max(10, Math.min(95, job.progress_percent)), stage ? `Verification: ${stage}` : 'Verifying document...');
      if (job.status === 'failed' || status.status === 'failed') {
        throw new Error(job.error_message || status.error_message || 'Document verification failed.');
      }
      if (job.status === 'completed' || status.status === 'completed') {
        const report = await this.getDocument(queued.document_id);
        if (!report) throw new Error('Verification completed but the report could not be retrieved.');
        onProgress?.(100, 'Verification complete');
        return report;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
    }
    throw new Error(`Verification is still running. Open document ${queued.document_id} to check its status.`);
  }

  async submitReview(docId: string, claimId: string, payload: ReviewSubmissionPayload) {
    return request<{ status: string; review_id: string; claim_id: string; decision: string }>(
      `/reviews/documents/${encodeURIComponent(docId)}/claims/${encodeURIComponent(claimId)}`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }

  async getRecentReviews(): Promise<HumanReviewRecord[]> {
    const events = await request<AuditEvent[]>('/audit?limit=200');
    return events
      .filter((event) => event.action === 'review_submit' || event.action === 'verdict_override')
      .map((event) => ({
        id: event.id,
        document_id: String(event.details.document_id || ''),
        claim_id: event.entity_id,
        decision: String(event.details.decision || (event.action === 'verdict_override' ? 'overridden' : 'confirmed')) as HumanReviewRecord['decision'],
        overridden_status: event.details.overridden_status as HumanReviewRecord['overridden_status'],
        notes: event.details.notes as string | undefined,
        reviewed_at: event.created_at || '',
        reviewer_name: event.actor,
      }));
  }

  async getDocumentReviews(docId: string): Promise<HumanReviewRecord[]> {
    return request(`/reviews/documents/${encodeURIComponent(docId)}`);
  }

  async getAuditTrail(docId: string): Promise<{ document_id: string; total_events: number; events: AuditEvent[] }> {
    return request(`/audit/documents/${encodeURIComponent(docId)}`);
  }

  async exportMarkdown(docId: string): Promise<string> {
    const response = await fetch(`${API_PREFIX}/documents/${encodeURIComponent(docId)}/export?format=markdown`);
    if (!response.ok) throw new ApiError(`Report export failed (HTTP ${response.status})`, response.status);
    return response.text();
  }

  exportPdfUrl(docId: string): string {
    return `${API_PREFIX}/documents/${encodeURIComponent(docId)}/export?format=pdf`;
  }

  async createConversation(documentId?: string, title?: string): Promise<AssistantConversation> {
    const created = await request<{ conversation_id: string; title: string; document_id?: string | null; created_at?: string; model?: string }>(
      '/assistant/conversations', { method: 'POST', body: JSON.stringify({ document_id: documentId, title }) },
    );
    return { id: created.conversation_id, title: created.title, document_id: created.document_id, created_at: created.created_at, model: created.model, messages: [] };
  }

  listConversations(documentId?: string): Promise<AssistantConversation[]> {
    const query = documentId ? `?document_id=${encodeURIComponent(documentId)}` : '';
    return request(`/assistant/conversations${query}`);
  }

  getConversation(conversationId: string): Promise<AssistantConversation> {
    return request(`/assistant/conversations/${encodeURIComponent(conversationId)}`);
  }

  sendAssistantMessage(conversationId: string, query: string, targetClaimId?: string): Promise<{ message_id: string; role: 'assistant'; content: string; sources: unknown[]; model: string }> {
    return request(`/assistant/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST', body: JSON.stringify({ query, target_claim_id: targetClaimId }),
    });
  }

  explainClaim(documentId: string, claimId: string): Promise<unknown> {
    return request('/assistant/explain-claim', { method: 'POST', body: JSON.stringify({ document_id: documentId, claim_id: claimId }) });
  }

  analyzeEvidence(documentId: string, claimId: string): Promise<unknown> {
    return request('/assistant/analyze-evidence', { method: 'POST', body: JSON.stringify({ document_id: documentId, claim_id: claimId }) });
  }

  searchResearch(query: string, limit = 5): Promise<{ query: string; total_found: number; results: AcademicSearchResult[] }> {
    return request('/assistant/search-research', { method: 'POST', body: JSON.stringify({ query, limit }) });
  }
}

export const apiService = new VerificationService();
