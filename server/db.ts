import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve('data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DB_DIR, 'cwr_storage_master.sqlite');
export const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys for durability and data integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_hash TEXT,
      imported_at TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      pending_po_rows INTEGER DEFAULT 0,
      report_rows INTEGER DEFAULT 0,
      billed_rows INTEGER DEFAULT 0,
      queried_rows INTEGER DEFAULT 0,
      summary_blocks INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS source_rows (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      sheet_name TEXT NOT NULL,
      row_index INTEGER NOT NULL,
      raw_data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      raw_cj TEXT NOT NULL,
      bl TEXT,
      shipping_line TEXT,
      size TEXT,
      consignee TEXT,
      customer TEXT,
      description_of_goods TEXT,
      status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS containers (
      id TEXT PRIMARY KEY,
      shipment_id TEXT,
      container_no TEXT NOT NULL,
      size TEXT,
      weight REAL,
      status TEXT,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS charge_entries (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      source_row_id TEXT,
      sn INTEGER,
      cj TEXT NOT NULL,
      normalized_cj TEXT NOT NULL,
      bl TEXT,
      container_info TEXT,
      details TEXT NOT NULL,
      classification TEXT NOT NULL,
      po_no TEXT,
      amount REAL NOT NULL,
      raw_formula TEXT,
      comment TEXT,
      processing_status TEXT NOT NULL DEFAULT 'PENDING',
      is_verified INTEGER DEFAULT 0,
      query_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE SET NULL,
      FOREIGN KEY (source_row_id) REFERENCES source_rows(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shipment_details_24 (
      shipment_id TEXT PRIMARY KEY,
      file_no TEXT NOT NULL,
      bl TEXT,
      size TEXT,
      shipping_line TEXT,
      docs_received_date TEXT,
      discharge_date TEXT,
      carry_in_date TEXT,
      do_date TEXT,
      assessment_notice TEXT,
      release_order_print_date TEXT,
      port_charges TEXT,
      allocation_request_date TEXT,
      allocation_date TEXT,
      delays_in_allocation INTEGER,
      truck_number TEXT,
      loaded TEXT,
      clearance INTEGER,
      client_delay INTEGER,
      storage_amount REAL DEFAULT 0,
      cwr_amount REAL DEFAULT 0,
      comments TEXT,
      transport_total REAL DEFAULT 0,
      clearing_total REAL DEFAULT 0,
      client_total REAL DEFAULT 0,
      provenance_map TEXT,
      is_draft INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      verified_by TEXT,
      verified_at TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      action TEXT NOT NULL,
      reason TEXT,
      actor TEXT NOT NULL DEFAULT 'authorized_operator',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      record_counts TEXT NOT NULL,
      is_tested INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_charge_normalized_cj ON charge_entries(normalized_cj);
    CREATE INDEX IF NOT EXISTS idx_charge_status ON charge_entries(processing_status);
    CREATE INDEX IF NOT EXISTS idx_containers_shipment ON containers(shipment_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
  `);
}
