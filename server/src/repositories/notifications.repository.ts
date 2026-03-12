import { SupabaseClient } from '@supabase/supabase-js';

export const notificationsRepository = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; unreadOnly: boolean }) {
    let query = client.from('notif_alert').select('*').order('created_at', { ascending: false });
    if (params.unreadOnly) query = query.eq('read', false);
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },
  async markRead(client: SupabaseClient, id: string) {
    const { error } = await client.from('notif_alert').update({ read: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
  async markAllRead(client: SupabaseClient, orgId: string) {
    const { error } = await client.from('notif_alert').update({ read: true, updated_at: new Date().toISOString() }).eq('org_id', orgId).eq('read', false);
    if (error) throw error;
  },
};
