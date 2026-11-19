# CiteVerify — React Frontend

CiteVerify is a scientific claim and citation verification platform designed for research integrity officers, journal editors, peer reviewers, and metascience auditors.

## Design System & Theme

Adapted from premium biotech and health technology design aesthetics:
- **Palette**: Deep navy typography (`#0f2034`), deep teal framing (`#042f2e`), vibrant cyan accents (`#06b6d4`, `#0891b2`), pale cyan highlight surfaces (`#ecfeff`, `#f0fdfd`), and crisp white space.
- **Six Epistemic Verdict Taxonomies**:
  1. `Supported` — Emerald Green (`#10b981`, `bg-emerald-50`)
  2. `Partially Supported` — Amber Gold (`#f59e0b`, `bg-amber-50`)
  3. `Unsupported` — Soft Rose (`#ef4444`, `bg-rose-50`)
  4. `Contradictory` — Regal Purple (`#8b5cf6`, `bg-purple-50`)
  5. `Possibly Outdated` — Burnt Orange (`#f97316`, `bg-orange-50`)
  6. `Insufficient Evidence (Abstained)` — Slate Gray (`#64748b`, `bg-slate-100`)
- **Scientific Abstention Rule**: When full-text passage evidence is restricted by paywalls or unavailable across open-access registries, the system deliberately refrains from speculative verification.

## Implemented Pages

| Page | Route | Description |
|---|---|---|
| **Landing Page** | `/` | Hero section, 4-step workflow, 6-verdict feature breakdown, scholarly resolver integrations, limitations, and footer. |
| **Sign In** | `/login` | Open-workspace sign-in screen. The current backend does not expose authentication or role-enforcement endpoints. |
| **Registration** | `/register` | Registration information screen. The current backend does not expose account creation. |
| **Main Dashboard** | `/dashboard` | Metrics overview cards, Recharts verdict distribution bar chart, literature resolver share pie chart, recent documents, and live audit stream. |
| **PDF Upload** | `/upload` | Drag-and-drop PDF upload to the FastAPI background verification job, with real processing progress and error states. |
| **Research Assistant** | `/assistant` | NVIDIA-backed grounded chat, document selection, conversation history, and cited evidence sources. |
| **Verification Results** | `/documents/:docId` | Document summary, 6-verdict statistics chips, interactive claims filtering and search, claim cards, and resolved bibliography tab. |
| **Claim Details** | `/documents/:docId/claims/:claimId` | Verbatim proposition, concordance meter, rationale explanation, literature revision alerts, linked citation callouts, and harvested evidence excerpts. |
| **Human Review** | `/documents/:docId/review` | Auditor inspection queue, side-by-side claim vs ground-truth comparison, interactive decision form (Confirm, Override, Flag), and document audit history. |
| **Document History** | `/history` | Searchable and sortable data table of all analyzed research papers with status badges, claims metrics, and direct action shortcuts. |
| **Report Export** | `/documents/:docId/export` | Formatted Markdown preview, raw source toggle, copy-to-clipboard feedback, and direct `.md` file download. |

## Reusable Component Library

- `Sidebar` (`src/components/layout/Sidebar.tsx`)
- `Header` (`src/components/layout/Header.tsx`)
- `AppLayout` (`src/components/layout/AppLayout.tsx`)
- `StatCard` (`src/components/dashboard/StatCard.tsx`)
- `VerdictBadge` (`src/components/common/VerdictBadge.tsx`)
- `ClaimCard` (`src/components/verification/ClaimCard.tsx`)
- `EvidenceCard` (`src/components/verification/EvidenceCard.tsx`)
- `UploadZone` (`src/components/upload/UploadZone.tsx`)
- `SearchBar` (`src/components/common/SearchBar.tsx`)
- `DataTable` (`src/components/common/DataTable.tsx`)
- `Toast` (`src/components/common/Toast.tsx`)
- `Modal` (`src/components/common/Modal.tsx`)

## Available Scripts

Inside `frontend/`:

- `npm run dev` — Starts the Vite development server on port 3000.
- `npm run build` — Type checks with `tsc` and compiles production assets into `dist/`.
- `npm run preview` — Locally previews the production build.
