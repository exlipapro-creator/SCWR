import React, { useState, useEffect } from 'react';
import { AuditEvent } from '../types.ts';
import { api } from '../api.ts';
import { History, Search, RefreshCw, Clock } from 'lucide-react';

export const AuditWorkspace: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAudit = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditTrail();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load audit history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filtered = events.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.entity_id?.toLowerCase().includes(q) ||
      e.action?.toLowerCase().includes(q) ||
      e.field_name?.toLowerCase().includes(q) ||
      e.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Audit Trail & Provenance History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Durable timeline recording all manual corrections, status changes, PO allocations, and workbook imports
          </p>
        </div>
        <button
          onClick={loadAudit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Audit Log
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Entity ID (e.g. CJ-2026-000091, CHG-...), action, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Audit Events Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Field</th>
                <th className="py-2.5 px-3">Old Value</th>
                <th className="py-2.5 px-3">New Value</th>
                <th className="py-2.5 px-3">Reason / Context</th>
                <th className="py-2.5 px-3">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading audit trail events...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {e.action}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">
                      {e.entity_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {e.field_name || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {e.old_value !== null && e.old_value !== undefined ? String(e.old_value) : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-800 font-medium">
                      {e.new_value !== null && e.new_value !== undefined ? String(e.new_value) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {e.reason || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                      {e.actor}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
