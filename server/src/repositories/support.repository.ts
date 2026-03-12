import { SupabaseClient } from '@supabase/supabase-js';

export const supportRepository = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    let query = client.from('support_ticket').select('*').order('created_at', { ascending: false });
    if (params.status) query = query.eq('status', params.status);
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },
  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client.from('support_ticket').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(client: SupabaseClient, data: Record<string, any>) {
    const { data: ticket, error } = await client.from('support_ticket').insert(data).select().single();
    if (error) throw error;
    return ticket;
  },
  async update(client: SupabaseClient, id: string, data: Record<string, any>) {
    const { data: ticket, error } = await client.from('support_ticket').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return ticket;
  },
};
