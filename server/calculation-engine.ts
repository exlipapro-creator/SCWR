/**
 * Authoritative Central Calculation Engine
 * Strictly reproduces verified PRD and workbook rules across master DB, UI, reports, and exports.
 */

export type ChargeClassification = 'STORAGE' | 'CWR' | 'REEFER_MONITORING' | 'LIFT' | 'TRANSPORT' | 'CLEARING' | 'OTHER';
export type ProcessingStatus = 'PENDING' | 'IN_REVIEW' | 'BILLED' | 'QUERIED' | 'RESOLVED';

export interface CalculatedShipmentTotals {
  delaysInAllocation: number | null;
  clearance: number | null;
  clientDelay: number | null;
  storageAmount: number;
  cwrAmount: number;
  transportTotal: number;
  clearingTotal: number;
  clientTotal: number;
}

export class CalculationEngine {
  /**
   * Normalizes CJ identifier to canonical format (e.g. 'CJ-2026-000091')
   */
  static normalizeCJ(raw: string | null | undefined): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    const match = trimmed.match(/CJ-\d{4}-\d+/i);
    return match ? match[0].toUpperCase() : trimmed.toUpperCase();
  }

  /**
   * Normalizes Bill of Lading
   */
  static normalizeBL(raw: string | null | undefined): string {
    if (!raw) return '';
    return raw.trim().replace(/\s+/g, '').toUpperCase();
  }

  /**
   * Classify charge description according to auditable registry
   */
  static classifyCharge(details: string | null | undefined): ChargeClassification {
    if (!details) return 'OTHER';
    const d = details.trim().toLowerCase();
    if (d.includes('storage') || d.includes('demurrage')) {
      return 'STORAGE';
    }
    if (d.includes('custom warehouse') || d.includes('cwr')) {
      return 'CWR';
    }
    if (d.includes('power and monitoring') || d.includes('reefer') || d.includes('plug-in')) {
      return 'REEFER_MONITORING';
    }
    if (d.includes('lift') || d.includes('handling') || d.includes('lolo')) {
      return 'LIFT';
    }
    if (d.includes('transport') || d.includes('haulage') || d.includes('trucking')) {
      return 'TRANSPORT';
    }
    if (d.includes('clearing') || d.includes('customs') || d.includes('agency')) {
      return 'CLEARING';
    }
    return 'OTHER';
  }

  /**
   * Parse date safely into YYYY-MM-DD or null
   */
  static parseDateOnly(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    if (!s) return null;
    // Test ISO string or YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return null;
  }

  /**
   * Calendar day difference: d2 - d1 in days
   */
  static diffDays(d1Str: string | null, d2Str: string | null): number | null {
    if (!d1Str || !d2Str) return null;
    const d1 = new Date(d1Str);
    const d2 = new Date(d2Str);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    const msDiff = d2.getTime() - d1.getTime();
    return Math.round(msDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Evaluate arithmetic formula safely (e.g. "150+120", "(69954+216220)/2600")
   */
  static evaluateArithmeticFormula(formula: string | null | undefined): number {
    if (!formula) return 0;
    const cleaned = String(formula).replace(/^=/, '').trim();
    // Allow only digits, +, -, *, /, (, ), ., whitespace
    if (!/^[\d\+\-\*\/\(\)\.\s]+$/.test(cleaned)) {
      return 0;
    }
    try {
      // Safe arithmetic evaluation without arbitrary code execution
      const fn = new Function(`"use strict"; return (${cleaned});`);
      const res = fn();
      return typeof res === 'number' && !isNaN(res) && isFinite(res) ? res : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Recalculates all dependent date and financial metrics for a 24-field shipment
   */
  static computeShipmentMetrics(input: {
    allocationRequestDate?: string | null;
    allocationDate?: string | null;
    docsReceivedDate?: string | null;
    dischargeDate?: string | null;
    doDate?: string | null;
    storageCharges?: number;
    cwrCharges?: number;
    reeferCharges?: number;
    transportCharges?: number;
    clearingCharges?: number;
  }): CalculatedShipmentTotals {
    const allocReq = this.parseDateOnly(input.allocationRequestDate);
    const allocDate = this.parseDateOnly(input.allocationDate);
    const docsRec = this.parseDateOnly(input.docsReceivedDate);
    const discharge = this.parseDateOnly(input.dischargeDate);
    const doDate = this.parseDateOnly(input.doDate);

    // Verified PRD and workbook formulas:
    // DELAYS IN ALLOCATION: allocation date - allocation request date
    const delaysInAllocation = (allocDate && allocReq) ? this.diffDays(allocReq, allocDate) : null;

    // CLEARANCE: DODate - DischargeDate
    const clearance = (doDate && discharge) ? this.diffDays(discharge, doDate) : null;

    // CLIENT DELAY: DOCS RECEIVED DATE - DischargeDate (can be negative)
    const clientDelay = (docsRec && discharge) ? this.diffDays(discharge, docsRec) : null;

    const storageAmount = Number(input.storageCharges || 0);
    // Reefer monitoring is grouped into CWR/rent line item as observed in workbook audit
    const cwrAmount = Number(input.cwrCharges || 0) + Number(input.reeferCharges || 0);
    const transportTotal = Number(input.transportCharges || 0);
    const clearingTotal = Number(input.clearingCharges || 0);
    const clientTotal = Math.round((storageAmount + cwrAmount + transportTotal + clearingTotal) * 10000) / 10000;

    return {
      delaysInAllocation,
      clearance,
      clientDelay,
      storageAmount,
      cwrAmount,
      transportTotal,
      clearingTotal,
      clientTotal
    };
  }
}
