import { SupabaseClient } from '@supabase/supabase-js';

export const quotesRepository = {
  async create(client: SupabaseClient, orgId: string, userId: string) {
    const { data, error } = await client.from('quote_request').insert({ org_id: orgId, requested_by: userId, status: 'draft', version: 1 }).select().single();
    if (error) throw error;
    return data;
  },
  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client.from('quote_request').select('*, quote_line_item(*)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    let query = client.from('quote_request').select('*');
    if (params.status) query = query.eq('status', params.status);
    query = query.order('created_at', { ascending: false });
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },
  async updateStatus(client: SupabaseClient, id: string, status: string, extra?: Record<string, any>) {
    const { data, error } = await client.from('quote_request').update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async addLineItems(client: SupabaseClient, quoteId: string, orgId: string, version: number, items: any[]) {
    const records = items.map((item) => ({
      quote_id: quoteId, org_id: orgId, asset_id: item.assetId, coverage_type: item.coverageType,
      duration_months: item.durationMonths, quantity: item.quantity ?? 1, source: 'rfq', version,
    }));
    const { data, error } = await client.from('quote_line_item').insert(records).select();
    if (error) throw error;
    return data;
  },
  async createRfq(client: SupabaseClient, quoteId: string, partnerId: string) {
    const { data, error } = await client.from('quote_rfq').insert({ quote_id: quoteId, partner_id: partnerId, status: 'sent', sent_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    return data;
  },
  async updateRfq(client: SupabaseClient, rfqId: string, update: Record<string, any>) {
    const { data, error } = await client.from('quote_rfq').update(update).eq('id', rfqId).select().single();
    if (error) throw error;
    return data;
  },
  async getRfqByQuoteAndPartner(client: SupabaseClient, quoteId: string, partnerId: string) {
    const { data, error } = await client.from('quote_rfq').select('*').eq('quote_id', quoteId).eq('partner_id', partnerId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  async updateLineItemPricing(client: SupabaseClient, lineItemId: string, unitPrice: number, partnerId: string) {
    const { error } = await client.from('quote_line_item').update({ unit_price: unitPrice, partner_id: partnerId, source: 'rfq', updated_at: new Date().toISOString() }).eq('id', lineItemId);
    if (error) throw error;
  },
  async incrementVersion(client: SupabaseClient, id: string, currentVersion: number) {
    const { data, error } = await client.from('quote_request').update({ version: currentVersion + 1, status: 'pricing', updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};
