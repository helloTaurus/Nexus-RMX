import express from 'express';
import path from 'node:path';
import apiApp from './index.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

// Mount API app
app.use(apiApp);

// Serve static frontend assets
app.use(express.static(DIST_DIR));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nexus Finance Production Server running on http://0.0.0.0:${PORT}`);
});
