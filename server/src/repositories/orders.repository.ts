import { SupabaseClient } from '@supabase/supabase-js';

export const ordersRepository = {
  async create(client: SupabaseClient, data: Record<string, any>) {
    const { data: order, error } = await client.from('order_po').insert(data).select().single();
    if (error) throw error;
    return order;
  },
  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client.from('order_po').select('*, order_line_item(*), order_entitlement(*)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    let query = client.from('order_po').select('*').order('created_at', { ascending: false });
    if (params.status) query = query.eq('status', params.status);
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },
  async updateStatus(client: SupabaseClient, id: string, status: string, extra?: Record<string, any>) {
    const { data, error } = await client.from('order_po').update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async addLineItems(client: SupabaseClient, items: Record<string, any>[]) {
    const { data, error } = await client.from('order_line_item').insert(items).select();
    if (error) throw error;
    return data;
  },
  async addEntitlements(client: SupabaseClient, items: Record<string, any>[]) {
    const { data, error } = await client.from('order_entitlement').insert(items).select();
    if (error) throw error;
    return data;
  },
};
