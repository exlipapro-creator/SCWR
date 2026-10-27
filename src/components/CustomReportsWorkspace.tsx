import React, { useState, useEffect } from 'react';
import { ChargeEntry } from '../types.ts';
import { api } from '../api.ts';
import {
  BarChart3,
  Search,
  Filter,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export const CustomReportsWorkspace: React.FC = () => {
  const [cjFilter, setCjFilter] = useState('');
  const [blFilter, setBlFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [shippingLineFilter, setShippingLineFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    totalLineItems: number;
    grandTotal: number;
    groupedByCJ: { cj: string; bl: string; shippingLine: string; items: ChargeEntry[]; totalAmount: number }[];
    allRows: ChargeEntry[];
  }>({
    totalLineItems: 0,
    grandTotal: 0,
    groupedByCJ: [],
    allRows: []
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const runQuery = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomReports({
        cj: cjFilter.trim() || undefined,
        bl: blFilter.trim() || undefined,
        status: statusFilter || undefined,
        classification: classFilter || undefined,
        shipping_line: shippingLineFilter.trim() || undefined
      });
      setReportData(res);
      // Auto expand first 5 groups
      setExpandedGroups(new Set(res.groupedByCJ.slice(0, 5).map((g) => g.cj)));
    } catch (err) {
      console.error('Failed to run custom report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQuery();
  }, [statusFilter, classFilter]);

  const toggleGroup = (cj: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cj)) next.delete(cj);
      else next.add(cj);
      return next;
    });
  };

  const handleExportCSV = () => {
    if (reportData.allRows.length === 0) return;
    const headers = ['S/N', 'CJ Number', 'BL Number', 'Details', 'Classification', 'PO Number', 'Amount USD', 'Status', 'Comment'];
    const csvRows = [headers.join(',')];

    for (const r of reportData.allRows) {
      const row = [
        r.sn,
        `"${r.normalized_cj}"`,
        `"${r.bl || ''}"`,
        `"${r.details}"`,
        `"${r.classification}"`,
        `"${r.po_no || ''}"`,
        r.amount.toFixed(2),
        `"${r.processing_status}"`,
        `"${(r.comment || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `custom_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Custom Reporting Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Independent financial query workspace operating from authoritative SQLite master records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={reportData.allRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Report
          </button>
        </div>
      </div>

      {/* Query Filter Card */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
          <Filter className="w-3.5 h-3.5 text-sky-600" />
          <span>Report Parameters & Multi-Dimensional Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">CJ Identifier</label>
            <input
              type="text"
              placeholder="e.g. 000091"
              value={cjFilter}
              onChange={(e) => setCjFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">BL Number</label>
            <input
              type="text"
              placeholder="e.g. KMTCTA08505575"
              value={blFilter}
              onChange={(e) => setBlFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="BILLED">Billed</option>
              <option value="QUERIED">Queried</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Classification</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800"
            >
              <option value="">All Categories</option>
              <option value="STORAGE">Storage Charges</option>
              <option value="CWR">Custom Warehouse Rent (CWR)</option>
              <option value="REEFER_MONITORING">Power & Monitoring</option>
              <option value="LIFT">Lift On/Off</option>
              <option value="TRANSPORT">Transport</option>
              <option value="CLEARING">Clearing</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Shipping Line</label>
            <input
              type="text"
              placeholder="e.g. RAIS, MAERSK"
              value={shippingLineFilter}
              onChange={(e) => setShippingLineFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => {
              setCjFilter('');
              setBlFilter('');
              setStatusFilter('');
              setClassFilter('');
              setShippingLineFilter('');
            }}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Clear Filters
          </button>
          <button
            onClick={runQuery}
            className="px-3.5 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            Apply Query
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Total Matching Line Items</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {reportData.totalLineItems} charges
          </div>
          <span className="text-[11px] text-slate-400">across {reportData.groupedByCJ.length} shipments</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Aggregated Dollar Amount</span>
          <div className="text-xl font-bold text-sky-700 mt-1">
            ${reportData.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Authoritative calculation engine</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Average Charge per CJ</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            $
            {reportData.groupedByCJ.length > 0
              ? (reportData.grandTotal / reportData.groupedByCJ.length).toFixed(2)
              : '0.00'}
          </div>
          <span className="text-[11px] text-slate-400">Consolidated average</span>
        </div>
      </div>

      {/* Grouped by CJ Report View */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-800 flex items-center justify-between">
          <span>Consolidated CJ Groups</span>
          <span className="text-slate-500 font-normal">
            {reportData.groupedByCJ.length} grouped records
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Running financial query...
            </div>
          ) : reportData.groupedByCJ.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching records for current report parameters.
            </div>
          ) : (
            reportData.groupedByCJ.map((group) => {
              const isExpanded = expandedGroups.has(group.cj);
              return (
                <div key={group.cj} className="text-xs">
                  {/* Group Header */}
                  <div
                    onClick={() => toggleGroup(group.cj)}
                    className="p-3 hover:bg-slate-50/80 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <button className="text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-bold text-slate-900 text-sm">{group.cj}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-600">{group.bl || 'No BL'}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{group.shippingLine}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500">
                        {group.items.length} line item{group.items.length !== 1 ? 's' : ''}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${group.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Sub Line Items Table */}
                  {isExpanded && (
                    <div className="bg-slate-50/70 border-t border-slate-100 p-3 pl-9">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead>
                          <tr className="text-[11px] font-semibold text-slate-500 border-b border-slate-200 pb-1">
                            <th className="pb-1.5">S/N</th>
                            <th className="pb-1.5">Details</th>
                            <th className="pb-1.5">Classification</th>
                            <th className="pb-1.5">PO Number</th>
                            <th className="pb-1.5 text-right">Amount (USD)</th>
                            <th className="pb-1.5">Status</th>
                            <th className="pb-1.5">Comment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((it) => (
                            <tr key={it.id} className="text-[11px]">
                              <td className="py-1 text-slate-400 font-mono">{it.sn}</td>
                              <td className="py-1 font-medium text-slate-800">{it.details}</td>
                              <td className="py-1 text-slate-500">{it.classification}</td>
                              <td className="py-1 font-mono text-slate-600">{it.po_no || 'Pending'}</td>
                              <td className="py-1 text-right font-mono font-bold text-slate-900">
                                ${it.amount.toFixed(2)}
                              </td>
                              <td className="py-1 text-slate-600">{it.processing_status}</td>
                              <td className="py-1 text-slate-500 truncate max-w-xs">
                                {it.query_reason ? `[Dispute] ${it.query_reason}` : it.comment || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
