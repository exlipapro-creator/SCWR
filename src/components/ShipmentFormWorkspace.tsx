import React, { useState, useEffect } from 'react';
import { ShipmentDetails24, ContainerItem, ChargeEntry } from '../types.ts';
import { api } from '../api.ts';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Calendar,
  DollarSign,
  Truck,
  Anchor,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';
import { WorkspaceTab } from './Navbar.tsx';

interface ShipmentFormWorkspaceProps {
  initialCj?: string;
  onNavigate: (tab: WorkspaceTab, cj?: string) => void;
}

export const ShipmentFormWorkspace: React.FC<ShipmentFormWorkspaceProps> = ({
  initialCj = 'CJ-2026-000091',
  onNavigate
}) => {
  const [cjQuery, setCjQuery] = useState(initialCj);
  const [currentCj, setCurrentCj] = useState(initialCj);
  const [shipmentsList, setShipmentsList] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<ShipmentDetails24>>({});
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [charges, setCharges] = useState<ChargeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search shipments dropdown
  useEffect(() => {
    api.searchShipments('').then((list) => {
      setShipmentsList(list);
    });
  }, []);

  // Load active shipment details
  const loadShipment = async (targetCj: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await api.getShipmentDetails(targetCj);
      setFormData(data.details || {});
      setContainers(data.containers || []);
      setCharges(data.charges || []);
      setCurrentCj(targetCj);
      setCjQuery(targetCj);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load shipment' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCj) {
      loadShipment(initialCj);
    }
  }, [initialCj]);

  // Handle input change
  const handleChange = (field: keyof ShipmentDetails24, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Reactive real-time recalculations of date formulas
      const allocReq = next.allocation_request_date ? new Date(next.allocation_request_date) : null;
      const allocDate = next.allocation_date ? new Date(next.allocation_date) : null;
      if (allocReq && allocDate && !isNaN(allocReq.getTime()) && !isNaN(allocDate.getTime())) {
        next.delays_in_allocation = Math.round((allocDate.getTime() - allocReq.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        next.delays_in_allocation = null;
      }

      const doDate = next.do_date ? new Date(next.do_date) : null;
      const discharge = next.discharge_date ? new Date(next.discharge_date) : null;
      if (doDate && discharge && !isNaN(doDate.getTime()) && !isNaN(discharge.getTime())) {
        next.clearance = Math.round((doDate.getTime() - discharge.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        next.clearance = null;
      }

      const docsRec = next.docs_received_date ? new Date(next.docs_received_date) : null;
      if (docsRec && discharge && !isNaN(docsRec.getTime()) && !isNaN(discharge.getTime())) {
        next.client_delay = Math.round((docsRec.getTime() - discharge.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        next.client_delay = null;
      }

      const storage = Number(next.storage_amount || 0);
      const cwr = Number(next.cwr_amount || 0);
      const transport = Number(next.transport_total || 0);
      const clearing = Number(next.clearing_total || 0);
      next.client_total = Math.round((storage + cwr + transport + clearing) * 100) / 100;

      return next;
    });
  };

  const handleSave = async (isDraft: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api.saveShipmentDetails(currentCj, {
        ...formData,
        is_draft: isDraft ? 1 : 0,
        is_verified: isDraft ? 0 : 1,
        change_reason: isDraft ? 'Draft saved' : 'Verified by authorized operator'
      });
      setFormData(saved);
      setMessage({
        type: 'success',
        text: isDraft ? 'Draft saved successfully.' : 'Shipment particulars verified and saved to master ledger.'
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save shipment' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Shipment Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            24-Field Master Shipment Ledger
            {formData.is_verified === 1 ? (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Verified
              </span>
            ) : formData.is_draft === 1 ? (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Draft
              </span>
            ) : null}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete 24-field form with field provenance, date formulas, and auto-aggregated financial charges
          </p>
        </div>

        {/* Quick CJ Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={currentCj}
            onChange={(e) => loadShipment(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            {shipmentsList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} {s.bl ? `· ${s.bl}` : ''}
              </option>
            ))}
          </select>
        </div>
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

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading shipment ledger particulars...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Shipment Identifiers */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                <Anchor className="w-3.5 h-3.5 text-sky-600" />
                <span>1. Shipment Identifiers & Shipping Line</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [1] FILE (CJ Identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.file_no || ''}
                    onChange={(e) => handleChange('file_no', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [2] BL (Bill of Lading)
                  </label>
                  <input
                    type="text"
                    value={formData.bl || ''}
                    onChange={(e) => handleChange('bl', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [3] Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 40FT, 20FT"
                    value={formData.size || ''}
                    onChange={(e) => handleChange('size', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [4] ShippingLine
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RAIS, MAERSK, CMA CGM"
                    value={formData.shipping_line || ''}
                    onChange={(e) => handleChange('shipping_line', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Important Operational Dates & Milestones */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Operational Milestone Dates</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [5] DOCS RECEIVED DATE
                  </label>
                  <input
                    type="date"
                    value={formData.docs_received_date || ''}
                    onChange={(e) => handleChange('docs_received_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [6] DischargeDate
                  </label>
                  <input
                    type="date"
                    value={formData.discharge_date || ''}
                    onChange={(e) => handleChange('discharge_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [7] CarryIn Date
                  </label>
                  <input
                    type="date"
                    value={formData.carry_in_date || ''}
                    onChange={(e) => handleChange('carry_in_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [8] DODate (Delivery Order)
                  </label>
                  <input
                    type="date"
                    value={formData.do_date || ''}
                    onChange={(e) => handleChange('do_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [9] AssessmentNotice
                  </label>
                  <input
                    type="date"
                    value={formData.assessment_notice || ''}
                    onChange={(e) => handleChange('assessment_notice', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [10] ReleaseOrderPrintDate
                  </label>
                  <input
                    type="date"
                    value={formData.release_order_print_date || ''}
                    onChange={(e) => handleChange('release_order_print_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [11] PortCharges (Confirmed Date)
                  </label>
                  <input
                    type="date"
                    value={formData.port_charges || ''}
                    onChange={(e) => handleChange('port_charges', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Allocation, Transport & Loading */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Allocation, Transport & Loading</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [12] Allocation request date
                  </label>
                  <input
                    type="date"
                    value={formData.allocation_request_date || ''}
                    onChange={(e) => handleChange('allocation_request_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [13] allocation date
                  </label>
                  <input
                    type="date"
                    value={formData.allocation_date || ''}
                    onChange={(e) => handleChange('allocation_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [15] Truck Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. T361DXB/T187DQA"
                    value={formData.truck_number || ''}
                    onChange={(e) => handleChange('truck_number', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    [16] LOADED (Date or Status)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-07-22 or LOADED"
                    value={formData.loaded || ''}
                    onChange={(e) => handleChange('loaded', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Operational Delays & Clearance Formulas */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>4. Calculated Duration Metrics (Formulas)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 block mb-1 font-medium">
                    [14] DELAYS IN ALLOCATION
                  </span>
                  <div className="text-base font-bold text-slate-900">
                    {formData.delays_in_allocation !== null && formData.delays_in_allocation !== undefined
                      ? `${formData.delays_in_allocation} days`
                      : '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formula: M - L (Alloc - Request)
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 block mb-1 font-medium">
                    [17] CLEARANCE
                  </span>
                  <div className="text-base font-bold text-slate-900">
                    {formData.clearance !== null && formData.clearance !== undefined
                      ? `${formData.clearance} days`
                      : '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formula: H - F (DODate - Discharge)
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 block mb-1 font-medium">
                    [18] CLIENT DELAY
                  </span>
                  <div className="text-base font-bold text-slate-900">
                    {formData.client_delay !== null && formData.client_delay !== undefined
                      ? `${formData.client_delay} days`
                      : '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Formula: E - F (Docs - Discharge)
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: Financial Charges & Client Total */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>5. Financial Charges (Auto-aggregated from Pending PO)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 block">[19] Storage Amount</span>
                  <span className="text-sm font-bold text-slate-900">
                    ${Number(formData.storage_amount || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-sky-600 block mt-0.5">from Pending PO</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 block">[20] CWR Amount</span>
                  <span className="text-sm font-bold text-slate-900">
                    ${Number(formData.cwr_amount || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-sky-600 block mt-0.5">from Pending PO</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <label className="text-slate-500 block mb-0.5">[22] TRANSPORT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.transport_total || 0}
                    onChange={(e) => handleChange('transport_total', Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <label className="text-slate-500 block mb-0.5">[23] CLEARING</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.clearing_total || 0}
                    onChange={(e) => handleChange('clearing_total', Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>

                <div className="p-2.5 col-span-2 bg-emerald-50/70 border border-emerald-200 rounded flex flex-col justify-center">
                  <span className="text-emerald-800 font-medium block">[24] CLIENT TOTAL</span>
                  <div className="text-lg font-bold text-emerald-900">
                    ${Number(formData.client_total || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-700">Formula: Storage + CWR + Transport + Clearing</span>
                </div>
              </div>
            </div>

            {/* Section 6: Operational Comments */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-2">
              <label className="block text-xs font-semibold text-slate-800">
                [21] Operational COMMENTS & Evidence
              </label>
              <textarea
                rows={3}
                placeholder="Log operational notes, bill of lading arrival status, authorization letters..."
                value={formData.comments || ''}
                onChange={(e) => handleChange('comments', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Form Action Controls */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium rounded shadow-2xs cursor-pointer transition-colors"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-4 py-2 bg-sky-700 text-white hover:bg-sky-800 text-xs font-medium rounded shadow-2xs cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Verify & Commit Record'}
              </button>
            </div>
          </div>

          {/* Right Column: Linked Containers & Underlying Charges */}
          <div className="space-y-6">
            {/* Linked Containers */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
              <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center justify-between">
                <span>Shipment Containers</span>
                <span className="text-slate-500 font-normal">({containers.length} active)</span>
              </h3>
              {containers.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {containers.map((cont) => (
                    <div
                      key={cont.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded font-mono flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-900">{cont.container_no}</span>
                      <span className="text-slate-500 text-[11px]">{cont.size || '40FT'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">
                  No container records attached.
                </div>
              )}
            </div>

            {/* Underlying Charge Line Items */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
              <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center justify-between">
                <span>Underlying Charges</span>
                <span className="text-slate-500 font-normal">({charges.length} entries)</span>
              </h3>
              {charges.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {charges.map((chg) => (
                    <div
                      key={chg.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{chg.details}</span>
                        <span className="font-bold text-slate-900">${chg.amount.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Status: {chg.processing_status}</span>
                        <span>PO: {chg.po_no || 'Pending'}</span>
                      </div>
                      {chg.raw_formula && (
                        <div className="text-[10px] font-mono text-sky-700 truncate">
                          f(x) = {chg.raw_formula}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">
                  No charges currently linked to this CJ.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
