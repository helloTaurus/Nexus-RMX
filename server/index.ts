import express from 'express';
import { recruitmentRouter } from './api.ts';
import { hrmsRouter } from './hrms/router.ts';
import { initDatabase } from './db.ts';
import { processOutboxQueue } from './email.ts';

// Ensure DB is initialized
initDatabase();

export const apiApp = express();

apiApp.use(express.json());
apiApp.use(express.urlencoded({ extended: true }));

// Mount recruitment API routes under /api/recruitment
apiApp.use('/api/recruitment', recruitmentRouter);

// Mount HRMS API routes under /api/hrms (People & Expense internal system)
apiApp.use('/api/hrms', hrmsRouter);

// Standard error-handling middleware for malformed JSON and server errors
apiApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.status === 400 || err.statusCode === 400 || err.type === 'entity.parse.failed')) {
    return res.status(400).json({ success: false, error: 'Malformed JSON payload.' });
  }
  return res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start periodic outbox processor (every 30 seconds)
const outboxInterval = setInterval(() => {
  processOutboxQueue().catch((err) => console.error('Periodic outbox processor error:', err));
}, 30000);
outboxInterval.unref();

export default apiApp;
