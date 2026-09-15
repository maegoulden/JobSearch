import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './src/routes.js';
import { startScheduler } from './src/scheduler.js';
import { ensureDataDir } from './src/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const CHECK_CRON_SCHEDULE = process.env.CHECK_CRON_SCHEDULE || '*/30 * * * *';

ensureDataDir();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`JobSearch tracker running at http://localhost:${PORT}`);
  startScheduler(CHECK_CRON_SCHEDULE);
});
