import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/routes.ts';
import { initDatabase, db } from './server/db.ts';
import { IngestionService } from './server/ingestion-service.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize SQLite schema
  initDatabase();

  // Pre-seed master database from attached reference workbook if empty
  try {
    const existingBatches = db.prepare('SELECT COUNT(*) as cnt FROM import_batches').get() as any;
    const defaultWorkbook = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
    if (existingBatches.cnt === 0 && fs.existsSync(defaultWorkbook)) {
      console.log('Performing initial master data ingestion from Storage_and_CWR_Charges_SEPT_2026_.xlsx...');
      await IngestionService.importWorkbook(defaultWorkbook, 'Storage_and_CWR_Charges_SEPT_2026_.xlsx');
      console.log('Initial ingestion complete.');
    }
  } catch (seedErr) {
    console.error('Error during initial ingestion:', seedErr);
  }

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Vite development middleware
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Storage & CWR Management System listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
