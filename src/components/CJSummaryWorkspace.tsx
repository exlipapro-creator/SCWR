import React, { useState, useEffect } from 'react';
import { CJSummaryItem } from '../types.ts';
import { api } from '../api.ts';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  Box,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { WorkspaceTab } from './Navbar.tsx';

interface CJSummaryWorkspaceProps {
  onNavigate: (tab: WorkspaceTab, cj?: string) => void;
}

export const CJSummaryWorkspace: React.FC<CJSummaryWorkspaceProps> = ({ onNavigate }) => {
  const [summaries, setSummaries] = useState<CJSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCJs, setExpandedCJs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const data = await api.getCJSummaries();
      setSummaries(data);
    } catch (err) {
      console.error('Failed to load CJ summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCJs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = summaries.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.shipment_id?.toLowerCase().includes(q) ||
      s.bl?.toLowerCase().includes(q) ||
      s.raw_cj?.toLowerCase().includes(q) ||
      s.customer?.toLowerCase().includes(q) ||
      s.shipping_line?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Consolidated CJ Summaries
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Grouped shipment summaries consolidating multi-container details, Storage, CWR, and line-item charges
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Total Shipments: <span className="font-semibold text-slate-900">{summaries.length}</span> CJs
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by CJ identifier, BL, shipping line, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3 font-bold text-slate-900">CJ Identifier</th>
                <th className="py-2.5 px-3">BL Number</th>
                <th className="py-2.5 px-3">Shipping Line</th>
                <th className="py-2.5 px-3">Containers</th>
                <th className="py-2.5 px-3 text-right">Storage (USD)</th>
                <th className="py-2.5 px-3 text-right">CWR (USD)</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900">Client Total (USD)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Loading consolidated CJ records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No shipments found matching the query.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isExpanded = expandedCJs.has(item.shipment_id);
                  return (
                    <React.Fragment key={item.shipment_id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400">
                          <button
                            onClick={() => toggleExpand(item.shipment_id)}
                            className="p-0.5 hover:text-slate-700 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <button
                            onClick={() => onNavigate('shipment-form', item.shipment_id)}
                            className="hover:text-sky-700 hover:underline cursor-pointer"
                          >
                            {item.shipment_id}
                          </button>
                          {item.size && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {item.size}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{item.bl || '—'}</td>
                        <td className="py-2.5 px-3">{item.shipping_line || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-slate-800">
                            {item.containers.length} container{item.containers.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          ${Number(item.storage_amount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          ${Number(item.cwr_amount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ${Number(item.client_total || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.is_verified === 1 ? (
                            <span className="text-[11px] font-medium text-emerald-700 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigate('shipment-form', item.shipment_id)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 font-medium inline-flex items-center gap-1 cursor-pointer text-[11px]"
                          >
                            Edit 24-Field <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>

                      {/* Sub-table with containers & individual charges */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-t border-b border-slate-200">
                          <td colSpan={10} className="py-3 px-8 text-xs space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Containers */}
                              <div>
                                <span className="font-semibold text-slate-700 block mb-1">
                                  Attached Containers:
                                </span>
                                {item.containers.length > 0 ? (
                                  <div className="space-y-1 bg-white p-2 border border-slate-200 rounded">
                                    {item.containers.map((c) => (
                                      <div
                                        key={c.id}
                                        className="font-mono text-[11px] text-slate-800 flex justify-between"
                                      >
                                        <span>{c.container_no}</span>
                                        <span className="text-slate-500">{c.size || item.size || '40FT'}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">No container details</span>
                                )}
                              </div>

                              {/* Charges breakdown */}
                              <div>
                                <span className="font-semibold text-slate-700 block mb-1">
                                  Line-Item Charges ({item.charges.length} entries):
                                </span>
                                {item.charges.length > 0 ? (
                                  <div className="space-y-1.5 bg-white p-2 border border-slate-200 rounded max-h-48 overflow-y-auto">
                                    {item.charges.map((chg) => (
                                      <div
                                        key={chg.id}
                                        className="flex items-center justify-between text-[11px] border-b border-slate-100 last:border-0 pb-1"
                                      >
                                        <div>
                                          <span className="font-medium text-slate-900">{chg.details}</span>
                                          <span className="text-slate-500 ml-2">
                                            (PO: {chg.po_no || 'Pending'} · {chg.processing_status})
                                          </span>
                                        </div>
                                        <span className="font-mono font-bold text-slate-900">
                                          ${chg.amount.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">No charges currently mapped</span>
                                )}
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
    </div>
  );
};
