import {
  OverviewData,
  ChargeEntry,
  ShipmentDetails24,
  CJSummaryItem,
  IngestionPreview,
  ExportValidationReport,
  AuditEvent
} from './types.ts';

export const api = {
  async getOverview(): Promise<OverviewData> {
    const res = await fetch('/api/overview');
    if (!res.ok) throw new Error('Failed to load overview data');
    return res.json();
  },

  async getPendingPO(params?: { search?: string; status?: string; classification?: string; limit?: number; offset?: number }): Promise<{ rows: ChargeEntry[]; totalCount: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.classification) q.set('classification', params.classification);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const res = await fetch(`/api/pending-po?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to load pending PO charges');
    return res.json();
  },

  async updateCharge(id: string, updates: Partial<ChargeEntry> & { query_reason?: string }): Promise<ChargeEntry> {
    const res = await fetch(`/api/charge/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update charge');
    return res.json();
  },

  async searchShipments(q: string): Promise<any[]> {
    const res = await fetch(`/api/shipments?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Failed to search shipments');
    return res.json();
  },

  async getShipmentDetails(cj: string): Promise<{ details: ShipmentDetails24; parent: any; containers: any[]; charges: ChargeEntry[] }> {
    const res = await fetch(`/api/shipment/${encodeURIComponent(cj)}`);
    if (!res.ok) throw new Error('Failed to load shipment details');
    return res.json();
  },

  async saveShipmentDetails(cj: string, data: Partial<ShipmentDetails24> & { change_reason?: string }): Promise<ShipmentDetails24> {
    const res = await fetch(`/api/shipment/${encodeURIComponent(cj)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save shipment details');
    return res.json();
  },

  async getCJSummaries(): Promise<CJSummaryItem[]> {
    const res = await fetch('/api/cj-summaries');
    if (!res.ok) throw new Error('Failed to load CJ summaries');
    return res.json();
  },

  async getCustomReports(filters: { cj?: string; bl?: string; status?: string; classification?: string; shipping_line?: string }): Promise<{
    totalLineItems: number;
    grandTotal: number;
    groupedByCJ: { cj: string; bl: string; shippingLine: string; items: ChargeEntry[]; totalAmount: number }[];
    allRows: ChargeEntry[];
  }> {
    const q = new URLSearchParams();
    if (filters.cj) q.set('cj', filters.cj);
    if (filters.bl) q.set('bl', filters.bl);
    if (filters.status) q.set('status', filters.status);
    if (filters.classification) q.set('classification', filters.classification);
    if (filters.shipping_line) q.set('shipping_line', filters.shipping_line);
    const res = await fetch(`/api/reports/custom?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
  },

  async previewImport(file?: File): Promise<IngestionPreview> {
    const form = new FormData();
    if (file) form.append('workbook', file);
    const res = await fetch('/api/import/preview', {
      method: 'POST',
      body: form
    });
    if (!res.ok) throw new Error('Failed to preview workbook');
    return res.json();
  },

  async commitImport(file?: File): Promise<{ batchId: string; summary: any }> {
    const form = new FormData();
    if (file) form.append('workbook', file);
    const res = await fetch('/api/import/commit', {
      method: 'POST',
      body: form
    });
    if (!res.ok) throw new Error('Failed to commit import');
    return res.json();
  },

  async triggerExport(): Promise<{ downloadUrl: string; filename: string; report: ExportValidationReport }> {
    const res = await fetch('/api/export', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate Excel export');
    return res.json();
  },

  async getAuditTrail(): Promise<AuditEvent[]> {
    const res = await fetch('/api/audit-trail');
    if (!res.ok) throw new Error('Failed to load audit history');
    return res.json();
  },

  async createBackup(): Promise<any> {
    const res = await fetch('/api/backup/create', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create backup');
    return res.json();
  },

  async getBackups(): Promise<any[]> {
    const res = await fetch('/api/backups');
    if (!res.ok) throw new Error('Failed to load backups');
    return res.json();
  }
};
