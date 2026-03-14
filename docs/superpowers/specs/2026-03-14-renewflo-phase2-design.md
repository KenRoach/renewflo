# RenewFlow Phase 2 — Email, Alerts, Partner Portal, Cleanup

**Date:** 2026-03-14
**Status:** Approved

## Overview

Four phased sub-projects to complete RenewFlow's core platform capabilities. Each phase ships independently.

## Phase 1: Dead Code Cleanup + ChatPanel Fix

**Goal:** Remove the legacy Kitz Gateway client (`src/services/api.ts`) and wire ChatPanel to real order data.

**Changes:**

1. **Move `QuoteResult` type** from `src/services/api.ts` to `src/services/gateway.ts`
2. **Update imports** in `src/features/quoter/QuoterPage.tsx` and `src/utils/quotePdf.ts` to import from `gateway.ts`
3. **Delete** `src/services/api.ts` — all other exports (`sendQuoteEmail`, `generateQuote`, `listAssets`, etc.) are dead code superseded by `gateway.ts`. No other files import from `api.ts` beyond the two above. `ApiError` is only imported from `gateway.ts`.
4. **Wire ChatPanel to real orders:** In `src/app/App.tsx`, replace `PURCHASE_ORDERS` seed data with orders from `useOrdersStore`, mapping `ApiOrder[]` to `PurchaseOrder[]`:
   - `id` ← `o.id.slice(0, 8)`
   - `client` ← `""` (API orders don't carry client name)
   - `quoteRef` ← `o.quote_id?.slice(0, 8) || ""`
   - `items` ← `[]` (summary only, no line items needed for chat context)
   - `status` ← `o.status as POStatus`
   - `total` ← `o.total_amount`
   - `created` / `updated` ← formatted dates from `o.created_at` / `o.updated_at`

**Risk:** Trivial. Rollback: `git revert`.

## Phase 2: Email Delivery via Resend

**Goal:** Send branded quote emails through Resend instead of just downloading PDFs.

### Prerequisites

- Verify `renewflow.io` domain in Resend dashboard (DNS TXT/CNAME records). Until verified, use `onboarding@resend.dev` as sender.
- `RESEND_API_KEY` set as Railway env var on API service.

### Server Side

- **Dependency:** `resend` npm package
- **New file:** `server/src/services/email.service.ts`
  - Initializes Resend client with `RESEND_API_KEY` env var
  - If `RESEND_API_KEY` is missing, log a warning at startup and have the send function return `{ sent: [], failed: recipients }` with error message — do not crash the server
  - Exports `sendQuoteEmail(recipients, quoteData, senderName)`
  - Inline HTML email template: branded header, quote summary, line items table, total, "View in RenewFlow" CTA button linking to `https://renewflow.io` (no deep link — users log in and navigate)
  - Send from `quotes@renewflow.io` (fallback `onboarding@resend.dev` if domain not yet verified)
- **New route:** `POST /:id/email` in `quotes.routes.ts` (full path: `/api/v1/quotes/:id/email`)
  - Body: `{ recipients: string[] }` — max 10 recipients per request
  - Requires authenticated session (not a public path)
  - Fetches quote with line items, calls email service
  - Returns `{ sent: string[], failed: string[] }`

### Frontend Side

- **Gateway:** Add `quotes.sendEmail(id, recipients)` method to `src/services/gateway.ts`
- **QuoterPage:** Update `handleSendQuote` to call real endpoint. On success show sent/failed results. Keep PDF download as separate action.

## Phase 3: Scheduled Warranty Alerts

**Goal:** Automatically generate notifications when assets approach warranty expiry at defined thresholds.

### Alert Schedule (from CLAUDE.md)

| Days to Expiry | Priority | Type Key |
|---------------|----------|----------|
| 90 | medium | `warranty_expiry_90d` |
| 60 | medium | `warranty_expiry_60d` |
| 30 | high | `warranty_expiry_30d` |
| 14 | high | `warranty_expiry_14d` |
| 7 | critical | `warranty_expiry_7d` |
| 0 (lapsed) | high | `warranty_lapsed` |

### Server Side

- **Dependencies:** `node-cron` npm package
- **New file:** `server/src/services/alerts.service.ts`
  - `generateAlerts()`: Uses `adminClient` (service-role key, bypasses RLS) to query all assets across all orgs. Computes `daysLeft` as calendar days between `warranty_end` and current UTC date (using `DATE` comparison, not timestamps — avoids timezone edge cases).
  - For each threshold match: check if `notif_alert` already exists for `(org_id, asset_id, type)` — skip if exists (dedup)
  - **Dedup reset on warranty renewal:** If an asset's `warranty_end` has changed (is now further out), delete old notifications for that asset where `type` starts with `warranty_` so new alerts can be generated for the updated schedule
  - Insert new notifications: `org_id`, `type`, `title`, `body`, `asset_id`, `read: false`
  - Title format: `"Dell PowerEdge R760 — warranty expires in 30 days"`
  - Body format: `"Client: Acme Corp · S/N: ABC123"`
- **New file:** `server/src/jobs/warranty-alerts.ts`
  - Uses `node-cron` to schedule daily run at `0 6 * * *` (06:00 UTC)
  - Calls `alertsService.generateAlerts()`
  - Logs count of new alerts generated
- **Edit:** `server/src/index.ts` — import and start the cron job after server boots

### Frontend

No changes needed. Existing `useNotificationsStore` + `NotificationsPage` already display `notif_alert` records.

## Phase 4: Partner Portal Data Wiring

**Goal:** Verify and fix the delivery-partner experience so all portal pages work with real API data.

### Current State

The partner portal has complete UI:
- Dashboard with KPIs (pending RFQs, active POs, revenue)
- RFQ inbox + detail with price response form
- Active POs + detail with acknowledge action
- Price lists + entitlements pages
- Hooks (`usePartnerDashboard`, `useRfqs`, `usePartnerOrders`, `useEntitlements`, `usePriceLists`) that call `partner.api.ts`
- `partner.api.ts` makes real API calls to Railway backend

### Verification Checklist

1. **RFQ list + detail** — verify `/quotes` returns data mapped correctly to `PartnerRfq` shape
2. **RFQ respond** — verify `POST /quotes/:id/rfq/respond` works end-to-end
3. **Order list + detail** — verify `/orders` returns data mapped correctly to `PartnerPO` shape
4. **Order acknowledge** — verify `POST /orders/:id/acknowledge` has a service method implemented
5. **Price lists** — verify `GET/POST/PATCH/DELETE /price-lists` endpoints exist and are wired
6. **Entitlements** — the frontend expects CRUD endpoints for entitlement records. Backend has `POST /orders/:id/verify-entitlement` but no standalone entitlements routes. **Gap-fill:** add `GET /entitlements` (list by org) and `POST /entitlements` (create) as minimal stubs. Full entitlement management is Phase 3+ scope.
7. **Role routing** — verify delivery-partner users land on partner portal after login
8. **All hooks** — verify `useEntitlements` and `usePriceLists` hooks resolve without errors

### Gap-Fill Approach

- For any missing server-side methods: implement minimal versions
- For response shape mismatches: fix the mapping in `partner.api.ts`
- For missing backend tables (entitlements): create stub endpoints that return empty data with appropriate structure

## Dependencies

```
Phase 1 → Phase 2 (clean types needed before email wiring)
Phase 3 → independent (can run in parallel with Phase 2)
Phase 4 → independent (can run after Phase 1)
```

## Success Criteria

- `npm run build` passes after each phase
- `api.ts` deleted, no remaining imports
- Quote emails actually arrive in inbox via Resend
- Notifications appear automatically for expiring assets without manual action
- Delivery-partner users can log in, see RFQs, respond with pricing, view POs
