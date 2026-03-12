import { adminClient } from '../supabase.js';

export const orgsRepository = {
  async list(params: { cursor?: string; limit: number }) {
    let query = adminClient.from('core_organization').select('*').order('created_at', { ascending: false });
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },
  async getById(id: string) {
    const { data, error } = await adminClient.from('core_organization').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async update(id: string, data: Record<string, any>) {
    const { data: org, error } = await adminClient.from('core_organization').update(data).eq('id', id).select().single();
    if (error) throw error;
    return org;
  },
};
