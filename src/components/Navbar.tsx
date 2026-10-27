import React from 'react';
import {
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  FileText,
  BarChart3,
  DownloadCloud,
  History,
  ShieldCheck,
  Search
} from 'lucide-react';

export type WorkspaceTab =
  | 'overview'
  | 'pending-po'
  | 'shipment-form'
  | 'cj-summary'
  | 'custom-reports'
  | 'excel-sync'
  | 'audit'
  | 'backup';

interface NavbarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  quickSearch: string;
  onQuickSearchChange: (q: string) => void;
  onQuickSearchSubmit: () => void;
  operatorName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  quickSearch,
  onQuickSearchChange,
  onQuickSearchSubmit,
  operatorName = 'Authorized Operator'
}) => {
  const navItems: { id: WorkspaceTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'pending-po', label: 'Pending PO', icon: Layers },
    { id: 'shipment-form', label: 'Shipments (24-Field)', icon: FileText },
    { id: 'cj-summary', label: 'CJ Summaries', icon: FileSpreadsheet },
    { id: 'custom-reports', label: 'Custom Reports', icon: BarChart3 },
    { id: 'excel-sync', label: 'Excel Import / Export', icon: DownloadCloud },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'backup', label: 'System & Backup', icon: ShieldCheck }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 select-none sticky top-0 z-40">
      {/* Top Bar: Brand, Quick Search & Operator Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center font-bold text-white text-sm shadow-sm tracking-wider">
            SC
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
              Storage & CWR Charges
              <span className="text-xs font-normal text-slate-400">· PRD v1.0</span>
            </div>
            <div className="text-xs text-slate-400">
              Financial Integrity & Customs Warehouse Ledger
            </div>
          </div>
        </div>

        {/* Global Quick Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onQuickSearchSubmit();
          }}
          className="relative max-w-xs w-full hidden md:block"
        >
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Jump to CJ or BL (e.g. 000091)..."
            value={quickSearch}
            onChange={(e) => onQuickSearchChange(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-3 py-1.5 pl-9 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
          />
        </form>

        {/* Operator Badge */}
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <div className="flex flex-col text-right">
            <span className="font-medium text-slate-200">{operatorName}</span>
            <span className="text-[11px] text-emerald-400 flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              Local Database Active
            </span>
          </div>
        </div>
      </div>

      {/* Primary Navigation Segmented Control */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
        <nav className="flex space-x-1 py-1" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
