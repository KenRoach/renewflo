import cron from 'node-cron';
import { alertsService } from '../services/alerts.service.js';

export function startWarrantyAlertsCron(): void {
  // Run daily at 06:00 UTC
  cron.schedule('0 6 * * *', async () => {
    console.log('[cron] Running warranty alert generation...');
    try {
      const count = await alertsService.generateAlerts();
      console.log(`[cron] Warranty alerts: ${count} new notifications created`);
    } catch (err) {
      console.error('[cron] Warranty alert generation failed:', (err as Error).message);
    }
  });

  console.log('[cron] Warranty alerts scheduled: daily at 06:00 UTC');
}
