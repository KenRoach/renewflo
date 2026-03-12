import { SupabaseClient } from '@supabase/supabase-js';
import { quotesRepository } from '../repositories/quotes.repository.js';
import { NotFoundError, InvalidTransitionError, ForbiddenError } from '../lib/errors.js';
import { adminClient } from '../supabase.js';
import type { CreateQuoteInput, RfqRespondInput } from '../schemas/quotes.schema.js';

const QUOTE_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending'], pending: ['pricing'], pricing: ['rfq_pending', 'priced'],
  rfq_pending: ['priced'], priced: ['accepted', 'requote', 'rejected'], requote: ['pricing'],
};

function assertTransition(from: string, to: string) {
  if (!QUOTE_TRANSITIONS[from]?.includes(to)) throw new InvalidTransitionError(from, to, 'quote');
}

async function audit(userId: string, recordId: string, oldStatus: string, newStatus: string) {
  await adminClient.from('audit_status_change').insert({ table_name: 'quote_request', record_id: recordId, old_status: oldStatus, new_status: newStatus, changed_by: userId });
}

export const quotesService = {
  async create(client: SupabaseClient, orgId: string, userId: string, input: CreateQuoteInput) {
    const quote = await quotesRepository.create(client, orgId, userId);
    await quotesRepository.addLineItems(client, quote.id, orgId, 1, input.lineItems);
    for (const item of input.lineItems) {
      await client.from('asset_item').update({ status: 'quoted', updated_at: new Date().toISOString() }).eq('id', item.assetId);
    }
    return quotesRepository.getById(client, quote.id);
  },
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    return quotesRepository.list(client, params);
  },
  async getById(client: SupabaseClient, id: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    return quote;
  },
  async submit(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'pending');
    await audit(userId, id, quote.status, 'pending');
    return quotesRepository.updateStatus(client, id, 'pending');
  },
  async requote(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'requote');
    await audit(userId, id, quote.status, 'requote');
    return quotesRepository.incrementVersion(client, id, quote.version);
  },
  async accept(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'accepted');
    await audit(userId, id, quote.status, 'accepted');
    if (quote.quote_line_item) {
      for (const li of quote.quote_line_item) {
        const newStatus = li.coverage_type === 'oem' ? 'oem-approved' : 'tpm-approved';
        await client.from('asset_item').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', li.asset_id);
      }
    }
    return quotesRepository.updateStatus(client, id, 'accepted');
  },
  async reject(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'rejected');
    await audit(userId, id, quote.status, 'rejected');
    return quotesRepository.updateStatus(client, id, 'rejected');
  },
  async sendRfq(client: SupabaseClient, id: string, userId: string, partnerIds: string[]) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    if (quote.status === 'pending') { assertTransition(quote.status, 'pricing'); await quotesRepository.updateStatus(client, id, 'pricing'); }
    assertTransition('pricing', 'rfq_pending');
    await audit(userId, id, quote.status, 'rfq_pending');
    await quotesRepository.updateStatus(client, id, 'rfq_pending');
    const rfqs = [];
    for (const partnerId of partnerIds) { rfqs.push(await quotesRepository.createRfq(client, id, partnerId)); }
    return { quote: await quotesRepository.getById(client, id), rfqs };
  },
  async respondRfq(client: SupabaseClient, quoteId: string, partnerId: string, input: RfqRespondInput) {
    const rfq = await quotesRepository.getRfqByQuoteAndPartner(client, quoteId, partnerId);
    if (!rfq) throw new NotFoundError('RFQ');
    if (rfq.status !== 'sent') throw new ForbiddenError('RFQ already responded to or expired');
    for (const item of input.lineItems) {
      await quotesRepository.updateLineItemPricing(client, item.lineItemId, item.unitPrice, partnerId);
    }
    await quotesRepository.updateRfq(client, rfq.id, { status: 'responded', responded_at: new Date().toISOString(), notes: input.notes ?? null });
    const { data: allRfqs } = await client.from('quote_rfq').select('status').eq('quote_id', quoteId);
    if (allRfqs?.every((r) => r.status !== 'sent')) {
      const quote = await quotesRepository.getById(client, quoteId);
      if (quote?.status === 'rfq_pending') await quotesRepository.updateStatus(client, quoteId, 'priced');
    }
    return { success: true };
  },
};
