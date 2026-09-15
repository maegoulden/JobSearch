import cron from 'node-cron';
import { checkAllSites } from './checker.js';

function startScheduler(cronExpression) {
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  const task = cron.schedule(cronExpression, async () => {
    console.log(`[scheduler] running scheduled check at ${new Date().toISOString()}`);
    try {
      await checkAllSites();
    } catch (err) {
      console.error('[scheduler] check-all failed', err);
    }
  });

  console.log(`[scheduler] scheduled career-page checks with cron "${cronExpression}"`);
  return task;
}

export { startScheduler };
