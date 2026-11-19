import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CiteVerifyLogo,
  FilePdfIcon,
  ProviderIcon,
  VerdictIcon,
  CheckIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  AuditIcon,
} from '../components/common/Icons';
import { VerdictBadge } from '../components/common/VerdictBadge';
import { VerificationStatus } from '../types';

export const LandingPage: React.FC = () => {
  // Interactive sample verification workflow state
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'claim' | 'resolver' | 'evidence' | 'verdict'>('evidence');
  const [demoClaimIndex, setDemoClaimIndex] = useState(0);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const sampleWorkflowItems = [
    {
      claimId: 'CLM-01',
      paperTitle: 'Transformer-Based Scientific Verification Benchmark',
      claimText: 'Self-attention mechanisms achieve quadratic computational complexity with respect to input sequence length.',
      citationRaw: '[1] Vaswani et al., Attention Is All You Need, NeurIPS 2017. arXiv:1706.03762.',
      resolvedWork: {
        title: 'Attention Is All You Need',
        authors: ['A. Vaswani', 'N. Shazeer', 'N. Parmar', 'J. Uszkoreit', 'L. Jones'],
        year: 2017,
        venue: 'Advances in Neural Information Processing Systems (NeurIPS)',
        doi: '10.48550/arXiv.1706.03762',
        database: 'arXiv / OpenAlex',
      },
      evidencePassage: {
        text: 'A self-attention layer connects all positions with a constant number of sequentially executed operations, whereas the computational complexity per layer is O(n² · d), where n is the sequence length.',
        source: 'arXiv e-Print Repository (arXiv:1706.03762v7, Section 3.2)',
        relevance: 0.98,
        type: 'full_text',
      },
      verdict: 'supported' as VerificationStatus,
      confidence: 0.96,
      explanation: 'Ground-truth excerpt from Section 3.2 explicitly substantiates O(n²) complexity with respect to sequence length n.',
      reviewerDecision: 'Confirmed by Lead Investigator',
    },
    {
      claimId: 'CLM-02',
      paperTitle: 'Deep Residual Learning for Image Recognition Benchmark',
      claimText: 'Residual shortcut connections require additional learnable parameters when input and output dimensions match.',
      citationRaw: '[2] He et al., Deep Residual Learning for Image Recognition, CVPR 2016. 10.1109/CVPR.2016.90.',
      resolvedWork: {
        title: 'Deep Residual Learning for Image Recognition',
        authors: ['K. He', 'X. Zhang', 'S. Ren', 'J. Sun'],
        year: 2016,
        venue: 'IEEE Conference on Computer Vision and Pattern Recognition (CVPR)',
        doi: '10.1109/CVPR.2016.90',
        database: 'Crossref / Europe PMC',
      },
      evidencePassage: {
        text: 'The shortcut connections in Eqn.(1) introduce neither extra parameter nor computation complexity. The connections are identity mappings.',
        source: 'CVPR 2016 Proceedings (Section 3.1 Identity Mapping by Shortcuts)',
        relevance: 0.94,
        type: 'full_text',
      },
      verdict: 'contradictory' as VerificationStatus,
      confidence: 0.93,
      explanation: 'Primary literature explicitly refutes the claim: identity shortcut connections introduce neither extra parameter nor complexity.',
      reviewerDecision: 'Overridden from Unsupported to Contradictory by Auditor',
    },
    {
      claimId: 'CLM-03',
      paperTitle: 'Therapeutic Targeting of Oncogenic Pathways',
      claimText: 'Metabolite binding kinetics remain uniform across all mammalian mitochondrial membranes.',
      citationRaw: '[3] Gated Institutional Monograph, Academic Press 2004.',
      resolvedWork: {
        title: 'Mitochondrial Membrane Dynamics',
        authors: ['R. Vance', 'D. Sterling'],
        year: 2004,
        venue: 'Commercial Monograph Series',
        doi: '10.1016/monograph.2004.01',
        database: 'Crossref',
      },
      evidencePassage: {
        text: 'No open access deposition or full passage deposit discovered in Europe PMC, OpenAlex, or arXiv indices.',
        source: 'Paywalled Citation Registry',
        relevance: 0.0,
        type: 'metadata_only',
      },
      verdict: 'insufficient_evidence' as VerificationStatus,
      confidence: 0.28,
      explanation: 'Passage unavailable via open repositories. System enforces scientific abstention protocol.',
      reviewerDecision: 'Pending panel document request',
    },
  ];

  const currentSample = sampleWorkflowItems[demoClaimIndex];

  const faqs = [
    {
      q: 'How does CiteVerify extract claims from scientific PDFs?',
      a: 'CiteVerify uses an optical layout parser to ingest PDF pages, isolating text blocks, sections, and numerical citation anchors ([1], [2-4]). Semantic claim extractors identify testable hypotheses and conclusions connected to these bibliographic callouts.',
    },
    {
      q: 'How does the Scientific Abstention Rule handle paywalled papers?',
      a: 'CiteVerify rejects speculative hallucination. When a cited paper is locked behind commercial paywalls or passage text cannot be verified via open-access APIs, CiteVerify abstains from judgment and marks the claim as INSUFFICIENT_EVIDENCE.',
    },
    {
      q: 'Which academic registries are queried for evidence?',
      a: 'CiteVerify connects across Crossref, OpenAlex, Semantic Scholar, Europe PMC, and arXiv to resolve DOIs, verify publication authority, examine citation graphs, and harvest open-access full-text excerpts.',
    },
    {
      q: 'Can human reviewers override automated verdicts?',
      a: 'Yes. Qualified researchers can inspect harvested passages side-by-side with original PDFs, record override justifications, and save immutable audit logs for peer review transparency.',
    },
    {
      q: 'What export formats are supported?',
      a: 'Verification findings can be exported as structured, publication-ready Markdown audit reports containing executive summaries, claim concordance percentages, verbatim citations, and reviewer notes.',
    },
  ];

  return (
    <div className="min-h-screen bg-sage-bg text-forest-text flex flex-col font-sans selection:bg-sage-mint">
      {/* 1. Public Top Navigation matching reference image */}
      <header className="sticky top-0 z-40 bg-sage-bg/95 backdrop-blur-sm border-b border-sage-border/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center hover:opacity-90">
              <CiteVerifyLogo size="md" />
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-xs text-forest-text-secondary font-semibold">
              <a href="#how-it-works" className="hover:text-forest-text transition-colors">
                How it works
              </a>
              <a href="#features" className="hover:text-forest-text transition-colors">
                Features
              </a>
              <a href="#integrations" className="hover:text-forest-text transition-colors">
                Research sources
              </a>
              <a href="#faq" className="hover:text-forest-text transition-colors">
                FAQ
              </a>
              <Link to="/documents" className="hover:text-forest-text transition-colors">
                Documents
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs font-bold text-forest-text hover:text-forest-accent transition-colors"
            >
              Sign in
            </Link>

            <Link
              to="/upload"
              className="btn-lime-gradient px-5 py-2 rounded-full font-bold text-xs"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section matching reference image visual direction */}
      <section className="pt-16 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-forest-text tracking-tight max-w-3xl mx-auto leading-[1.12]">
            Verify Scientific Claims with a Click
          </h1>

          <p className="text-sm sm:text-base text-forest-text-secondary max-w-xl mx-auto leading-relaxed font-medium">
            Effortlessly audit research propositions, resolve academic references and connect every verdict to traceable peer-reviewed evidence.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/upload"
              className="btn-lime-gradient px-7 py-3 rounded-full font-bold text-sm shadow-glow-lime flex items-center gap-2"
            >
              <FilePdfIcon size={16} />
              <span>Start an analysis</span>
            </Link>

            <a
              href="#how-it-works"
              className="px-6 py-3 rounded-full border border-sage-border bg-white text-forest-text text-sm font-bold hover:bg-sage-subtle transition-colors shadow-subtle"
            >
              Explore how it works
            </a>
          </div>
        </div>
      </section>

      {/* 3. Hero Interactive Showcase Container (Recreating the mint showcase card in the reference) */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="mint-showcase-panel rounded-3xl p-6 sm:p-10 shadow-card space-y-6">
            {/* Top Showcase Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cce3d2] pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-verdict-supported" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest-text">
                  INTERACTIVE VERIFICATION WORKSPACE
                </span>
              </div>

              {/* Sample Claim Switcher */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-forest-text-muted font-medium">Sample:</span>
                {sampleWorkflowItems.map((item, idx) => (
                  <button
                    key={item.claimId}
                    onClick={() => setDemoClaimIndex(idx)}
                    className={`px-3 py-1 rounded-full border text-xs transition-all font-semibold ${
                      demoClaimIndex === idx
                        ? 'border-[#24824d] bg-[#24824d] text-white shadow-subtle'
                        : 'border-sage-border bg-white text-forest-text-secondary hover:text-forest-text'
                    }`}
                  >
                    {item.claimId}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Screen Cards inside Mint Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column Card: Extracted Claim & In-Text Context */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-sage-border p-6 shadow-subtle space-y-5">
                <div className="flex items-center justify-between border-b border-sage-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-forest-text">
                      {currentSample.claimId}
                    </span>
                    <span className="text-forest-text-muted">·</span>
                    <span className="text-xs text-forest-text-secondary font-medium">
                      Manuscript In-Text Extraction
                    </span>
                  </div>
                  <VerdictBadge status={currentSample.verdict} size="sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-forest-text-muted font-bold block">
                    EXTRACTED SCIENTIFIC PROPOSITION
                  </label>
                  <blockquote className="p-4 rounded-xl bg-sage-subtle border border-sage-border text-sm text-forest-text font-semibold leading-relaxed">
                    "{currentSample.claimText}"
                  </blockquote>
                </div>

                <div className="space-y-1.5 text-xs text-forest-text-secondary">
                  <span className="font-mono text-[10px] text-forest-text-muted uppercase tracking-wider font-bold block">
                    IN-TEXT CITATION CALLOUT
                  </span>
                  <div className="p-3 rounded-lg bg-white border border-sage-border font-mono text-[11px] text-forest-text">
                    {currentSample.citationRaw}
                  </div>
                </div>

                {/* Sub-tab navigation */}
                <div className="pt-2 border-t border-sage-border flex flex-wrap gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => setActiveWorkflowTab('claim')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      activeWorkflowTab === 'claim'
                        ? 'bg-[#24824d] text-white font-bold'
                        : 'bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
                    }`}
                  >
                    Proposition
                  </button>
                  <button
                    onClick={() => setActiveWorkflowTab('resolver')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      activeWorkflowTab === 'resolver'
                        ? 'bg-[#24824d] text-white font-bold'
                        : 'bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
                    }`}
                  >
                    Citation Graph
                  </button>
                  <button
                    onClick={() => setActiveWorkflowTab('evidence')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      activeWorkflowTab === 'evidence'
                        ? 'bg-[#24824d] text-white font-bold'
                        : 'bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
                    }`}
                  >
                    Evidence Quote
                  </button>
                  <button
                    onClick={() => setActiveWorkflowTab('verdict')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      activeWorkflowTab === 'verdict'
                        ? 'bg-[#24824d] text-white font-bold'
                        : 'bg-sage-subtle text-forest-text-secondary hover:text-forest-text'
                    }`}
                  >
                    Audit
                  </button>
                </div>
              </div>

              {/* Right Column Stacked Cards */}
              <div className="lg:col-span-5 space-y-4">
                {/* Card 1: Resolved Academic Work */}
                <div className="bg-white rounded-2xl border border-sage-border p-5 shadow-subtle space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-forest-text-muted">
                    <span className="font-bold text-forest-text">Resolved Reference</span>
                    <span className="text-verdict-supported font-semibold">Open Access</span>
                  </div>
                  <h4 className="text-xs font-bold text-forest-text leading-snug">
                    {currentSample.resolvedWork.title}
                  </h4>
                  <p className="text-[11px] text-forest-text-secondary">
                    {currentSample.resolvedWork.authors.join(', ')} ({currentSample.resolvedWork.year})
                  </p>
                  <div className="pt-1 text-[11px] font-mono text-[#24824d] flex items-center gap-1 font-semibold">
                    <ExternalLinkIcon size={12} />
                    DOI: {currentSample.resolvedWork.doi}
                  </div>
                </div>

                {/* Card 2: Harvested Evidence Excerpt */}
                <div className="bg-white rounded-2xl border border-sage-border p-5 shadow-subtle space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-forest-text-muted">Passage Relevance</span>
                    <span className="font-bold text-forest-text">
                      {Math.round(currentSample.evidencePassage.relevance * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-forest-text leading-relaxed bg-sage-subtle p-3.5 rounded-xl border-l-2 border-[#a4db68] font-medium">
                    "{currentSample.evidencePassage.text}"
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-forest-text-muted border-t border-sage-border">
                    <span>Model Concordance: {Math.round(currentSample.confidence * 100)}%</span>
                    <span className="text-forest-text font-bold flex items-center gap-1">
                      <AuditIcon size={13} className="text-verdict-supported" />
                      Audited
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Research Integrations Logos Row (matching reference sponsor row) */}
      <section id="integrations" className="py-10 px-6 border-y border-sage-border bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="text-xs font-mono uppercase tracking-widest text-forest-text-muted font-bold shrink-0">
            FEDERATED INTEGRATIONS
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-8 sm:gap-10 text-xs font-bold text-forest-text-secondary">
            <div className="flex items-center gap-2 hover:text-forest-text transition-colors">
              <ProviderIcon provider="crossref" size={18} className="text-forest-text" />
              <span>Crossref</span>
            </div>
            <div className="flex items-center gap-2 hover:text-forest-text transition-colors">
              <ProviderIcon provider="openalex" size={18} className="text-forest-text" />
              <span>OpenAlex</span>
            </div>
            <div className="flex items-center gap-2 hover:text-forest-text transition-colors">
              <ProviderIcon provider="semantic" size={18} className="text-forest-text" />
              <span>Semantic Scholar</span>
            </div>
            <div className="flex items-center gap-2 hover:text-forest-text transition-colors">
              <ProviderIcon provider="europepmc" size={18} className="text-forest-text" />
              <span>Europe PMC</span>
            </div>
            <div className="flex items-center gap-2 hover:text-forest-text transition-colors">
              <ProviderIcon provider="arxiv" size={18} className="text-forest-text" />
              <span>arXiv</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works Section (matching reference middle section) */}
      <section id="how-it-works" className="py-20 px-6 bg-sage-bg">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full border border-[#c2e4c6] bg-[#e6f5e8] text-forest-text text-xs font-bold font-mono">
              How it works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-forest-text tracking-tight">
              Streamline Evidence Audits Easily
            </h2>
            <p className="text-xs sm:text-sm text-forest-text-secondary max-w-xl mx-auto font-medium">
              A transparent metascience pipeline designed for scientific precision, source traceability, and human auditor oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl border border-sage-border p-6 shadow-subtle space-y-3 flex flex-col justify-between hover:border-sage-mint-dark/30 transition-all">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-full bg-sage-mint text-forest-text font-bold font-mono text-xs flex items-center justify-center border border-sage-border">
                  01
                </span>
                <h3 className="text-sm font-bold text-forest-text">Upload PDF</h3>
                <p className="text-xs text-forest-text-secondary leading-relaxed">
                  Ingest scientific manuscripts locally. The optical layout engine extracts hierarchical text sections.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-forest-text-muted">
                100% Local Ingestion
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl border border-sage-border p-6 shadow-subtle space-y-3 flex flex-col justify-between hover:border-sage-mint-dark/30 transition-all">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-full bg-sage-mint text-forest-text font-bold font-mono text-xs flex items-center justify-center border border-sage-border">
                  02
                </span>
                <h3 className="text-sm font-bold text-forest-text">Mine Claims</h3>
                <p className="text-xs text-forest-text-secondary leading-relaxed">
                  Pinpoint testable propositions linked to in-text citations ([1], [2-4]) and parse bibliography records.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-forest-text-muted">
                Citation Graph Built
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl border border-sage-border p-6 shadow-subtle space-y-3 flex flex-col justify-between hover:border-sage-mint-dark/30 transition-all">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-full bg-sage-mint text-forest-text font-bold font-mono text-xs flex items-center justify-center border border-sage-border">
                  03
                </span>
                <h3 className="text-sm font-bold text-forest-text">Harvest Evidence</h3>
                <p className="text-xs text-forest-text-secondary leading-relaxed">
                  Harvest verbatim ground-truth passages across Crossref, OpenAlex, Europe PMC, and arXiv.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-forest-text-muted">
                Federated Search
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl border border-sage-border p-6 shadow-subtle space-y-3 flex flex-col justify-between hover:border-sage-mint-dark/30 transition-all">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-full bg-sage-mint text-forest-text font-bold font-mono text-xs flex items-center justify-center border border-sage-border">
                  04
                </span>
                <h3 className="text-sm font-bold text-forest-text">Review & Export</h3>
                <p className="text-xs text-forest-text-secondary leading-relaxed">
                  Inspect excerpts side-by-side with original PDFs, record consensus overrides, and export reports.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-[#24824d] font-bold">
                Traceable Provenance
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Features Grid Section ("Discover Tools That Drive Your Research Forward") */}
      <section id="features" className="py-20 px-6 bg-white border-t border-sage-border">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full border border-[#c2e4c6] bg-[#e6f5e8] text-forest-text text-xs font-bold font-mono">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-forest-text tracking-tight">
              Discover Tools That Drive Your Research Forward
            </h2>
            <p className="text-xs sm:text-sm text-forest-text-secondary max-w-xl mx-auto font-medium">
              Every feature of CiteVerify is built around scientific credibility, source traceability, and human oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-sage-bg rounded-2xl border border-sage-border p-6 space-y-3 shadow-subtle">
              <span className="text-xs font-mono font-bold text-[#24824d] uppercase">01 · MINING</span>
              <h3 className="text-base font-bold text-forest-text">Scientific Claim Extraction</h3>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Extracts testable hypotheses and empirical propositions linked to numeric citation markers in research PDFs.
              </p>
            </div>

            <div className="bg-sage-bg rounded-2xl border border-sage-border p-6 space-y-3 shadow-subtle">
              <span className="text-xs font-mono font-bold text-[#24824d] uppercase">02 · RESOLUTION</span>
              <h3 className="text-base font-bold text-forest-text">Academic Reference Resolution</h3>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Parses unstructured bibliographies into normalized DOIs, arXiv IDs, and verified publication records.
              </p>
            </div>

            <div className="bg-sage-bg rounded-2xl border border-sage-border p-6 space-y-3 shadow-subtle">
              <span className="text-xs font-mono font-bold text-[#24824d] uppercase">03 · EVIDENCE</span>
              <h3 className="text-base font-bold text-forest-text">Multi-API Passage Harvesting</h3>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Harvests ground-truth evidence passages from open repositories (Europe PMC, OpenAlex, Semantic Scholar).
              </p>
            </div>

            <div className="bg-sage-bg rounded-2xl border border-sage-border p-6 space-y-3 shadow-subtle">
              <span className="text-xs font-mono font-bold text-[#24824d] uppercase">04 · CLASSIFICATION</span>
              <h3 className="text-base font-bold text-forest-text">6-Category Verdict Taxonomy</h3>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Classifies claims into Supported, Partially Supported, Unsupported, Contradictory, Outdated, or Insufficient Evidence.
              </p>
            </div>

            <div className="bg-sage-bg rounded-2xl border border-sage-border p-6 space-y-3 shadow-subtle">
              <span className="text-xs font-mono font-bold text-[#24824d] uppercase">05 · AUDIT TRAIL</span>
              <h3 className="text-base font-bold text-forest-text">Human Review Oversight</h3>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Full researcher review queue. Allows scientists to override automated scores and attach audit notes.
              </p>
            </div>

            <div className="bg-sage-bg rounded-2xl border border-sage-border p-6 space-y-3 shadow-subtle">
              <span className="text-xs font-mono font-bold text-[#24824d] uppercase">06 · EXPORT</span>
              <h3 className="text-base font-bold text-forest-text">Markdown & Audit Export</h3>
              <p className="text-xs text-forest-text-secondary leading-relaxed">
                Generates transparent audit summaries with complete evidence citations ready for laboratory logs and peer review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section ("Answers to Your Top Questions") */}
      <section id="faq" className="py-20 px-6 bg-sage-bg border-t border-sage-border">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Heading & Prompt */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-forest-text tracking-tight leading-tight">
              Answers to Your Top Questions
            </h2>
            <p className="text-xs sm:text-sm text-forest-text-secondary font-medium leading-relaxed">
              Learn how CiteVerify extracts scientific propositions, interfaces with scholarly APIs, and enforces rigorous abstention principles.
            </p>
            <div className="pt-2">
              <Link
                to="/help"
                className="btn-lime-gradient px-5 py-2.5 rounded-full font-bold text-xs inline-flex items-center gap-1.5"
              >
                <span>Read Metascience Guide</span>
                <ChevronRightIcon size={12} />
              </Link>
            </div>
          </div>

          {/* Right Column: Clean Accordion Rows matching reference image */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-sage-border p-6 shadow-subtle divide-y divide-sage-border">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-bold text-forest-text gap-4 hover:text-[#24824d] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="w-5 h-5 rounded-full bg-sage-subtle flex items-center justify-center shrink-0 text-forest-text text-sm">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <p className="mt-2.5 text-xs text-forest-text-secondary leading-relaxed font-sans pr-6">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Ready to Find / Start CTA Banner matching bottom of reference image */}
      <section className="py-20 px-6 bg-sage-bg">
        <div className="max-w-4xl mx-auto">
          <div className="mint-showcase-panel rounded-3xl p-10 sm:p-14 text-center space-y-6 shadow-card">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-forest-text tracking-tight">
              Ready to Verify Your Next Paper?
            </h2>
            <p className="text-xs sm:text-sm text-forest-text-secondary max-w-md mx-auto font-medium">
              Ingest your scientific research PDF and generate a traceable evidence audit in seconds.
            </p>
            <div className="pt-2">
              <Link
                to="/upload"
                className="btn-lime-gradient px-8 py-3.5 rounded-full font-bold text-sm shadow-glow-lime inline-block"
              >
                Start an analysis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Editorial Footer matching bottom of reference image */}
      <footer className="py-14 px-6 bg-white border-t border-sage-border text-xs text-forest-text-secondary">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-sage-border">
          <div className="space-y-3">
            <CiteVerifyLogo size="md" />
            <p className="text-xs text-forest-text-muted leading-relaxed font-medium">
              CiteVerify examines scientific claims, resolves academic references and connects every verdict to traceable research evidence.
            </p>
            <div className="text-[11px] font-mono text-[#24824d] font-bold">
              Developed by Alpha Dev
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-forest-text font-mono text-[11px] uppercase tracking-wider block">
              WORKSPACE
            </span>
            <ul className="space-y-1.5 font-medium">
              <li><Link to="/dashboard" className="hover:text-forest-text transition-colors">Overview Dashboard</Link></li>
              <li><Link to="/upload" className="hover:text-forest-text transition-colors">New Analysis (Upload)</Link></li>
              <li><Link to="/documents" className="hover:text-forest-text transition-colors">Documents Library</Link></li>
              <li><Link to="/history" className="hover:text-forest-text transition-colors">Audit History</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-forest-text font-mono text-[11px] uppercase tracking-wider block">
              RESEARCH SOURCES
            </span>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li><a href="https://www.crossref.org" target="_blank" rel="noopener noreferrer" className="hover:text-forest-text">Crossref REST API</a></li>
              <li><a href="https://openalex.org" target="_blank" rel="noopener noreferrer" className="hover:text-forest-text">OpenAlex Scholarly Graph</a></li>
              <li><a href="https://www.semanticscholar.org" target="_blank" rel="noopener noreferrer" className="hover:text-forest-text">Semantic Scholar</a></li>
              <li><a href="https://europepmc.org" target="_blank" rel="noopener noreferrer" className="hover:text-forest-text">Europe PMC</a></li>
              <li><a href="https://arxiv.org" target="_blank" rel="noopener noreferrer" className="hover:text-forest-text">arXiv e-Print Archive</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-forest-text font-mono text-[11px] uppercase tracking-wider block">
              TRUST & LEGAL
            </span>
            <ul className="space-y-1.5 font-medium">
              <li><Link to="/terms" className="hover:text-forest-text transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-forest-text transition-colors">Privacy Policy</Link></li>
              <li><Link to="/help" className="hover:text-forest-text transition-colors">Methodology Guide</Link></li>
              <li><span className="text-forest-text-muted">Model confidence: Assistive aid</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-[11px] font-mono text-forest-text-muted">
          <div>
            © 2026 Alpha Dev · CiteVerify Scientific Claim Verification
          </div>
          <div>
            Backend API: <code className="text-forest-text font-bold">http://127.0.0.1:8000</code>
          </div>
        </div>
      </footer>
    </div>
  );
};
