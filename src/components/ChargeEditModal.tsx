import React, { useState } from 'react';
import { ChargeEntry, ProcessingStatus, ChargeClassification } from '../types.ts';
import { X, Check, AlertCircle } from 'lucide-react';

interface ChargeEditModalProps {
  charge: ChargeEntry;
  onClose: () => void;
  onSave: (updates: Partial<ChargeEntry> & { query_reason?: string }) => Promise<void>;
}

export const ChargeEditModal: React.FC<ChargeEditModalProps> = ({
  charge,
  onClose,
  onSave
}) => {
  const [status, setStatus] = useState<ProcessingStatus>(charge.processing_status);
  const [poNo, setPoNo] = useState(charge.po_no || '');
  const [classification, setClassification] = useState<ChargeClassification>(charge.classification);
  const [comment, setComment] = useState(charge.comment || '');
  const [queryReason, setQueryReason] = useState(charge.query_reason || '');
  const [isVerified, setIsVerified] = useState(charge.is_verified === 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        processing_status: status,
        po_no: poNo.trim() || undefined,
        classification,
        comment: comment.trim(),
        query_reason: status === 'QUERIED' ? queryReason.trim() : undefined,
        is_verified: isVerified ? 1 : 0
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update charge');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in-50 duration-150">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              Update Charge Line Item · #{charge.sn}
            </h3>
            <div className="text-xs text-slate-300 mt-0.5">
              {charge.normalized_cj} · {charge.details}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount and Formula Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <div>
              <span className="text-slate-500 block">Total Amount:</span>
              <span className="text-base font-bold text-slate-900">
                ${charge.amount.toFixed(2)}
              </span>
            </div>
            {charge.raw_formula && (
              <div className="text-right">
                <span className="text-slate-500 block">Original Formula:</span>
                <span className="font-mono text-slate-700 bg-white px-2 py-0.5 border border-slate-200 rounded">
                  ={charge.raw_formula}
                </span>
              </div>
            )}
          </div>

          {/* Processing Status Selection */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Processing Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProcessingStatus)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="PENDING">Pending (Not yet billed or allocated)</option>
              <option value="BILLED">Billed (Matched with verified Purchase Order)</option>
              <option value="QUERIED">Queried (Disputed line item under investigation)</option>
              <option value="IN_REVIEW">In Review (Ambiguous particulars or mismatch)</option>
              <option value="RESOLVED">Resolved (Query settled and approved)</option>
            </select>
          </div>

          {/* PO Number */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Purchase Order (PO No.)
            </label>
            <input
              type="text"
              placeholder="e.g. 67214 or Pending"
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Classification Override */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Charge Classification
            </label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as ChargeClassification)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="STORAGE">Storage Charges (Port Demurrage)</option>
              <option value="CWR">Custom Warehouse Rent (CWR)</option>
              <option value="REEFER_MONITORING">Power & Monitoring (Reefer)</option>
              <option value="LIFT">Lift On / Lift Off</option>
              <option value="TRANSPORT">Transport / Haulage</option>
              <option value="CLEARING">Clearing & Agency</option>
              <option value="OTHER">Other / Unclassified</option>
            </select>
          </div>

          {/* Conditional Query Reason */}
          {status === 'QUERIED' && (
            <div>
              <label className="block font-medium text-amber-800 mb-1">
                Query / Dispute Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="State the reason for dispute (e.g. truck delay, missing shipping line deposit)..."
                value={queryReason}
                onChange={(e) => setQueryReason(e.target.value)}
                className="w-full bg-amber-50/50 border border-amber-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          )}

          {/* General Operational Comment */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Operational Comment / Delay Notes
            </label>
            <textarea
              rows={2}
              placeholder="Notes on client documents, allocation, port receipts..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Verified Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_verified"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="is_verified" className="text-slate-700 font-medium cursor-pointer">
              Mark this charge line item as explicitly verified by authorized operator
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3.5 py-1.5 bg-sky-700 text-white rounded hover:bg-sky-800 font-medium inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save & Reconcile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
