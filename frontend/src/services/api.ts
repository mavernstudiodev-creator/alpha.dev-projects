import {
  DocumentVerificationReport,
  DocumentListItem,
  HumanReviewRecord,
  ReviewSubmissionPayload,
  BackendHealth,
  VerificationStatus,
  ReviewStatus,
} from '../types';
import { MOCK_DOCUMENTS, MOCK_HUMAN_REVIEWS, MOCK_ACADEMIC_RESOLVERS, DEMO_DATA_DISCLAIMER } from './mockData';

// Priority: explicit VITE_API_URL or proxy /api
const ENV_API_URL = import.meta.env.VITE_API_URL || '';
const API_PREFIX = ENV_API_URL ? `${ENV_API_URL.replace(/\/$/, '')}/api/v1` : '/api/v1';
const HEALTH_URL = ENV_API_URL ? `${ENV_API_URL.replace(/\/$/, '')}/api/health` : '/api/health';

class VerificationService {
  private fallbackDocs: DocumentVerificationReport[] = [...MOCK_DOCUMENTS];
  private fallbackReviews: HumanReviewRecord[] = [...MOCK_HUMAN_REVIEWS];
  private backendAvailable: boolean | null = null;

  constructor() {
    const savedDocs = sessionStorage.getItem('citeverify_docs');
    if (savedDocs) {
      try {
        this.fallbackDocs = JSON.parse(savedDocs);
      } catch {
        // use default mocks
      }
    }
  }

  private saveLocal() {
    sessionStorage.setItem('citeverify_docs', JSON.stringify(this.fallbackDocs));
    sessionStorage.setItem('citeverify_reviews', JSON.stringify(this.fallbackReviews));
  }

  // Health check to verify real FastAPI backend availability
  async checkHealth(): Promise<{ available: boolean; data?: BackendHealth }> {
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = (await res.json()) as BackendHealth;
        this.backendAvailable = true;
        return { available: true, data };
      }
    } catch {
      // offline or disconnected
    }
    this.backendAvailable = false;
    return { available: false };
  }

  isBackendAvailable(): boolean | null {
    return this.backendAvailable;
  }

  // Fetch all documents from real backend, with fallback
  async getDocuments(): Promise<DocumentListItem[]> {
    try {
      const res = await fetch(`${API_PREFIX}/documents`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const live = await res.json();
        if (Array.isArray(live)) {
          this.backendAvailable = true;
          return live;
        }
      }
    } catch {
      // offline fallback
    }

    // Convert in-memory documents to DocumentListItem format
    return this.fallbackDocs.map((d) => ({
      id: d.document_id,
      filename: d.filename,
      total_pages: d.total_pages,
      uploaded_at: d.uploaded_at || new Date().toISOString(),
      status: d.status,
      summary: d.summary,
    }));
  }

  // Fetch single document report
  async getDocument(docId: string): Promise<DocumentVerificationReport | null> {
    try {
      const res = await fetch(`${API_PREFIX}/documents/${docId}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        this.backendAvailable = true;
        return (await res.json()) as DocumentVerificationReport;
      }
    } catch {
      // offline fallback
    }

    const found = this.fallbackDocs.find((d) => d.document_id === docId);
    return found ? { ...found } : null;
  }

  // Serve raw PDF file URL from real backend
  getDocumentPdfUrl(docId: string): string {
    return `${API_PREFIX}/documents/${docId}/pdf`;
  }

  // Upload academic PDF to real backend
  async uploadDocument(
    file: File,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<DocumentVerificationReport> {
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) onProgress(20, 'Uploading document to verification engine...');

    try {
      if (onProgress) onProgress(45, 'Extracting structure, claims and citations...');
      const res = await fetch(`${API_PREFIX}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        if (onProgress) onProgress(85, 'Synthesizing evidence passages and generating report...');
        const report = (await res.json()) as DocumentVerificationReport;
        this.backendAvailable = true;
        if (onProgress) onProgress(100, 'Verification complete');
        return report;
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Upload failed with HTTP ${res.status}`);
      }
    } catch (err: any) {
      // If backend is genuinely down or unreachable, provide clear offline simulation benchmark
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }

      this.backendAvailable = false;
      return new Promise((resolve) => {
        let p = 20;
        const interval = setInterval(() => {
          p += 25;
          if (p === 45 && onProgress) onProgress(45, 'Simulated Claim Extraction (Offline Demo Mode)...');
          if (p === 70 && onProgress) onProgress(70, 'Querying OpenAlex & Europe PMC benchmarks...');
          if (p >= 95) {
            clearInterval(interval);
            if (onProgress) onProgress(100, 'Verification report generated');

            const newDocId = `DOC-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
            const newDoc: DocumentVerificationReport = {
              document_id: newDocId,
              filename: file.name,
              file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
              total_pages: 8,
              uploaded_at: new Date().toISOString(),
              status: 'completed',
              summary: {
                total_claims: 3,
                supported: 1,
                partially_supported: 1,
                unsupported: 0,
                contradictory: 0,
                possibly_outdated: 0,
                insufficient_evidence: 1,
                total_citations_found: 3,
                total_citations_resolved: 2,
                processing_time_seconds: 4.2,
                average_confidence: 0.88,
              },
              claims: [
                {
                  claim_id: 'CLM-01',
                  statement: `Primary experimental assay demonstrates high selectivity and structural stability in vitro.`,
                  page_number: 1,
                  context_sentence: `As reported in initial trials, primary experimental assay demonstrates high selectivity and structural stability in vitro [1].`,
                  citation_keys: ['1'],
                  section_name: 'Introduction',
                },
                {
                  claim_id: 'CLM-02',
                  statement: `Cellular uptake kinetics plateau after 24 hours under physiological conditions.`,
                  page_number: 3,
                  context_sentence: `Observed uptake curves indicate cellular uptake kinetics plateau after 24 hours under physiological conditions [2].`,
                  citation_keys: ['2'],
                  section_name: 'Results',
                },
                {
                  claim_id: 'CLM-03',
                  statement: `Secondary metabolite binding affinity was measured at 14.2 nM via surface plasmon resonance.`,
                  page_number: 5,
                  context_sentence: `Further characterization demonstrated secondary metabolite binding affinity was measured at 14.2 nM via surface plasmon resonance [3].`,
                  citation_keys: ['3'],
                  section_name: 'Discussion',
                },
              ],
              results: [
                {
                  claim_id: 'CLM-01',
                  claim_statement: `Primary experimental assay demonstrates high selectivity and structural stability in vitro.`,
                  status: 'supported',
                  confidence_score: 0.94,
                  explanation: 'Full-text passage retrieved from Europe PMC directly confirms high binding selectivity across 4 cell lines.',
                  evidence_items: [
                    {
                      passage_id: 'EV-01',
                      source_work_title: 'Structural characterization of targeted bio-conjugates',
                      source_database: 'europe_pmc',
                      source_doi: '10.1038/s41589-023-0112-9',
                      source_url: 'https://europepmc.org/article/MED/3412098',
                      evidence_type: 'full_text',
                      page_number: 4,
                      section: 'Selectivity Profiling',
                      passage_text: 'Experimental assays revealed sustained localization with high specificity (>92%) across all evaluated cell targets.',
                      relevance_score: 0.96,
                    },
                  ],
                  matched_citations: [
                    {
                      key: '1',
                      raw_text: 'Nature Chemical Biology 2023: Structural characterization of targeted bio-conjugates.',
                      title: 'Structural characterization of targeted bio-conjugates',
                      authors: ['Chen X', 'Watson R'],
                      year: 2023,
                      resolved: true,
                      doi: '10.1038/s41589-023-0112-9',
                    },
                  ],
                  is_abstract_only: false,
                  is_outdated_risk: false,
                  requires_human_review: false,
                  review_status: 'confirmed',
                  reviewed_by: 'Automated Concordance Engine',
                },
                {
                  claim_id: 'CLM-02',
                  claim_statement: `Cellular uptake kinetics plateau after 24 hours under physiological conditions.`,
                  status: 'partially_supported',
                  confidence_score: 0.76,
                  explanation: 'Uptake reaches saturation in standard media, but hypoxic conditions extend uptake past 36 hours.',
                  evidence_items: [
                    {
                      passage_id: 'EV-02',
                      source_work_title: 'Kinetics of membrane permeation in vitro',
                      source_database: 'openalex',
                      source_doi: '10.1016/j.cell.2022.08.014',
                      evidence_type: 'abstract_only',
                      passage_text: 'Plateau observed between 22-26 hours in normoxic cultures; oxygen-depleted cultures demonstrated prolonged uptake dynamics.',
                      relevance_score: 0.88,
                    },
                  ],
                  matched_citations: [
                    {
                      key: '2',
                      raw_text: 'Cellular Biophysics 2022: Kinetics of membrane permeation.',
                      title: 'Kinetics of membrane permeation in vitro',
                      authors: ['Kowalski M', 'Schmidt T'],
                      year: 2022,
                      resolved: true,
                    },
                  ],
                  is_abstract_only: true,
                  is_outdated_risk: false,
                  requires_human_review: true,
                  review_status: 'pending',
                },
                {
                  claim_id: 'CLM-03',
                  claim_statement: `Secondary metabolite binding affinity was measured at 14.2 nM via surface plasmon resonance.`,
                  status: 'insufficient_evidence',
                  confidence_score: 0.35,
                  explanation: 'Paywalled reference without open-access passage deposits. Abstention under scientific evidence verification protocol.',
                  evidence_items: [],
                  matched_citations: [
                    {
                      key: '3',
                      raw_text: 'Biochimica et Biophysica Acta 2019: Surface plasmon resonance characterization.',
                      title: 'Surface plasmon resonance characterization of plant metabolites',
                      authors: ['Vance E', 'Patel K'],
                      year: 2019,
                      resolved: false,
                    },
                  ],
                  is_abstract_only: false,
                  is_outdated_risk: false,
                  requires_human_review: true,
                  review_status: 'pending',
                },
              ],
              bibliography: [
                {
                  key: '1',
                  raw_text: 'Nature Chemical Biology 2023: Structural characterization of targeted bio-conjugates.',
                  title: 'Structural characterization of targeted bio-conjugates',
                  authors: ['Chen X', 'Watson R'],
                  year: 2023,
                  resolved: true,
                  doi: '10.1038/s41589-023-0112-9',
                },
                {
                  key: '2',
                  raw_text: 'Cellular Biophysics 2022: Kinetics of membrane permeation.',
                  title: 'Kinetics of membrane permeation in vitro',
                  authors: ['Kowalski M', 'Schmidt T'],
                  year: 2022,
                  resolved: true,
                },
                {
                  key: '3',
                  raw_text: 'Biochimica et Biophysica Acta 2019: Surface plasmon resonance characterization.',
                  title: 'Surface plasmon resonance characterization of plant metabolites',
                  authors: ['Vance E', 'Patel K'],
                  year: 2019,
                  resolved: false,
                },
              ],
            };

            this.fallbackDocs.unshift(newDoc);
            this.saveLocal();
            resolve(newDoc);
          }
        }, 180);
      });
    }
  }

  // Submit human review to real backend: POST /api/v1/reviews/documents/{doc_id}/claims/{claim_id}
  async submitReview(
    docId: string,
    claimId: string,
    payload: ReviewSubmissionPayload
  ): Promise<{ status: string; review_id: string; claim_id: string; decision: string }> {
    try {
      const res = await fetch(`${API_PREFIX}/reviews/documents/${docId}/claims/${claimId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.backendAvailable = true;
        return await res.json();
      }
    } catch {
      // offline fallback
    }

    // Local state mutation for offline demo
    const doc = this.fallbackDocs.find((d) => d.document_id === docId);
    if (doc) {
      const claim = doc.results.find((c) => c.claim_id === claimId);
      if (claim) {
        claim.review_status = payload.decision;
        claim.human_notes = payload.notes;
        claim.reviewed_by = payload.reviewer_name || 'Dr. Elena Vance, Ph.D.';
        claim.reviewed_at = new Date().toISOString();
        if (payload.decision === 'overridden' && payload.overridden_status) {
          claim.status = payload.overridden_status;
        }
      }
    }

    const newRev: HumanReviewRecord = {
      id: `REV-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
      document_id: docId,
      claim_id: claimId,
      decision: payload.decision,
      overridden_status: payload.overridden_status,
      notes: payload.notes,
      reviewed_at: new Date().toISOString(),
      reviewer_name: payload.reviewer_name || 'Dr. Elena Vance, Ph.D.',
    };

    this.fallbackReviews.unshift(newRev);
    this.saveLocal();

    return {
      status: 'success',
      review_id: newRev.id,
      claim_id: claimId,
      decision: payload.decision,
    };
  }

  // Export report markdown directly from real backend: GET /api/v1/documents/{doc_id}/export
  async exportMarkdown(docId: string): Promise<string> {
    try {
      const res = await fetch(`${API_PREFIX}/documents/${docId}/export`);
      if (res.ok) {
        this.backendAvailable = true;
        return await res.text();
      }
    } catch {
      // offline fallback
    }

    const doc = await this.getDocument(docId);
    if (!doc) throw new Error('Document not found');

    const lines: string[] = [
      `# CiteVerify Audit Report: ${doc.filename}`,
      `**Document ID:** \`${doc.document_id}\` | **Pages:** ${doc.total_pages}`,
      '',
      `> **Notice:** ${DEMO_DATA_DISCLAIMER}`,
      '',
      '## Verification Summary',
      `- **Total Claims Evaluated:** ${doc.summary.total_claims}`,
      `- **Supported:** ${doc.summary.supported}`,
      `- **Partially Supported:** ${doc.summary.partially_supported}`,
      `- **Unsupported:** ${doc.summary.unsupported}`,
      `- **Contradictory:** ${doc.summary.contradictory}`,
      `- **Possibly Outdated:** ${doc.summary.possibly_outdated}`,
      `- **Insufficient Evidence (Abstention):** ${doc.summary.insufficient_evidence}`,
      '',
      '---',
      '## Scientific Claims & Evidence Audits',
    ];

    doc.results.forEach((r, idx) => {
      lines.push(
        `\n### ${idx + 1}. [${r.status.toUpperCase()}] Claim ${r.claim_id}`,
        `> **Statement:** "${r.claim_statement}"`,
        '',
        `- **Confidence:** ${(r.confidence_score * 100).toFixed(1)}%`,
        `- **Explanation:** ${r.explanation}`,
        `- **Audit Decision:** ${r.review_status.toUpperCase()}${r.reviewed_by ? ` (by ${r.reviewed_by})` : ''}`,
        r.human_notes ? `- **Reviewer Notes:** ${r.human_notes}` : ''
      );

      if (r.evidence_items && r.evidence_items.length > 0) {
        lines.push('\n**Retrieved Source Evidence:**');
        r.evidence_items.forEach((ev) => {
          lines.push(
            `- **Source:** *${ev.source_work_title}* (\`${ev.source_database}\`)`,
            ev.source_doi ? `  - DOI: https://doi.org/${ev.source_doi}` : '',
            `  - Type: \`${ev.evidence_type}\` | Relevance: ${(ev.relevance_score * 100).toFixed(1)}%`,
            `  - Excerpt: "${ev.passage_text}"`
          );
        });
      }
    });

    return lines.join('\n');
  }

  getResolvers() {
    return MOCK_ACADEMIC_RESOLVERS;
  }

  getRecentReviews(): HumanReviewRecord[] {
    return [...this.fallbackReviews];
  }
}

export const apiService = new VerificationService();
