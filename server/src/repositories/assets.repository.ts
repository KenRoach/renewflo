import { SupabaseClient } from '@supabase/supabase-js';
import type { ListAssetsQuery, UpdateAssetInput } from '../schemas/assets.schema.js';

export const assetsRepository = {
  async list(client: SupabaseClient, params: ListAssetsQuery) {
    let query = client.from('asset_item').select('*');
    if (params.status) query = query.eq('status', params.status);
    if (params.tier) query = query.eq('tier', params.tier);
    if (params.brand) query = query.ilike('brand', `%${params.brand}%`);
    if (params.search) query = query.or(`serial.ilike.%${params.search}%,model.ilike.%${params.search}%`);
    query = query.order('created_at', { ascending: false });
    if (params.cursor) query = query.lt('id', params.cursor);
    const limit = params.limit ?? 50;
    const { data, error } = await query.limit(limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > limit;
    return { data: hasMore ? items.slice(0, limit) : items, nextCursor: hasMore ? items[limit - 1].id : null, hasMore };
  },

  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client.from('asset_item').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async update(client: SupabaseClient, id: string, input: UpdateAssetInput) {
    const { data, error } = await client.from('asset_item').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(client: SupabaseClient, id: string) {
    const { error } = await client.from('asset_item').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkInsert(client: SupabaseClient, orgId: string, batchId: string, rows: any[]) {
    const records = rows.map((row) => ({
      org_id: orgId, import_batch_id: batchId, brand: row.brand, model: row.model, serial: row.serial,
      device_type: row.device_type ?? null, tier: row.tier ?? 'standard', warranty_end: row.warranty_end,
      purchase_date: row.purchase_date ?? null, status: 'discovered',
    }));
    const { data, error } = await client.from('asset_item').upsert(records, { onConflict: 'org_id,serial', ignoreDuplicates: false }).select();
    if (error) throw error;
    return data;
  },

  async createBatch(client: SupabaseClient, orgId: string, userId: string, fileName: string) {
    const { data, error } = await client.from('asset_import_batch').insert({ org_id: orgId, uploaded_by: userId, file_name: fileName, status: 'processing' }).select().single();
    if (error) throw error;
    return data;
  },

  async updateBatch(client: SupabaseClient, batchId: string, update: Record<string, any>) {
    const { error } = await client.from('asset_import_batch').update(update).eq('id', batchId);
    if (error) throw error;
  },
};
