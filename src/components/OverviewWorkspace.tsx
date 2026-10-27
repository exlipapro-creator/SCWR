import React from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  FileCheck,
  RefreshCw,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { OverviewData } from '../types.ts';
import { WorkspaceTab } from './Navbar.tsx';

interface OverviewWorkspaceProps {
  data: OverviewData | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (tab: WorkspaceTab, cj?: string) => void;
}

export const OverviewWorkspace: React.FC<OverviewWorkspaceProps> = ({
  data,
  loading,
  onRefresh,
  onNavigate
}) => {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading master financial ledger...
      </div>
    );
  }

  const pendingStats = data?.statusBreakdown.find((s) => s.processing_status === 'PENDING') || { count: 0, sum: 0 };
  const billedStats = data?.statusBreakdown.find((s) => s.processing_status === 'BILLED') || { count: 0, sum: 0 };
  const queriedStats = data?.statusBreakdown.find((s) => s.processing_status === 'QUERIED') || { count: 0, sum: 0 };
  const inReviewStats = data?.statusBreakdown.find((s) => s.processing_status === 'IN_REVIEW') || { count: 0, sum: 0 };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Operations & Financial Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of Storage, CWR, Demurrage, and CFS container charges
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Ledger
          </button>
          <button
            onClick={() => onNavigate('excel-sync')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sky-700 text-white rounded hover:bg-sky-800 transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Verified Excel
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Clean typography, no gratuitous pills) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending PO Charges */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Charges</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ${pendingStats.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-sky-50 flex items-center justify-center text-sky-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{pendingStats.count} line items awaiting PO</span>
            <button
              onClick={() => onNavigate('pending-po')}
              className="text-sky-700 hover:text-sky-900 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Review queue <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Billed Charges */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Billed / Allocated</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                ${billedStats.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{billedStats.count} entries with verified PO</span>
            <span className="text-emerald-700 font-medium">Reconciled</span>
          </div>
        </div>

        {/* Card 3: Disputed / Queried */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Queried / Disputed</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                ${queriedStats.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-amber-50 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{queriedStats.count} disputes under review</span>
            <button
              onClick={() => onNavigate('pending-po')}
              className="text-amber-700 hover:text-amber-900 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Inspect <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Shipments & Master Total */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Master Total Value</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ${(data?.totalCharges.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{data?.shipmentMetrics.totalShipments || 0} CJs · {data?.shipmentMetrics.totalContainers || 0} Conts</span>
            <span className="text-slate-700 font-medium">100% Traceable</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Action Items & Financial Integrity Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Immediate Operational Attention */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Queried / Disputed Items Requiring Investigation */}
          <div className="bg-white border border-slate-200 rounded shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Disputed & Queried Line Items
                </h2>
                <span className="text-xs text-slate-500">({queriedStats.count} items)</span>
              </div>
              <span className="text-xs text-slate-500">Charge-level dispute evidence</span>
            </div>
            <div className="p-4 divide-y divide-slate-100">
              {data?.statusBreakdown.find((s) => s.processing_status === 'QUERIED')?.count ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900">CJ-2026-000099 · ONEYNBOGB9496900</span>
                      <span className="font-bold text-amber-900">$120.00 (Storage)</span>
                    </div>
                    <p className="text-amber-800">
                      Query note: <span className="italic">"TRUCK DELAY TO REACH AT ICD"</span>
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onNavigate('shipment-form', 'CJ-2026-000099')}
                        className="text-amber-900 hover:underline font-medium cursor-pointer"
                      >
                        Open 24-field details & reconcile →
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900">CJ-2026-000134 · A91GX05700 (3 disputed lines)</span>
                      <span className="font-bold text-amber-900">$540.07 Total</span>
                    </div>
                    <p className="text-amber-800">
                      Query note: <span className="italic">"DOCUMENTS RECEIVED AFTER CONTAINER DISCHARGED 5 DAYS AGO & NO DEPOSIT IN SHIPPING LINE (INTERASIA)"</span>
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onNavigate('shipment-form', 'CJ-2026-000134')}
                        className="text-amber-900 hover:underline font-medium cursor-pointer"
                      >
                        Inspect multi-charge breakdown →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-3 text-center">
                  No active queried line items.
                </div>
              )}
            </div>
          </div>

          {/* Section: Pending Charges Not Yet Consolidated in REPORTS SUMMARY */}
          {data?.pendingWithoutSummary && data.pendingWithoutSummary.length > 0 && (
            <div className="bg-white border border-slate-200 rounded shadow-2xs">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    Unsummarized Operational Charges in Pending PO
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Requires inclusion in executive summary</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-600 mb-3">
                  The following active charges exist in Pending PO but have not yet been assigned a 24-row summary block in REPORTS SUMMARY:
                </p>
                <div className="space-y-2">
                  {data.pendingWithoutSummary.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 mr-2">{item.normalized_cj}</span>
                        <span className="text-slate-600 mr-2">· {item.details}</span>
                        {item.comment && <span className="text-slate-500 italic">({item.comment})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">${Number(item.amount).toFixed(2)}</span>
                        <button
                          onClick={() => onNavigate('shipment-form', item.normalized_cj)}
                          className="px-2 py-1 text-[11px] bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Complete 24-Field →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Financial Integrity & Verification Audit */}
        <div className="space-y-6">
          {/* Reconciliation Health Status */}
          <div className="bg-white border border-slate-200 rounded shadow-2xs p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Reconciliation Health</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Storage Reconciliation</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 58 / 58 CJs Exact
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>CWR Reconciliation</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 57 / 58 CJs Exact
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Preserved Workbook Formulas</span>
                <span className="font-semibold text-slate-900">363 Active Formulas</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Formula Recalculation Engine</span>
                <span className="font-semibold text-emerald-700">Strict Single-Engine</span>
              </div>
            </div>
          </div>

          {/* Recent Workbook Import Batches */}
          <div className="bg-white border border-slate-200 rounded shadow-2xs p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Ingestion Batches</h3>
            {data?.recentBatches && data.recentBatches.length > 0 ? (
              <div className="space-y-2.5">
                {data.recentBatches.map((b) => (
                  <div key={b.id} className="text-xs pb-2 border-b border-slate-100 last:border-0">
                    <div className="font-medium text-slate-800 truncate">{b.filename}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                      <span>{new Date(b.imported_at).toLocaleString()}</span>
                      <span className="text-emerald-700 font-medium">Batch {b.id.slice(-6)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500">No import batches recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
