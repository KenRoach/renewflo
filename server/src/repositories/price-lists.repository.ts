import { SupabaseClient } from '@supabase/supabase-js';

export const priceListsRepository = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number }) {
    let query = client.from('quote_price_list').select('*').order('created_at', { ascending: false });
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },
  async create(client: SupabaseClient, partnerId: string, input: any) {
    const { data, error } = await client.from('quote_price_list').insert({
      partner_id: partnerId, brand: input.brand, model_pattern: input.modelPattern, coverage_type: input.coverageType,
      duration_months: input.durationMonths, unit_price: input.unitPrice, valid_from: input.validFrom, valid_until: input.validUntil,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(client: SupabaseClient, id: string, input: any) {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.brand) updateData.brand = input.brand;
    if (input.modelPattern) updateData.model_pattern = input.modelPattern;
    if (input.coverageType) updateData.coverage_type = input.coverageType;
    if (input.durationMonths) updateData.duration_months = input.durationMonths;
    if (input.unitPrice) updateData.unit_price = input.unitPrice;
    if (input.validFrom) updateData.valid_from = input.validFrom;
    if (input.validUntil) updateData.valid_until = input.validUntil;
    const { data, error } = await client.from('quote_price_list').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(client: SupabaseClient, id: string) {
    const { error } = await client.from('quote_price_list').delete().eq('id', id);
    if (error) throw error;
  },
  async lookup(client: SupabaseClient, brand: string, model: string, coverageType: string, durationMonths: number) {
    const { data, error } = await client.from('quote_price_list').select('*')
      .eq('brand', brand).eq('coverage_type', coverageType).eq('duration_months', durationMonths)
      .lte('valid_from', new Date().toISOString().split('T')[0]).gte('valid_until', new Date().toISOString().split('T')[0]);
    if (error) throw error;
    return (data ?? []).filter((entry) => {
      const pattern = entry.model_pattern.replace(/%/g, '.*').replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`, 'i').test(model);
    });
  },
};
