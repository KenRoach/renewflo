import { SupabaseClient } from '@supabase/supabase-js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { quotesRepository } from '../repositories/quotes.repository.js';
import { NotFoundError, InvalidTransitionError, BadRequestError } from '../lib/errors.js';
import { adminClient } from '../supabase.js';
import type { CreateOrderInput, VerifyEntitlementInput } from '../schemas/orders.schema.js';

const ORDER_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review', 'cancelled'], under_review: ['approved', 'cancelled'],
  approved: ['routed', 'cancelled'], routed: ['acknowledged', 'cancelled'],
  acknowledged: ['entitlement_verified', 'cancelled'], entitlement_verified: ['completed'],
};

function assertOrderTransition(from: string, to: string) {
  if (!ORDER_TRANSITIONS[from]?.includes(to)) throw new InvalidTransitionError(from, to, 'order');
}

async function audit(userId: string, recordId: string, oldStatus: string, newStatus: string) {
  await adminClient.from('audit_status_change').insert({ table_name: 'order_po', record_id: recordId, old_status: oldStatus, new_status: newStatus, changed_by: userId });
}

export const ordersService = {
  async create(client: SupabaseClient, orgId: string, userId: string, input: CreateOrderInput) {
    const quote = await quotesRepository.getById(client, input.quoteId);
    if (!quote) throw new NotFoundError('Quote', input.quoteId);
    if (quote.status !== 'accepted') throw new BadRequestError('Quote must be accepted to create PO');
    const lineItems = quote.quote_line_item ?? [];
    const total = lineItems.reduce((sum: number, li: any) => sum + (parseFloat(li.unit_price ?? 0) * (li.quantity ?? 1)), 0);
    const partnerId = lineItems.find((li: any) => li.partner_id)?.partner_id;
    if (!partnerId) throw new BadRequestError('No delivery partner assigned to quote line items');
    const order = await ordersRepository.create(client, { org_id: orgId, quote_id: input.quoteId, submitted_by: userId, partner_id: partnerId, status: 'submitted', total });
    const orderLineItems = lineItems.map((li: any) => ({
      po_id: order.id, org_id: orgId, partner_id: partnerId, asset_id: li.asset_id,
      coverage_type: li.coverage_type, duration_months: li.duration_months, unit_price: li.unit_price, quantity: li.quantity,
    }));
    await ordersRepository.addLineItems(client, orderLineItems);
    return ordersRepository.getById(client, order.id);
  },
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    return ordersRepository.list(client, params);
  },
  async getById(client: SupabaseClient, id: string) {
    const order = await ordersRepository.getById(client, id);
    if (!order) throw new NotFoundError('Order', id);
    return order;
  },
  async transition(client: SupabaseClient, id: string, userId: string, targetStatus: string, extra?: Record<string, any>) {
    const order = await ordersRepository.getById(client, id);
    if (!order) throw new NotFoundError('Order', id);
    assertOrderTransition(order.status, targetStatus);
    await audit(userId, id, order.status, targetStatus);
    if (targetStatus === 'completed' && order.order_line_item) {
      for (const li of order.order_line_item) {
        await client.from('asset_item').update({ status: 'fulfilled', updated_at: new Date().toISOString() }).eq('id', li.asset_id);
      }
    }
    return ordersRepository.updateStatus(client, id, targetStatus, extra);
  },
  async verifyEntitlement(client: SupabaseClient, orderId: string, userId: string, input: VerifyEntitlementInput) {
    const order = await ordersRepository.getById(client, orderId);
    if (!order) throw new NotFoundError('Order', orderId);
    const entitlements = input.entitlements.map((e) => ({
      po_id: orderId, org_id: order.org_id, partner_id: order.partner_id, asset_id: e.assetId,
      entitlement_id: e.entitlementId, coverage_start: e.coverageStart, coverage_end: e.coverageEnd,
      verified_by: userId, verified_at: new Date().toISOString(),
    }));
    await ordersRepository.addEntitlements(client, entitlements);
    return this.transition(client, orderId, userId, 'entitlement_verified');
  },
};
