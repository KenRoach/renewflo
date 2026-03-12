import { SupabaseClient } from '@supabase/supabase-js';
import { priceListsRepository } from '../repositories/price-lists.repository.js';
import type { CreatePriceListInput, LookupInput } from '../schemas/price-lists.schema.js';

export const priceListsService = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number }) { return priceListsRepository.list(client, params); },
  async create(client: SupabaseClient, partnerId: string, input: CreatePriceListInput) { return priceListsRepository.create(client, partnerId, input); },
  async update(client: SupabaseClient, id: string, input: Partial<CreatePriceListInput>) { return priceListsRepository.update(client, id, input); },
  async remove(client: SupabaseClient, id: string) { return priceListsRepository.remove(client, id); },
  async lookup(client: SupabaseClient, input: LookupInput) {
    const results = [];
    for (const asset of input.assets) {
      const matches = await priceListsRepository.lookup(client, asset.brand, asset.model, asset.coverageType, asset.durationMonths);
      results.push({
        assetId: asset.assetId, matched: matches.length > 0, source: matches.length > 0 ? 'price_list' : 'rfq',
        bestPrice: matches.length > 0 ? Math.min(...matches.map((m) => parseFloat(m.unit_price))) : null,
        partnerId: matches.length > 0 ? matches[0].partner_id : null, allMatches: matches,
      });
    }
    return results;
  },
};
