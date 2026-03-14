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
3. **Delete** `src/services/api.ts`
4. **Wire ChatPanel to real orders:** In `src/app/App.tsx`, replace `PURCHASE_ORDERS` seed data with orders from `useOrdersStore`, mapping `ApiOrder[]` to `PurchaseOrder[]`

**Risk:** Trivial. Type move + import change + seed data swap.

## Phase 2: Email Delivery via Resend

**Goal:** Send branded quote emails through Resend instead of just downloading PDFs.

### Server Side

- **Dependency:** `resend` npm package
- **New file:** `server/src/services/email.service.ts`
  - Initializes Resend client with `RESEND_API_KEY` env var
  - Exports `sendQuoteEmail(recipients, quoteData, senderName)`
  - Inline HTML email template: branded header, quote summary, line items table, total, CTA button
  - Send from `quotes@renewflow.io` (fallback `onboarding@resend.dev`)
- **New route:** `POST /api/v1/quotes/:id/email` in `quotes.routes.ts`
  - Body: `{ recipients: string[] }`
  - Fetches quote with line items, calls email service
  - Returns `{ sent: string[], failed: string[] }`
  - Add to auth plugin's authenticated paths (requires valid session)

### Frontend Side

- **Gateway:** Add `quotes.sendEmail(id, recipients)` method to `src/services/gateway.ts`
- **QuoterPage:** Update `handleSendQuote` to call real endpoint. On success show sent/failed results. Keep PDF download as separate action.

### Env Vars

- `RESEND_API_KEY` on Railway API service (key: `re_dKjjK3MX_4czcvcL5uULKvxpixpKu8aam`)

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

- **New file:** `server/src/services/alerts.service.ts`
  - `generateAlerts()`: Queries all assets grouped by org, computes `daysLeft` from `warranty_end`, matches against thresholds
  - For each match: check if `notif_alert` already exists for `(org_id, asset_id, type)` — skip if exists (dedup)
  - Insert new notifications: `org_id`, `type`, `title`, `body`, `asset_id`, `read: false`
  - Title format: `"Dell PowerEdge R760 — warranty expires in 30 days"`
  - Body format: `"Client: Acme Corp · S/N: ABC123"`
- **New file:** `server/src/jobs/warranty-alerts.ts`
  - Uses `node-cron` to schedule daily run at 06:00 UTC
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
- Hooks (`usePartnerDashboard`, `useRfqs`, `usePartnerOrders`) that call `partner.api.ts`
- `partner.api.ts` makes real API calls to Railway backend

### Verification Checklist

1. **RFQ list + detail** — verify `/quotes` returns data mapped correctly to `PartnerRfq` shape
2. **RFQ respond** — verify `POST /quotes/:id/rfq/respond` works end-to-end
3. **Order list + detail** — verify `/orders` returns data mapped correctly to `PartnerPO` shape
4. **Order acknowledge** — verify `POST /orders/:id/acknowledge` has a service method implemented
5. **Price lists** — verify endpoints exist and are wired
6. **Entitlements** — verify backend table/routes exist; stub if not
7. **Role routing** — verify delivery-partner users land on partner portal after login

### Gap-Fill Approach

- For any missing server-side methods: implement minimal versions
- For response shape mismatches: fix the mapping in `partner.api.ts`
- For missing backend tables (entitlements): create stub endpoints that return empty arrays, with TODO for future implementation

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
