import React, { useState, useEffect } from 'react';
import { ChargeEntry, ProcessingStatus, ChargeClassification } from '../types.ts';
import { api } from '../api.ts';
import { ChargeEditModal } from './ChargeEditModal.tsx';
import {
  Search,
  Filter,
  FileText,
  ChevronDown,
  ChevronRight,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { WorkspaceTab } from './Navbar.tsx';

interface PendingPOWorkspaceProps {
  onNavigate: (tab: WorkspaceTab, cj?: string) => void;
  initialSearch?: string;
}

export const PendingPOWorkspace: React.FC<PendingPOWorkspaceProps> = ({
  onNavigate,
  initialSearch = ''
}) => {
  const [charges, setCharges] = useState<ChargeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingCharge, setEditingCharge] = useState<ChargeEntry | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getPendingPO({
        search: search.trim() || undefined,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        classification: selectedClass === 'ALL' ? undefined : selectedClass,
        limit: 200
      });
      setCharges(res.rows);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error('Failed to load charges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedStatus, selectedClass]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveCharge = async (updates: Partial<ChargeEntry> & { query_reason?: string }) => {
    if (!editingCharge) return;
    await api.updateCharge(editingCharge.id, updates);
    await loadData();
  };

  // Helper for status badge rendering adhering to Zero-Pill discipline (clean typography with subtle indicator)
  const renderStatus = (status: ProcessingStatus) => {
    switch (status) {
      case 'BILLED':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Billed
          </span>
        );
      case 'QUERIED':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Queried
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 text-indigo-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            In Review
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 text-teal-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            Resolved
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-sky-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            Pending
          </span>
        );
    }
  };

  const statusFilters: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Statuses' },
    { id: 'PENDING', label: 'Pending PO' },
    { id: 'BILLED', label: 'Billed' },
    { id: 'QUERIED', label: 'Queried' },
    { id: 'IN_REVIEW', label: 'In Review' },
    { id: 'RESOLVED', label: 'Resolved' }
  ];

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Pending PO & Operational Charge Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative register of charges from Pending PO, Billed PO allocations, and Queried disputes
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{charges.length}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalCount}</span> entries
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by CJ (e.g. CJ-2026-000091), BL, Container, description, or comment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-60">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Classifications</option>
              <option value="STORAGE">Storage Charges</option>
              <option value="CWR">Custom Warehouse Rent (CWR)</option>
              <option value="REEFER_MONITORING">Power & Monitoring (Reefer)</option>
              <option value="LIFT">Lift On / Off</option>
              <option value="TRANSPORT">Transport</option>
              <option value="CLEARING">Clearing</option>
              <option value="OTHER">Other / Unclassified</option>
            </select>
          </div>
        </div>

        {/* Status Segmented Buttons (Interactive filter controls complying with frontend-design) */}
        <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-medium text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {statusFilters.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3 w-12 text-slate-500">S/N</th>
                <th className="py-2.5 px-3 font-bold text-slate-900">FILE No. (CJ)</th>
                <th className="py-2.5 px-3">BL Number</th>
                <th className="py-2.5 px-3">Details / Charge</th>
                <th className="py-2.5 px-3">PO Number</th>
                <th className="py-2.5 px-3 text-right">Amount (USD)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 max-w-xs">Comments & Evidence</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Loading records from SQLite master database...
                  </td>
                </tr>
              ) : charges.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No charge entries matching the selected criteria.
                  </td>
                </tr>
              ) : (
                charges.map((c) => {
                  const isExpanded = expandedRows.has(c.id);
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          c.processing_status === 'QUERIED' ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-400">
                          <button
                            onClick={() => toggleRow(c.id)}
                            className="p-0.5 hover:text-slate-700 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{c.sn}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <button
                            onClick={() => onNavigate('shipment-form', c.normalized_cj)}
                            className="hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {c.normalized_cj}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{c.bl || '—'}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{c.details}</div>
                          <div className="text-[11px] text-slate-400">{c.classification}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {c.po_no && c.po_no !== 'Pending' ? (
                            <span className="font-mono text-emerald-800 font-semibold">{c.po_no}</span>
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ${c.amount.toFixed(2)}
                          {c.raw_formula && (
                            <span
                              title={`Evaluated formula: =${c.raw_formula}`}
                              className="text-[10px] text-sky-600 block font-normal cursor-help"
                            >
                              f(x)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">{renderStatus(c.processing_status)}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-600">
                          {c.query_reason ? (
                            <span className="text-amber-800 font-medium">
                              [Query] {c.query_reason}
                            </span>
                          ) : (
                            c.comment || '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingCharge(c)}
                              className="p-1 text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Update status, PO number, or comments"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onNavigate('shipment-form', c.normalized_cj)}
                              className="p-1 text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Open 24-field shipment ledger"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Detail View */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-t border-b border-slate-200">
                          <td colSpan={10} className="py-3 px-8 text-xs space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <span className="font-semibold text-slate-600 block">
                                  Containers linked to this charge:
                                </span>
                                <div className="mt-1 font-mono text-[11px] text-slate-800 whitespace-pre-line bg-white p-2 border border-slate-200 rounded">
                                  {c.container_info || 'No container listed in row'}
                                </div>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-600 block">
                                  Financial Origin & Formula Trace:
                                </span>
                                <div className="mt-1 text-[11px] text-slate-800 bg-white p-2 border border-slate-200 rounded space-y-1">
                                  <div>
                                    <span className="text-slate-500">Evaluated Amount:</span> ${c.amount.toFixed(4)}
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Source Formula:</span>{' '}
                                    <span className="font-mono">{c.raw_formula ? `=${c.raw_formula}` : 'Flat numeric'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Source Row ID:</span> {c.source_row_id || 'Initial import'}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-600 block">
                                  Operational Status & Audit Notes:
                                </span>
                                <div className="mt-1 text-[11px] text-slate-800 bg-white p-2 border border-slate-200 rounded space-y-1">
                                  <div>
                                    <span className="text-slate-500">Current Status:</span> {c.processing_status}
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Dispute Note:</span> {c.query_reason || 'None'}
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Last Updated:</span> {new Date(c.updated_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCharge && (
        <ChargeEditModal
          charge={editingCharge}
          onClose={() => setEditingCharge(null)}
          onSave={handleSaveCharge}
        />
      )}
    </div>
  );
};
