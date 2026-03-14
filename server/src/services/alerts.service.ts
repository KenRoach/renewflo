import { adminClient } from '../supabase.js';

const THRESHOLDS = [
  { days: 90, type: 'warranty_expiry_90d', priority: 'medium', label: '90 days' },
  { days: 60, type: 'warranty_expiry_60d', priority: 'medium', label: '60 days' },
  { days: 30, type: 'warranty_expiry_30d', priority: 'high', label: '30 days' },
  { days: 14, type: 'warranty_expiry_14d', priority: 'high', label: '14 days' },
  { days: 7, type: 'warranty_expiry_7d', priority: 'critical', label: '7 days' },
  { days: 0, type: 'warranty_lapsed', priority: 'high', label: 'lapsed' },
];

export const alertsService = {
  async generateAlerts(): Promise<number> {
    // Fetch all assets with warranty_end set
    const { data: assets, error: assetErr } = await adminClient
      .from('core_asset')
      .select('id, org_id, brand, model, serial, warranty_end')
      .not('warranty_end', 'is', null);

    if (assetErr || !assets) {
      console.error('[alerts] Failed to fetch assets:', assetErr?.message);
      return 0;
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    let created = 0;

    for (const asset of assets) {
      const warrantyEnd = new Date(asset.warranty_end + 'T00:00:00Z');
      const diffMs = warrantyEnd.getTime() - new Date(todayStr + 'T00:00:00Z').getTime();
      const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      for (const threshold of THRESHOLDS) {
        // Match: exact threshold day, or lapsed (daysLeft <= 0 for the 0-day threshold)
        const matches = threshold.days === 0
          ? daysLeft <= 0
          : daysLeft === threshold.days;

        if (!matches) continue;

        // Dedup: check if this alert already exists
        const { data: existing } = await adminClient
          .from('notif_alert')
          .select('id')
          .eq('org_id', asset.org_id)
          .eq('asset_id', asset.id)
          .eq('type', threshold.type)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Insert notification
        const title = threshold.days === 0
          ? `${asset.brand} ${asset.model} — warranty has lapsed`
          : `${asset.brand} ${asset.model} — warranty expires in ${threshold.label}`;

        const body = `S/N: ${asset.serial}`;

        const { error: insertErr } = await adminClient
          .from('notif_alert')
          .insert({
            org_id: asset.org_id,
            type: threshold.type,
            title,
            body,
            asset_id: asset.id,
            read: false,
          });

        if (!insertErr) created++;
      }
    }

    return created;
  },

  /** Reset dedup when an asset's warranty_end changes (renewal) */
  async resetForAsset(assetId: string): Promise<void> {
    await adminClient
      .from('notif_alert')
      .delete()
      .eq('asset_id', assetId)
      .like('type', 'warranty_%');
  },
};
