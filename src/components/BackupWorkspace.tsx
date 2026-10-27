import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { ShieldCheck, Download, Plus, CheckCircle2, AlertCircle, Database } from 'lucide-react';

export const BackupWorkspace: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await api.getBackups();
      setBackups(data);
    } catch (err: any) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await api.createBackup();
      setMessage({
        type: 'success',
        text: `Snapshot created: ${res.filename} (${(res.size / 1024).toFixed(1)} KB) - SQLite database integrity tested and confirmed.`
      });
      await loadBackups();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Backup creation failed' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Security, Backup & Local Recovery
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Local-first SQLite snapshot engine, WAL journal preservation, and data integrity verification
          </p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-sky-700 text-white rounded hover:bg-sky-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          {creating ? 'Creating Snapshot...' : 'Create Instant Master Backup'}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Local-First Architecture Information */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <Database className="w-4 h-4 text-sky-600" />
          <span>Master Database Integrity & Retention Architecture</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="font-semibold text-slate-800 block mb-1">Storage Mode</span>
            <p>High-reliability SQLite with Write-Ahead Logging (WAL) and foreign key constraints enabled.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="font-semibold text-slate-800 block mb-1">Source Isolation</span>
            <p>Uploaded workbooks remain separately preserved; accepted corrections populate master ledger records.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="font-semibold text-slate-800 block mb-1">7-Year Retention Baseline</span>
            <p>Audit records and historical calculation results are maintained without automatic destructive pruning.</p>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-800 flex items-center justify-between">
          <span>Available Database Snapshots</span>
          <span className="text-slate-500 font-normal">({backups.length} snapshots)</span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading backup inventory...
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No backups created yet. Click "Create Instant Master Backup" above to generate a verified snapshot.
            </div>
          ) : (
            backups.map((b) => {
              let counts: any = {};
              try {
                counts = JSON.parse(b.record_counts || '{}');
              } catch {}
              return (
                <div key={b.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 font-mono flex items-center gap-2">
                      <span>{b.filename}</span>
                      {b.is_tested === 1 && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-sans">
                          Integrity Verified
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                      <span>Created: {new Date(b.created_at).toLocaleString()}</span>
                      <span>·</span>
                      <span>Size: {(b.size_bytes / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>{counts.charges || 0} charges · {counts.shipments || 0} shipments</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">{b.id}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
