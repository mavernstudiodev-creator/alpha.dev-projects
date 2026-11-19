import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WindowDots, BrandEmblem, UploadArrowIcon, FileDocIcon } from '../components/common/Icons';
import { LegalModal } from '../components/common/LegalModals';

export const WorkspacePreviewPage: React.FC = () => {
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  return (
    <div className="min-h-screen bg-canvas text-navy-950 p-6 sm:p-10 lg:p-14">
      <div className="max-w-[1400px] mx-auto space-y-12">

        {/* Poster Header directly matching the top of the reference image */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-subtle pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-tealBrand block mb-1">
              CITEVERIFY · WORKSPACE PREVIEW
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              A clear research review workspace
            </h1>
            <p className="text-xs text-navy-400 mt-1">
              Complete editorial direction · sample content only
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-md bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 transition-colors"
            >
              Open Interactive App
            </Link>
          </div>
        </div>

        {/* 10 Artboards Grid laid out identically to the reference image */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* 01 Landing page */}
          <div className="space-y-2">
            <Link
              to="/"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-3 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[10px] font-bold text-navy-400">CiteVerify</span>
              </div>

              {/* Mint panel */}
              <div className="rounded-lg bg-tealBrand-tint/50 border border-tealBrand-tintBorder p-3.5 space-y-2 relative overflow-hidden">
                <span className="text-[7px] font-bold uppercase tracking-widest text-tealBrand-dark block">
                  SCIENTIFIC EVIDENCE, MADE NAVIGABLE
                </span>
                <h4 className="text-xs font-extrabold text-navy-950 leading-tight">
                  Bring clarity to every research claim.
                </h4>
                <p className="text-[9px] text-navy-600 leading-tight">
                  Organize claims, inspect cited evidence, and prepare transparent human review.
                </p>
                <div className="pt-1">
                  <span className="inline-block px-2 py-1 rounded bg-navy-900 text-white text-[8px] font-medium">
                    Explore workspace
                  </span>
                </div>
                <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-tealBrand-circle/60 pointer-events-none" />
              </div>

              {/* Workflow */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-bold text-navy-900 block">A clearer workflow</span>
                <div className="space-y-1 text-[8px]">
                  <div className="p-1.5 rounded bg-canvas/60 border border-border-subtle">
                    <strong>01 Collect</strong> · Documents into one workspace
                  </div>
                  <div className="p-1.5 rounded bg-canvas/60 border border-border-subtle">
                    <strong>02 Inspect</strong> · Evidence behind each claim
                  </div>
                  <div className="p-1.5 rounded bg-canvas/60 border border-border-subtle">
                    <strong>03 Review</strong> · Decisions with audit notes
                  </div>
                </div>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">01 Landing page</span>
          </div>

          {/* 02 Sign in */}
          <div className="space-y-2">
            <Link
              to="/login"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-3 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[10px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div className="pt-4 text-center space-y-1">
                <div className="flex justify-center mb-1">
                  <div className="w-7 h-7 rounded-full bg-tealBrand-tint border border-tealBrand-tintBorder text-tealBrand flex items-center justify-center font-bold text-xs">
                    C
                  </div>
                </div>
                <h4 className="text-xs font-bold text-navy-950">Welcome back</h4>
                <p className="text-[8px] text-navy-400">Sign in to your research workspace</p>
              </div>

              <div className="space-y-2 pt-1 text-[8px]">
                <div>
                  <span className="text-navy-500 block mb-0.5">Email address</span>
                  <div className="p-1.5 rounded border border-border-subtle bg-white text-navy-400">
                    you@university.edu
                  </div>
                </div>
                <div>
                  <span className="text-navy-500 block mb-0.5">Password</span>
                  <div className="p-1.5 rounded border border-border-subtle bg-white text-navy-400">
                    ••••••
                  </div>
                </div>
                <div className="pt-1">
                  <div className="w-full py-1.5 rounded bg-navy-900 text-white text-[9px] text-center font-medium">
                    Sign in
                  </div>
                </div>
                <p className="text-[8px] text-navy-400 text-center pt-2">
                  Prototype only · No account connected
                </p>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">02 Sign in</span>
          </div>

          {/* 03 Registration */}
          <div className="space-y-2">
            <Link
              to="/register"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-3 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[10px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div className="pt-3 text-center space-y-0.5">
                <h4 className="text-xs font-bold text-navy-950">Create workspace</h4>
                <p className="text-[8px] text-navy-400">Set up your research review space</p>
              </div>

              <div className="space-y-2 pt-1 text-[8px]">
                <div>
                  <span className="text-navy-500 block mb-0.5">Full name</span>
                  <div className="p-1.5 rounded border border-border-subtle bg-white text-navy-700">
                    Alex Rivera
                  </div>
                </div>
                <div>
                  <span className="text-navy-500 block mb-0.5">Email address</span>
                  <div className="p-1.5 rounded border border-border-subtle bg-white text-navy-400">
                    you@university.edu
                  </div>
                </div>
                <div>
                  <span className="text-navy-500 block mb-0.5">Password</span>
                  <div className="p-1.5 rounded border border-border-subtle bg-white text-navy-400">
                    At least 8 characters
                  </div>
                </div>
                <div className="pt-1">
                  <div className="w-full py-1.5 rounded bg-navy-900 text-white text-[9px] text-center font-medium">
                    Create account
                  </div>
                </div>
                <p className="text-[8px] text-navy-400 text-center pt-1">
                  Prototype only · No credentials stored
                </p>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">03 Registration</span>
          </div>

          {/* 04 Dashboard */}
          <div className="space-y-2">
            <Link
              to="/dashboard"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-2.5 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[9px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-navy-950 block">Good morning, Alex</span>
                <span className="text-[8px] text-navy-400 block">Your workspace at a glance</span>
              </div>

              {/* 4 Stats */}
              <div className="grid grid-cols-4 gap-1 text-[8px]">
                <div className="p-1 bg-canvas rounded border border-border-subtle">
                  <span className="text-navy-400 block text-[7px]">Documents</span>
                  <strong>24</strong>
                </div>
                <div className="p-1 bg-canvas rounded border border-border-subtle">
                  <span className="text-navy-400 block text-[7px]">Claims</span>
                  <strong>186</strong>
                </div>
                <div className="p-1 bg-canvas rounded border border-border-subtle">
                  <span className="text-navy-400 block text-[7px]">Citations</span>
                  <strong>142</strong>
                </div>
                <div className="p-1 bg-canvas rounded border border-border-subtle">
                  <span className="text-navy-400 block text-[7px]">Reviews</span>
                  <strong>9</strong>
                </div>
              </div>

              {/* 2 Charts */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div className="p-2 border border-border-subtle rounded text-[8px] space-y-1">
                  <span className="font-bold text-navy-800 block text-[7px]">Verification activity</span>
                  <div className="h-10 flex items-center justify-center">
                    <svg viewBox="0 0 100 30" className="w-full h-8 text-tealBrand" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M0,20 Q25,5 50,18 T100,8" />
                    </svg>
                  </div>
                </div>

                <div className="p-2 border border-border-subtle rounded text-[8px] space-y-1">
                  <span className="font-bold text-navy-800 block text-[7px]">Verdict mix</span>
                  <div className="h-10 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-tealBrand border-t-[#d97706] border-r-[#476373]" />
                  </div>
                </div>
              </div>

              {/* Recent documents */}
              <div className="border border-border-subtle rounded p-2 text-[8px] space-y-1">
                <span className="font-bold text-navy-800 block text-[7px]">Recent documents</span>
                <div className="text-navy-600 truncate">CRISPR-Cas9 off-target review</div>
                <div className="text-navy-600 truncate">Immune response cohort studies</div>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">04 Dashboard</span>
          </div>

          {/* 05 PDF upload */}
          <div className="space-y-2">
            <Link
              to="/upload"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-3 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[10px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-navy-950 block">Upload a research PDF</span>
                <span className="text-[8px] text-navy-400 block">Files stay local in this preview</span>
              </div>

              <div className="rounded-lg border border-dashed border-border-subtle p-4 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-tealBrand-tint text-tealBrand flex items-center justify-center mx-auto">
                  <UploadArrowIcon size={14} />
                </div>
                <span className="text-[9px] font-bold text-navy-900 block">Drag your PDF here</span>
                <span className="text-[8px] text-navy-400 block">or browse files</span>
                <span className="inline-block px-3 py-1 rounded bg-navy-900 text-white text-[8px] font-medium">
                  Browse files
                </span>
                <span className="text-[7px] text-navy-400 block pt-1">PDF only · Maximum size 25 MB</span>
              </div>

              <div className="p-2 border border-border-subtle rounded text-[8px] space-y-1">
                <div className="flex justify-between text-navy-700">
                  <span>Sample paper.pdf</span>
                  <span>68%</span>
                </div>
                <div className="w-full bg-canvas h-1 rounded-full overflow-hidden">
                  <div className="bg-tealBrand h-1 rounded-full w-[68%]" />
                </div>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">05 PDF upload</span>
          </div>

          {/* 06 Verification results */}
          <div className="space-y-2">
            <Link
              to="/documents/DOC-A9F82B01"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-2.5 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[9px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-navy-950 block">Verification results</span>
                <span className="text-[8px] text-navy-400 block">CRISPR-Cas9 off-target review · Demo</span>
              </div>

              <div className="p-2 rounded bg-tealBrand-tint/50 border border-tealBrand-tintBorder text-[8px]">
                <strong className="text-navy-950 block">Genome editing specificity across cell types</strong>
                <span className="text-navy-600 block">Illustrative sample content · Not verified</span>
              </div>

              {/* 4 Stats */}
              <div className="grid grid-cols-4 gap-1 text-[8px]">
                <div className="p-1 bg-white border border-border-subtle rounded">
                  <span className="text-navy-400 block text-[6px]">Claims</span>
                  <strong>12</strong>
                </div>
                <div className="p-1 bg-white border border-border-subtle rounded text-badge-supportedText">
                  <span className="text-navy-400 block text-[6px]">Supported</span>
                  <strong>5</strong>
                </div>
                <div className="p-1 bg-white border border-border-subtle rounded text-badge-mixedText">
                  <span className="text-navy-400 block text-[6px]">Mixed</span>
                  <strong>3</strong>
                </div>
                <div className="p-1 bg-white border border-border-subtle rounded">
                  <span className="text-navy-400 block text-[6px]">Review</span>
                  <strong>4</strong>
                </div>
              </div>

              <div className="border border-border-subtle rounded p-2 text-[8px] space-y-1">
                <span className="font-bold text-navy-800 block text-[7px]">Claims and references</span>
                <div className="text-navy-600 truncate">• High-fidelity variants reduce off-target</div>
                <div className="text-navy-600 truncate">• Editing efficiency varies by delivery method</div>
                <div className="text-navy-600 truncate">• Guide RNAs show equivalent specificity</div>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">06 Verification results</span>
          </div>

          {/* 07 Claim details */}
          <div className="space-y-2">
            <Link
              to="/documents/DOC-A9F82B01/claims/CLM-003"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-2.5 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[9px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-navy-950 block">Claim detail</span>
                <span className="text-[8px] text-navy-400 block">Claim 02 · Paragraph 4</span>
              </div>

              <div className="p-2 border border-border-subtle rounded space-y-1">
                <span className="inline-block px-1.5 py-0.5 rounded text-[7px] font-medium bg-badge-mixedBg text-badge-mixedText border border-badge-mixedBorder">
                  Mixed evidence
                </span>
                <h5 className="text-[9px] font-bold text-navy-950 leading-tight">
                  Editing efficiency varies by delivery method and cell type.
                </h5>
                <span className="text-[7px] text-navy-400 block">Context and confidence detail</span>
              </div>

              <div className="p-2 border border-border-subtle rounded text-[8px] space-y-1">
                <span className="font-bold text-navy-800 block text-[7px]">Explanation</span>
                <p className="text-[7px] text-navy-600 leading-tight">
                  Sample summary: outcomes differ across cited studies. Reviewer should check study design and context.
                </p>
              </div>

              <div className="p-2 rounded bg-tealBrand-tint/50 border border-tealBrand-tintBorder text-[8px] space-y-1">
                <span className="font-bold text-tealBrand-dark block text-[7px]">Linked evidence · Example citation</span>
                <p className="text-[7px] text-navy-700 leading-tight">
                  Illustrative excerpt, not a real quotation.
                </p>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">07 Claim details</span>
          </div>

          {/* 08 Human review */}
          <div className="space-y-2">
            <Link
              to="/documents/DOC-A9F82B01/review"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-2.5 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[9px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-navy-950 block">Human review</span>
                <span className="text-[8px] text-navy-400 block">Compare assessment and evidence</span>
              </div>

              <div className="grid grid-cols-12 gap-1.5 pt-1 text-[8px]">
                <div className="col-span-8 p-2 border border-border-subtle rounded space-y-1.5">
                  <span className="text-[7px] font-bold text-tealBrand block">CLAIM 02 OF 5</span>
                  <p className="text-[8px] font-bold text-navy-950 leading-tight">
                    Editing efficiency varies by delivery method and cell type.
                  </p>
                  <div className="p-1 rounded bg-tealBrand-tint/50 border border-tealBrand-tintBorder text-[7px] text-navy-700">
                    Evidence excerpts shown for reviewer inspection.
                  </div>
                  <div className="py-1 px-2 rounded bg-navy-900 text-white text-[7px] text-center font-medium">
                    Record review
                  </div>
                  <span className="text-[6px] text-navy-400 block pt-1">
                    Review history · No decisions in this demo
                  </span>
                </div>

                <div className="col-span-4 p-1.5 border border-border-subtle rounded space-y-1 text-[7px]">
                  <strong className="text-navy-800 block text-[6px]">Assessment</strong>
                  <div>
                    <span className="text-navy-400 block text-[6px]">Proposed:</span>
                    <span className="font-bold text-badge-mixedText">Mixed evidence</span>
                  </div>
                  <div>
                    <span className="text-navy-400 block text-[6px]">References:</span>
                    <span>2 linked sources</span>
                  </div>
                  <div>
                    <span className="text-navy-400 block text-[6px]">Confidence:</span>
                    <span>0.71 demo</span>
                  </div>
                </div>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">08 Human review</span>
          </div>

          {/* 09 Document history */}
          <div className="space-y-2">
            <Link
              to="/history"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-2.5 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[9px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-navy-950 block">Document history</span>
                <span className="text-[8px] text-navy-400 block">Search and filter the workspace</span>
              </div>

              <div className="p-1.5 rounded border border-border-subtle text-[8px] text-navy-400">
                Search title or source
              </div>

              <div className="flex gap-1 text-[7px]">
                <span className="px-1.5 py-0.5 rounded bg-navy-900 text-white font-medium">All 24</span>
                <span className="px-1.5 py-0.5 rounded border border-border-subtle text-navy-600">Completed 18</span>
              </div>

              <div className="border border-border-subtle rounded overflow-hidden text-[8px]">
                <div className="p-1 bg-canvas text-[7px] font-bold text-navy-400">DOCUMENT</div>
                <div className="p-1.5 border-t border-border-subtle text-navy-800 truncate">CRISPR-Cas9 off-target review</div>
                <div className="p-1.5 border-t border-border-subtle text-navy-800 truncate">Immune response cohort studies</div>
                <div className="p-1.5 border-t border-border-subtle text-navy-800 truncate">Protein interaction dataset</div>
                <div className="p-1.5 border-t border-border-subtle text-navy-800 truncate">Microbiome analysis methods</div>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">09 Document history</span>
          </div>

          {/* 10 Report export */}
          <div className="space-y-2">
            <Link
              to="/documents/DOC-A9F82B01/export"
              className="block bg-white rounded-xl border border-border-subtle p-4 shadow-subtle hover:border-navy-400 transition-colors space-y-2.5 min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <WindowDots />
                <span className="text-[9px] font-bold text-navy-400">CiteVerify</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-navy-950 block">Export report</span>
                <span className="text-[8px] text-navy-400 block">Prepare a shareable review summary</span>
              </div>

              <div className="grid grid-cols-12 gap-1.5 pt-1 text-[8px]">
                <div className="col-span-6 p-2 border border-border-subtle rounded space-y-1.5">
                  <strong className="text-navy-800 block text-[7px]">Report options</strong>
                  <div className="p-1 border border-border-subtle rounded text-[7px] text-navy-700">
                    CRISPR Review
                  </div>
                  <div className="space-y-0.5 text-[6px] text-navy-600">
                    <div>✓ Summary</div>
                    <div>✓ Claims and verdicts</div>
                    <div>✓ Citation references</div>
                  </div>
                  <div className="py-1 rounded bg-navy-900 text-white text-[7px] text-center font-medium">
                    Prepare download
                  </div>
                </div>

                <div className="col-span-6 p-2 border border-border-subtle rounded font-mono text-[6px] space-y-1 text-navy-700">
                  <strong className="text-navy-900 block font-sans">Markdown preview</strong>
                  <div className="text-navy-900 font-bold"># CiteVerify review</div>
                  <div className="text-navy-400">DEMO REPORT · Illustrative</div>
                  <div className="font-bold">## Document</div>
                  <div>Genome editing specificity</div>
                  <div className="font-bold">## Claim categories</div>
                  <div>Supported · Mixed · Review</div>
                  <div className="font-bold">## Sample stats</div>
                  <div className="text-navy-400">Demo content only</div>
                </div>
              </div>
            </Link>
            <span className="text-[11px] font-bold text-navy-900 block">10 Report export</span>
          </div>

        </div>

        {/* Bottom Notice directly from the reference image */}
        <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-xs text-navy-400 gap-3">
          <p>
            All figures, claim labels, citations, and evidence shown are fictional demo content for layout preview.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLegalModal('terms')}
              className="hover:text-navy-700 underline underline-offset-2"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setLegalModal('privacy')}
              className="hover:text-navy-700 underline underline-offset-2"
            >
              Privacy Policy
            </button>
            <span className="font-bold text-navy-900 uppercase tracking-widest text-[10px]">
              CITEVERIFY
            </span>
          </div>
        </div>

      </div>

      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'terms'}
      />
    </div>
  );
};
