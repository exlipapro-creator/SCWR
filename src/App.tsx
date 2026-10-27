/**
 * Storage & CWR Charges Management System
 * PRD v1.0 Master Implementation
 */

import React, { useState, useEffect } from 'react';
import { Navbar, WorkspaceTab } from './components/Navbar.tsx';
import { OverviewWorkspace } from './components/OverviewWorkspace.tsx';
import { PendingPOWorkspace } from './components/PendingPOWorkspace.tsx';
import { ShipmentFormWorkspace } from './components/ShipmentFormWorkspace.tsx';
import { CJSummaryWorkspace } from './components/CJSummaryWorkspace.tsx';
import { CustomReportsWorkspace } from './components/CustomReportsWorkspace.tsx';
import { ImportExportWorkspace } from './components/ImportExportWorkspace.tsx';
import { AuditWorkspace } from './components/AuditWorkspace.tsx';
import { BackupWorkspace } from './components/BackupWorkspace.tsx';
import { OverviewData } from './types.ts';
import { api } from './api.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [quickSearch, setQuickSearch] = useState('');
  const [targetCj, setTargetCj] = useState<string>('CJ-2026-000091');
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const data = await api.getOverview();
      setOverviewData(data);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleNavigate = (tab: WorkspaceTab, cj?: string) => {
    if (cj) {
      setTargetCj(cj);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSearchSubmit = () => {
    if (!quickSearch.trim()) return;
    setTargetCj(quickSearch.trim());
    setActiveTab('pending-po');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        quickSearch={quickSearch}
        onQuickSearchChange={setQuickSearch}
        onQuickSearchSubmit={handleQuickSearchSubmit}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewWorkspace
            data={overviewData}
            loading={loadingOverview}
            onRefresh={fetchOverview}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'pending-po' && (
          <PendingPOWorkspace
            onNavigate={handleNavigate}
            initialSearch={quickSearch}
          />
        )}

        {activeTab === 'shipment-form' && (
          <ShipmentFormWorkspace
            initialCj={targetCj}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'cj-summary' && (
          <CJSummaryWorkspace onNavigate={handleNavigate} />
        )}

        {activeTab === 'custom-reports' && (
          <CustomReportsWorkspace />
        )}

        {activeTab === 'excel-sync' && (
          <ImportExportWorkspace />
        )}

        {activeTab === 'audit' && (
          <AuditWorkspace />
        )}

        {activeTab === 'backup' && (
          <BackupWorkspace />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Storage & CWR Management System</span>
            <span>·</span>
            <span>Local Single-Operator Edition</span>
          </div>
          <div className="flex items-center gap-3">
            <span>SQLite Master Ledger</span>
            <span>·</span>
            <span>Excel Compatibility Preserved</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">Reconciled</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
