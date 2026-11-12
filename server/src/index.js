import app from './app.js';
import { config } from './config.js';
import { getDb } from './db/index.js';

const db = await getDb();

app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  console.log(`[api] data store: ${db.kind || 'json'}`);
  console.log(`[api] admin login: ${config.admin.username} / ${config.admin.password}`);
});
