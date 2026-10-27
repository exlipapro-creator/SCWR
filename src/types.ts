export type ChargeClassification = 'STORAGE' | 'CWR' | 'REEFER_MONITORING' | 'LIFT' | 'TRANSPORT' | 'CLEARING' | 'OTHER';
export type ProcessingStatus = 'PENDING' | 'IN_REVIEW' | 'BILLED' | 'QUERIED' | 'RESOLVED';

export interface ChargeEntry {
  id: string;
  batch_id?: string;
  source_row_id?: string;
  sn: number;
  cj: string;
  normalized_cj: string;
  bl?: string;
  container_info?: string;
  details: string;
  classification: ChargeClassification;
  po_no?: string;
  amount: number;
  raw_formula?: string;
  comment?: string;
  processing_status: ProcessingStatus;
  is_verified: number;
  query_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ContainerItem {
  id: string;
  shipment_id: string;
  container_no: string;
  size?: string;
  weight?: number;
  status?: string;
}

export interface ShipmentDetails24 {
  shipment_id: string;
  file_no: string;
  bl?: string;
  size?: string;
  shipping_line?: string;
  docs_received_date?: string | null;
  discharge_date?: string | null;
  carry_in_date?: string | null;
  do_date?: string | null;
  assessment_notice?: string | null;
  release_order_print_date?: string | null;
  port_charges?: string | null;
  allocation_request_date?: string | null;
  allocation_date?: string | null;
  delays_in_allocation?: number | null;
  truck_number?: string;
  loaded?: string;
  clearance?: number | null;
  client_delay?: number | null;
  storage_amount: number;
  cwr_amount: number;
  comments?: string;
  transport_total: number;
  clearing_total: number;
  client_total: number;
  provenance_map?: string;
  is_draft: number;
  is_verified: number;
  verified_by?: string;
  verified_at?: string;
  updated_at: string;
}

export interface CJSummaryItem extends ShipmentDetails24 {
  raw_cj: string;
  customer?: string;
  consignee?: string;
  description_of_goods?: string;
  status?: string;
  containers: ContainerItem[];
  charges: ChargeEntry[];
}

export interface OverviewData {
  totalCharges: {
    count: number;
    value: number;
  };
  statusBreakdown: { processing_status: ProcessingStatus; count: number; sum: number }[];
  classificationBreakdown: { classification: ChargeClassification; count: number; sum: number }[];
  shipmentMetrics: {
    totalShipments: number;
    totalContainers: number;
    totalStorage: number;
    totalCWR: number;
    grandClientTotal: number;
    verifiedCount: number;
    draftCount: number;
  };
  recentBatches: any[];
  recentAudits: any[];
  pendingWithoutSummary: any[];
}

export interface IngestionPreview {
  filename: string;
  fileHash: string;
  isExistingHash: boolean;
  sheetsFound: string[];
  missingRequiredSheets: string[];
  pendingPORowsCount: number;
  reportRowsCount: number;
  billedRowsCount: number;
  queriedRowsCount: number;
  summaryBlocksCount: number;
  distinctCJsCount: number;
  totalChargesValue: number;
  potentialDuplicates: any[];
  warnings: string[];
}

export interface ExportValidationReport {
  timestamp: string;
  outputPath: string;
  sheetsCount: number;
  sheetNames: string[];
  preservedFormulasCount: number;
  reconciledSummaryBlocks: number;
  storageReconciliationPassed: boolean;
  cwrReconciliationPassed: boolean;
  totalClientVariance: number;
  validationPassed: boolean;
  details: string[];
}

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  action: string;
  reason?: string;
  actor: string;
  created_at: string;
}
