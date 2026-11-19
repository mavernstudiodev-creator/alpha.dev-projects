import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LegalModal } from '../common/LegalModals';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const location = useLocation();

  const getHeaderContext = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) {
      return { title: 'Overview Dashboard', subtitle: 'Academic claim audit metrics & resolver status' };
    }
    if (path.startsWith('/upload')) {
      return { title: 'New Analysis', subtitle: 'Upload an academic PDF for claim & citation extraction' };
    }
    if (path.startsWith('/assistant')) {
      return { title: 'Research Assistant', subtitle: 'Ask questions grounded in your claims and evidence' };
    }
    if (path.startsWith('/documents') && !path.includes('/review') && !path.includes('/export') && path !== '/documents') {
      return { title: 'Verification Workspace', subtitle: 'Two-panel research PDF viewer & evidence auditor' };
    }
    if (path === '/documents') {
      return { title: 'Documents Library', subtitle: 'All analyzed research manuscripts' };
    }
    if (path.includes('/review')) {
      return { title: 'Human Review Queue', subtitle: 'Audit consensus & verdict overrides' };
    }
    if (path.includes('/export')) {
      return { title: 'Export Verification Report', subtitle: 'Structured Markdown provenance reports' };
    }
    if (path.startsWith('/history')) {
      return { title: 'Audit History', subtitle: 'Chronological activity & reviewer ledger' };
    }
    if (path.startsWith('/sources')) {
      return { title: 'Research Sources', subtitle: 'Crossref, OpenAlex, Semantic Scholar, Europe PMC, arXiv' };
    }
    if (path.startsWith('/reports')) {
      return { title: 'Verification Reports', subtitle: 'Generated metascience audit findings' };
    }
    if (path.startsWith('/settings')) {
      return { title: 'Workspace Settings', subtitle: 'Confidence thresholds & API connection' };
    }
    if (path.startsWith('/help')) {
      return { title: 'Help & Methodology', subtitle: '6-class scientific verdict taxonomy & evidence guidelines' };
    }
    return { title: 'CiteVerify', subtitle: 'Scientific Research Review Workspace' };
  };

  const { title, subtitle } = getHeaderContext();

  return (
    <div className="min-h-screen bg-sage-bg flex flex-col font-sans transition-colors duration-150 text-forest-text">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenLegal={(type) => setLegalModal(type)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-nav ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title={title}
          subtitle={subtitle}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ onOpenLegal: (type: 'terms' | 'privacy') => setLegalModal(type) }} />
        </main>
      </div>

      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'terms'}
      />
    </div>
  );
};
