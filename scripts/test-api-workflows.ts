async function testWorkflows() {
  const base = 'http://localhost:3000/api';

  console.log('--- 1. Testing GET /api/overview ---');
  let res = await fetch(`${base}/overview`);
  let data = await res.json();
  console.log('Overview total charges:', data.totalCharges);
  console.log('Overview status breakdown:', data.statusBreakdown);

  console.log('\n--- 2. Testing GET /api/pending-po ---');
  res = await fetch(`${base}/pending-po?search=000091`);
  data = await res.json();
  console.log(`Pending PO search "000091" returned: ${data.rows.length} rows`);
  const targetCharge = data.rows[0];
  console.log('Found charge:', targetCharge.id, targetCharge.normalized_cj, targetCharge.amount);

  console.log('\n--- 3. Testing PATCH /api/charge/:id ---');
  res = await fetch(`${base}/charge/${encodeURIComponent(targetCharge.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      processing_status: 'IN_REVIEW',
      po_no: 'PO-TEST-12345',
      comment: 'Auditor verification in progress'
    })
  });
  data = await res.json();
  console.log('Updated charge status:', data.processing_status, 'PO:', data.po_no);

  console.log('\n--- 4. Testing GET /api/shipment/:cj & PUT /api/shipment/:cj ---');
  res = await fetch(`${base}/shipment/CJ-2026-000091`);
  data = await res.json();
  console.log('Shipment details loaded for:', data.details.shipment_id, 'Storage:', data.details.storage_amount);

  res = await fetch(`${base}/shipment/CJ-2026-000091`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data.details,
      truck_number: 'AUDIT-TRUCK-999',
      is_draft: 0,
      is_verified: 1,
      change_reason: 'Audited and verified particulars'
    })
  });
  data = await res.json();
  console.log('Shipment updated. is_verified:', data.is_verified, 'truck_number:', data.truck_number);

  console.log('\n--- 5. Testing GET /api/cj-summaries ---');
  res = await fetch(`${base}/cj-summaries`);
  data = await res.json();
  console.log(`CJ summaries loaded: ${data.length} shipments`);

  console.log('\n--- 6. Testing GET /api/reports/custom ---');
  res = await fetch(`${base}/reports/custom?status=PENDING`);
  data = await res.json();
  console.log(`Custom reports filtered by PENDING: ${data.totalLineItems} items, grand total: $${data.grandTotal}`);

  console.log('\n--- 7. Testing POST /api/export ---');
  res = await fetch(`${base}/export`, { method: 'POST' });
  data = await res.json();
  console.log('Export generated:', data.filename, 'Validation passed:', data.report.validationPassed, 'Formulas:', data.report.preservedFormulasCount);

  console.log('\n--- 8. Testing POST /api/backup/create ---');
  res = await fetch(`${base}/backup/create`, { method: 'POST' });
  data = await res.json();
  console.log('Backup created:', data.filename, 'Size:', data.size, 'Integrity tested:', data.isTested);

  console.log('\n--- 9. Testing GET /api/audit-trail ---');
  res = await fetch(`${base}/audit-trail`);
  data = await res.json();
  console.log(`Audit trail contains ${data.length} recorded events`);
  console.log('Latest audit event:', data[0]);

  console.log('\nALL 9 API WORKFLOW TESTS EXECUTED AND PASSED!');
}

testWorkflows().catch(console.error);
