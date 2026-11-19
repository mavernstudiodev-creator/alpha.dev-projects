import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import {
  CiteVerifyLogo,
  OverviewIcon,
  UploadIcon,
  DocumentsIcon,
  HistoryIcon,
  SourcesIcon,
  ReportsIcon,
  SettingsIcon,
  HelpIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../common/Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpenLegal?: (type: 'terms' | 'privacy') => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenLegal,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const sections = [
    {
      group: 'WORKSPACE',
      items: [
        { label: 'Overview', path: '/dashboard', icon: OverviewIcon },
        { label: 'New Analysis', path: '/upload', icon: UploadIcon },
        { label: 'Research Assistant', path: '/assistant', icon: Bot },
        { label: 'Documents', path: '/documents', icon: DocumentsIcon },
        { label: 'History', path: '/history', icon: HistoryIcon },
      ],
    },
    {
      group: 'RESEARCH',
      items: [
        { label: 'Sources', path: '/sources', icon: SourcesIcon },
        { label: 'Reports', path: '/reports', icon: ReportsIcon },
      ],
    },
    {
      group: 'PREFERENCES',
      items: [
        { label: 'Settings', path: '/settings', icon: SettingsIcon },
        { label: 'Help', path: '/help', icon: HelpIcon },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-forest-text/25 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#f5f8f5] border-r border-sage-border flex flex-col transition-all duration-nav ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Top Wordmark & Collapse Button */}
        <div className="h-16 border-b border-sage-border flex items-center justify-between px-5 shrink-0 bg-white/70">
          {!isCollapsed ? (
            <Link to="/" className="flex items-center gap-2">
              <CiteVerifyLogo size="md" />
            </Link>
          ) : (
            <Link to="/" className="mx-auto" title="CiteVerify">
              <div className="w-8 h-8 rounded-full bg-sage-mint text-forest-text flex items-center justify-center font-bold text-xs border border-sage-border">
                CV
              </div>
            </Link>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-forest-text-secondary hover:text-forest-text hover:bg-sage-subtle transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-forest-text-secondary hover:text-forest-text"
            aria-label="Close navigation"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 py-5 px-3 space-y-6 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.group} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-forest-text-muted font-bold">
                  {section.group}
                </div>
              )}
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isCollapsed ? 'justify-center px-2' : ''
                      } ${
                        isActive
                          ? 'bg-white text-forest-text font-bold shadow-subtle border border-sage-border'
                          : 'text-forest-text-secondary hover:text-forest-text hover:bg-white/60'
                      }`
                    }
                  >
                    <IconComponent size={16} className="shrink-0 text-forest-text-secondary" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Legal and System Info */}
        <div className="p-4 border-t border-sage-border bg-white/60 text-[11px] text-forest-text-muted shrink-0">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-forest-text-secondary font-medium">
                <button
                  onClick={() => onOpenLegal && onOpenLegal('terms')}
                  className="hover:text-forest-text underline underline-offset-2"
                >
                  Terms
                </button>
                <span>·</span>
                <button
                  onClick={() => onOpenLegal && onOpenLegal('privacy')}
                  className="hover:text-forest-text underline underline-offset-2"
                >
                  Privacy
                </button>
                <span>·</span>
                <Link to="/workspace-preview" className="hover:text-forest-text">
                  Gallery
                </Link>
              </div>
              <div className="text-[10px] font-mono text-forest-text-muted">
                Alpha Dev · CiteVerify Platform
              </div>
            </div>
          ) : (
            <div className="text-center font-mono text-[10px] text-forest-text-muted">CV</div>
          )}
        </div>
      </aside>
    </>
  );
};
