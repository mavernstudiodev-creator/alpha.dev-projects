import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { DocumentListItem } from '../types';
import { FilePdfIcon, UploadIcon, SearchIcon, ChevronRightIcon } from '../components/common/Icons';
import { TableRowSkeleton } from '../components/common/SkeletonLoader';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const docs = await apiService.getDocuments();
        setDocuments(docs);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || d.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">
            Documents Library
          </h2>
          <p className="text-xs sm:text-sm text-forest-text-secondary mt-1">
            All ingested scientific manuscripts and their claim verification profiles.
          </p>
        </div>

        <Link
          to="/upload"
          className="btn-lime-gradient px-5 py-2.5 rounded-full font-bold text-xs text-forest-text shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <UploadIcon size={14} />
          Upload New PDF
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-sage-border shadow-card text-xs">
        <div className="relative flex-1 w-full">
          <SearchIcon size={14} className="absolute left-3.5 top-3 text-forest-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by filename or ID..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-sage-border bg-sage-subtle text-forest-text text-xs focus:outline-none focus:border-forest-text placeholder:text-forest-text-muted"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-sage-border bg-white text-forest-text text-xs focus:outline-none focus:border-forest-text font-mono font-semibold w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="requires_review">Requires Review</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl border border-sage-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            <TableRowSkeleton cols={5} />
            <TableRowSkeleton cols={5} />
            <TableRowSkeleton cols={5} />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-sage-subtle border border-sage-border flex items-center justify-center mx-auto text-forest-text-muted">
              <FilePdfIcon size={32} />
            </div>
            <h4 className="text-sm font-bold text-forest-text">No manuscripts match your query</h4>
            <p className="text-xs text-forest-text-secondary max-w-sm mx-auto">
              Try adjusting your search terms or upload a new research manuscript.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sage-border bg-sage-subtle font-mono text-[11px] text-forest-text-muted uppercase">
                  <th className="py-3.5 px-5">Document ID</th>
                  <th className="py-3.5 px-5">Manuscript Title</th>
                  <th className="py-3.5 px-5">Pages</th>
                  <th className="py-3.5 px-5">Claims Breakdown</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-border">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-sage-subtle/70 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-forest-text">
                      {doc.id}
                    </td>
                    <td className="py-4 px-5 font-bold text-forest-text max-w-sm truncate">
                      {doc.filename}
                    </td>
                    <td className="py-4 px-5 font-mono text-forest-text-muted">
                      {doc.total_pages} pp
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-verdict-supported font-bold">
                          {doc.summary?.supported || 0} sup
                        </span>
                        <span className="text-forest-text-muted">·</span>
                        <span className="text-verdict-unsupported font-bold">
                          {doc.summary?.unsupported || 0} unsup
                        </span>
                        <span className="text-forest-text-muted">·</span>
                        <span className="text-verdict-contradictory font-bold">
                          {doc.summary?.contradictory || 0} contra
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-0.5 rounded-full border border-sage-border bg-sage-subtle text-[10px] font-mono uppercase font-bold text-forest-text-secondary">
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="inline-flex items-center gap-1 font-bold text-forest-text hover:underline"
                      >
                        Workspace
                        <ChevronRightIcon size={12} />
                      </Link>
                      <span className="text-sage-border">|</span>
                      <Link
                        to={`/documents/${doc.id}/export`}
                        className="text-forest-text-secondary font-semibold hover:text-forest-text"
                        title="Export Markdown report"
                      >
                        Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
