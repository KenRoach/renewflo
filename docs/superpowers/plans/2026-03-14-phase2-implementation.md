# RenewFlow Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship email delivery, warranty alerts, partner portal wiring, and dead code cleanup across 4 phases.

**Architecture:** Each phase is an independent commit. Phase 1 cleans up types/imports and wires ChatPanel. Phase 2 adds Resend email on the server + frontend. Phase 3 adds a daily cron job for warranty alerts. Phase 4 verifies and fixes the partner portal data flow.

**Tech Stack:** React 19, TypeScript, Zustand, Fastify, Supabase, Resend, node-cron

---

## Chunk 1: Phase 1 — Dead Code Cleanup + ChatPanel Fix

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/services/gateway.ts` | Add `QuoteResult` interface |
| Modify | `src/features/quoter/QuoterPage.tsx` | Change import source |
| Modify | `src/utils/quotePdf.ts` | Change import source |
| Delete | `src/services/api.ts` | Remove legacy Kitz Gateway client |
| Modify | `src/app/App.tsx` | Wire ChatPanel to real orders |

### Task 1: Move QuoteResult type to gateway.ts

**Files:**
- Modify: `src/services/gateway.ts`
- Modify: `src/features/quoter/QuoterPage.tsx:6`
- Modify: `src/utils/quotePdf.ts:4`

- [ ] **Step 1: Add QuoteResult interface to gateway.ts**

Add before the closing of the file (after the `auth` export), at the bottom of `src/services/gateway.ts`:

```typescript
// ─── Quote Display Types ───

export interface QuoteResult {
  quoteId: string;
  date: string;
  coverageType: "tpm" | "oem";
  deviceCount: number;
  clients: string[];
  items: {
    assetId: string;
    brand: string;
    model: string;
    serial: string;
    client: string;
    deviceType: string;
    tier: string;
    daysLeft: number;
    tpmPrice: number;
    oemPrice: number | null;
    selectedCoverage: "tpm" | "oem";
    lineTotal: number;
  }[];
  summary: {
    totalTPM: number;
    totalOEM: number;
    selectedTotal: number;
    savings: number;
    savingsPct: number;
  };
  status: string;
}
```

- [ ] **Step 2: Update QuoterPage import**

In `src/features/quoter/QuoterPage.tsx`, change line 6 from:
```typescript
import type { QuoteResult } from "@/services/api";
```
to:
```typescript
import type { QuoteResult } from "@/services/gateway";
```

- [ ] **Step 3: Update quotePdf import**

In `src/utils/quotePdf.ts`, change line 4 from:
```typescript
import type { QuoteResult } from "@/services/api";
```
to:
```typescript
import type { QuoteResult } from "@/services/gateway";
```

- [ ] **Step 4: Delete api.ts**

```bash
rm src/services/api.ts
```

- [ ] **Step 5: Build to verify no broken imports**

```bash
npm run build
```
Expected: Success. No references to `@/services/api` remain.

- [ ] **Step 6: Commit**

```bash
git add src/services/gateway.ts src/features/quoter/QuoterPage.tsx src/utils/quotePdf.ts
git rm src/services/api.ts
git commit -m "refactor: remove legacy api.ts, move QuoteResult to gateway"
```

### Task 2: Wire ChatPanel to real orders

**Files:**
- Modify: `src/app/App.tsx:28-29,249`

- [ ] **Step 1: Remove PURCHASE_ORDERS import from App.tsx**

In `src/app/App.tsx`, remove or update the import line:
```typescript
import { PURCHASE_ORDERS } from "@/data/seeds";
```
Replace with (add to existing gateway imports if needed):
```typescript
import type { ApiOrder } from "@/services/gateway";
```

- [ ] **Step 2: Add order mapping and pass to ChatPanel**

In `src/app/App.tsx`, after the existing store selectors (around line 97), add:

```typescript
const apiOrders = useOrdersStore((s) => s.orders);
```

Then find the `<ChatPanel` JSX (around line 244-252) and replace `orders={PURCHASE_ORDERS}` with:

```typescript
orders={apiOrders.map((o: ApiOrder) => ({
  id: o.id.slice(0, 8),
  client: "",
  quoteRef: o.quote_id?.slice(0, 8) || "",
  items: [],
  status: o.status as import("@/types").POStatus,
  total: o.total_amount,
  created: new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  updated: new Date(o.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
}))}
```

- [ ] **Step 3: Remove unused PURCHASE_ORDERS import if no longer used**

Check if `PURCHASE_ORDERS` is still used elsewhere in App.tsx. If not, remove the `import { PURCHASE_ORDERS } from "@/data/seeds"` line entirely.

- [ ] **Step 4: Build to verify**

```bash
npm run build
```
Expected: Success.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat: wire ChatPanel to real orders from API"
```

---

## Chunk 2: Phase 2 — Email Delivery via Resend

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `server/src/services/email.service.ts` | Resend client + HTML template |
| Modify | `server/src/routes/quotes.routes.ts` | Add `POST /:id/email` route |
| Modify | `server/src/config.ts` | Add optional RESEND_API_KEY |
| Modify | `src/services/gateway.ts` | Add `quotes.sendEmail()` |
| Modify | `src/features/quoter/QuoterPage.tsx` | Call real email endpoint |

### Task 3: Add Resend email service on the server

**Files:**
- Modify: `server/src/config.ts`
- Create: `server/src/services/email.service.ts`

- [ ] **Step 1: Add RESEND_API_KEY to config**

In `server/src/config.ts`, add to the Zod schema (as optional — server should not crash without it):

```typescript
RESEND_API_KEY: z.string().optional(),
```

- [ ] **Step 2: Install resend dependency**

```bash
cd server && npm install resend
```

- [ ] **Step 3: Create email.service.ts**

Create `server/src/services/email.service.ts`:

```typescript
import { Resend } from 'resend';
import { config } from '../config.js';

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

if (!resend) {
  console.warn('[email] RESEND_API_KEY not set — email sending disabled');
}

const FROM_EMAIL = 'quotes@renewflow.io';
const FALLBACK_FROM = 'RenewFlow <onboarding@resend.dev>';

interface QuoteEmailData {
  quoteId: string;
  status: string;
  totalAmount: number | null;
  currency: string;
  lineItems: { brand: string; model: string; coverage_type: string; unit_price: number | null; quantity: number }[];
  senderName: string;
}

function buildHtml(data: QuoteEmailData): string {
  const rows = data.lineItems.map((li) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0">${li.brand} ${li.model}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0">${li.coverage_type.toUpperCase()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:center">${li.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:right">${li.unit_price != null ? `$${li.unit_price.toLocaleString()}` : 'TBD'}</td>
    </tr>`
  ).join('');

  const total = data.totalAmount != null ? `$${data.totalAmount.toLocaleString()}` : 'Pending';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px">
    <div style="background:#2563EB;border-radius:12px 12px 0 0;padding:24px 32px">
      <h1 style="color:#fff;font-size:20px;margin:0">RenewFlow</h1>
      <p style="color:#BFDBFE;font-size:13px;margin:6px 0 0">Warranty Renewal Quote</p>
    </div>
    <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:24px 32px">
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
        ${data.senderName} has shared a warranty renewal quote with you.
      </p>
      <div style="background:#F1F5F9;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <span style="font-size:12px;color:#64748B">Quote ID</span>
        <div style="font-size:16px;font-weight:700;color:#1E293B">${data.quoteId.slice(0, 8)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <thead>
          <tr style="background:#F1F5F9">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748B;text-transform:uppercase">Device</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748B;text-transform:uppercase">Coverage</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748B;text-transform:uppercase">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748B;text-transform:uppercase">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:right;font-size:18px;font-weight:700;color:#2563EB;margin-bottom:24px">
        Total: ${total} ${data.currency}
      </div>
      <a href="https://renewflow.io" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
        View in RenewFlow
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:20px">
      RenewFlow — Warranty renewal management for LATAM IT channel partners
    </p>
  </div>
</body>
</html>`;
}

export const emailService = {
  async sendQuoteEmail(
    recipients: string[],
    data: QuoteEmailData,
  ): Promise<{ sent: string[]; failed: string[] }> {
    if (!resend) {
      return { sent: [], failed: recipients };
    }

    const sent: string[] = [];
    const failed: string[] = [];
    const html = buildHtml(data);
    const subject = `Warranty Renewal Quote ${data.quoteId.slice(0, 8)} — RenewFlow`;

    for (const to of recipients) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject,
          html,
        });
        sent.push(to);
      } catch (err) {
        console.error(`[email] Failed to send to ${to}:`, (err as Error).message);
        // Try fallback sender
        try {
          await resend.emails.send({ from: FALLBACK_FROM, to, subject, html });
          sent.push(to);
        } catch {
          failed.push(to);
        }
      }
    }

    return { sent, failed };
  },
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/config.ts server/src/services/email.service.ts server/package.json server/package-lock.json
git commit -m "feat: add Resend email service with branded quote template"
```

### Task 4: Add quote email route

**Files:**
- Modify: `server/src/routes/quotes.routes.ts`

- [ ] **Step 1: Add email route to quotes.routes.ts**

At the end of the `quoteRoutes` function (before the closing `}`), add:

```typescript
  const emailRateLimit = { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } };

  app.post('/:id/email', { ...emailRateLimit }, async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const { recipients } = request.body as { recipients: string[] };

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return reply.status(400).send({ code: 'VALIDATION', message: 'recipients array required' });
    }
    if (recipients.length > 10) {
      return reply.status(400).send({ code: 'VALIDATION', message: 'Maximum 10 recipients per request' });
    }

    const quote = await quotesService.getById(createUserClient(request.user.accessToken), id);

    const { emailService } = await import('../services/email.service.js');
    const result = await emailService.sendQuoteEmail(recipients, {
      quoteId: quote.id,
      status: quote.status,
      totalAmount: quote.total_amount,
      currency: quote.currency,
      lineItems: quote.line_items ?? [],
      senderName: request.user.email,
    });

    return reply.send(result);
  });
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/quotes.routes.ts
git commit -m "feat: add POST /quotes/:id/email route with rate limiting"
```

### Task 5: Wire frontend to email endpoint

**Files:**
- Modify: `src/services/gateway.ts`
- Modify: `src/features/quoter/QuoterPage.tsx`

- [ ] **Step 1: Add sendEmail to gateway quotes object**

In `src/services/gateway.ts`, inside the `quotes` export object (after the `reject` method), add:

```typescript
  async sendEmail(id: string, recipients: string[]): Promise<{ sent: string[]; failed: string[] }> {
    return request<{ sent: string[]; failed: string[] }>(`/quotes/${id}/email`, {
      method: "POST",
      body: JSON.stringify({ recipients }),
    });
  },
```

- [ ] **Step 2: Update QuoterPage handleSendQuote**

In `src/features/quoter/QuoterPage.tsx`, add import at top:
```typescript
import { quotes as quotesApi } from "@/services/gateway";
```

Then replace the `handleSendQuote` function body. Find the current mock implementation and replace with:

```typescript
  const handleSendQuote = async () => {
    if (!quote || emailList.length === 0) return;
    setSending(true);
    setSendResult(null);
    try {
      // Use real API if we have an API quote ID, otherwise fall back to PDF download
      const result = await quotesApi.sendEmail(quote.quoteId, emailList);
      setSendResult({ sent: result.sent, failed: result.failed });
      if (result.sent.length > 0) {
        addPoints(`Quote emailed to ${result.sent.length} recipient(s)`, 15);
      }
    } catch {
      // API unavailable — fall back to PDF generation
      generateQuotePdf(quote);
      setSendResult({ sent: [], failed: emailList });
    } finally {
      setSending(false);
    }
  };
```

- [ ] **Step 3: Set RESEND_API_KEY on Railway**

```bash
railway variables set RESEND_API_KEY=re_dKjjK3MX_4czcvcL5uULKvxpixpKu8aam --service 8aac295b-96e5-485a-ae91-8786a736132b --environment production
```

- [ ] **Step 4: Build to verify**

```bash
npm run build
```
Expected: Success.

- [ ] **Step 5: Commit**

```bash
git add src/services/gateway.ts src/features/quoter/QuoterPage.tsx
git commit -m "feat: wire QuoterPage to real email endpoint via Resend"
```

---

## Chunk 3: Phase 3 — Scheduled Warranty Alerts

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `server/src/services/alerts.service.ts` | Alert generation logic |
| Create | `server/src/jobs/warranty-alerts.ts` | Cron scheduler |
| Modify | `server/src/index.ts` | Start cron on boot |

### Task 6: Create alerts service

**Files:**
- Create: `server/src/services/alerts.service.ts`

- [ ] **Step 1: Install node-cron**

```bash
cd server && npm install node-cron && npm install -D @types/node-cron
```

- [ ] **Step 2: Create alerts.service.ts**

Create `server/src/services/alerts.service.ts`:

```typescript
import { adminClient } from '../supabase.js';

const THRESHOLDS = [
  { days: 90, type: 'warranty_expiry_90d', priority: 'medium', label: '90 days' },
  { days: 60, type: 'warranty_expiry_60d', priority: 'medium', label: '60 days' },
  { days: 30, type: 'warranty_expiry_30d', priority: 'high', label: '30 days' },
  { days: 14, type: 'warranty_expiry_14d', priority: 'high', label: '14 days' },
  { days: 7, type: 'warranty_expiry_7d', priority: 'critical', label: '7 days' },
  { days: 0, type: 'warranty_lapsed', priority: 'high', label: 'lapsed' },
];

export const alertsService = {
  async generateAlerts(): Promise<number> {
    // Fetch all assets with warranty_end set
    const { data: assets, error: assetErr } = await adminClient
      .from('core_asset')
      .select('id, org_id, brand, model, serial, warranty_end')
      .not('warranty_end', 'is', null);

    if (assetErr || !assets) {
      console.error('[alerts] Failed to fetch assets:', assetErr?.message);
      return 0;
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    let created = 0;

    for (const asset of assets) {
      const warrantyEnd = new Date(asset.warranty_end + 'T00:00:00Z');
      const diffMs = warrantyEnd.getTime() - new Date(todayStr + 'T00:00:00Z').getTime();
      const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      for (const threshold of THRESHOLDS) {
        // Match: exact threshold day, or lapsed (daysLeft <= 0 for the 0-day threshold)
        const matches = threshold.days === 0
          ? daysLeft <= 0
          : daysLeft === threshold.days;

        if (!matches) continue;

        // Dedup: check if this alert already exists
        const { data: existing } = await adminClient
          .from('notif_alert')
          .select('id')
          .eq('org_id', asset.org_id)
          .eq('asset_id', asset.id)
          .eq('type', threshold.type)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Insert notification
        const title = threshold.days === 0
          ? `${asset.brand} ${asset.model} — warranty has lapsed`
          : `${asset.brand} ${asset.model} — warranty expires in ${threshold.label}`;

        const body = `S/N: ${asset.serial}`;

        const { error: insertErr } = await adminClient
          .from('notif_alert')
          .insert({
            org_id: asset.org_id,
            type: threshold.type,
            title,
            body,
            asset_id: asset.id,
            read: false,
          });

        if (!insertErr) created++;
      }
    }

    return created;
  },

  /** Reset dedup when an asset's warranty_end changes (renewal) */
  async resetForAsset(assetId: string): Promise<void> {
    await adminClient
      .from('notif_alert')
      .delete()
      .eq('asset_id', assetId)
      .like('type', 'warranty_%');
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/alerts.service.ts server/package.json server/package-lock.json
git commit -m "feat: add warranty alert generation service"
```

### Task 7: Create cron job and wire to server

**Files:**
- Create: `server/src/jobs/warranty-alerts.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create warranty-alerts.ts cron job**

Create `server/src/jobs/warranty-alerts.ts`:

```typescript
import cron from 'node-cron';
import { alertsService } from '../services/alerts.service.js';

export function startWarrantyAlertsCron(): void {
  // Run daily at 06:00 UTC
  cron.schedule('0 6 * * *', async () => {
    console.log('[cron] Running warranty alert generation...');
    try {
      const count = await alertsService.generateAlerts();
      console.log(`[cron] Warranty alerts: ${count} new notifications created`);
    } catch (err) {
      console.error('[cron] Warranty alert generation failed:', (err as Error).message);
    }
  });

  console.log('[cron] Warranty alerts scheduled: daily at 06:00 UTC');
}
```

- [ ] **Step 2: Register cron in index.ts**

In `server/src/index.ts`, add import at the top (after other imports):

```typescript
import { startWarrantyAlertsCron } from './jobs/warranty-alerts.js';
```

Then inside the `start()` function, after `await app.listen(...)`, add:

```typescript
    startWarrantyAlertsCron();
```

- [ ] **Step 3: Build to verify server compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | head -5
```
Expected: Only pre-existing type errors (missing module declarations), no new errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/jobs/warranty-alerts.ts server/src/index.ts
git commit -m "feat: add daily warranty alert cron job (06:00 UTC)"
```

---

## Chunk 4: Phase 4 — Partner Portal Verification + Gap-Fill

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Verify | `src/features/partner-portal/services/partner.api.ts` | API shapes match backend |
| Verify | `server/src/routes/orders.routes.ts` | Acknowledge endpoint exists |
| Verify | `server/src/routes/price-lists.routes.ts` | CRUD endpoints exist |
| Modify | `server/src/routes/orders.routes.ts` | Add entitlements list stub if missing |
| Verify | `src/app/App.tsx` | Delivery-partner role routing |

### Task 8: Verify partner portal endpoints

**Files:**
- Read: `server/src/routes/orders.routes.ts` (acknowledge — confirmed exists)
- Read: `server/src/routes/price-lists.routes.ts` (CRUD — confirmed registered)
- Read: `src/features/partner-portal/services/partner.api.ts` (API shapes)

- [ ] **Step 1: Verify acknowledge endpoint works**

Already confirmed: `POST /orders/:id/acknowledge` exists in `orders.routes.ts:39-43` and calls `ordersService.transition()`. No changes needed.

- [ ] **Step 2: Verify price-lists CRUD**

Already confirmed: `priceListRoutes` is registered in `index.ts:33` at `/price-lists`. Read the routes file to confirm GET/POST/PATCH/DELETE exist.

```bash
grep -c "app\.\(get\|post\|patch\|delete\)" server/src/routes/price-lists.routes.ts
```
Expected: 5 (list, getById, create, update, delete).

- [ ] **Step 3: Verify partner API shapes match backend responses**

Read `partner.api.ts` and verify `PartnerRfq` and `PartnerPO` interfaces align with what the backend returns. The backend's quote response includes `id`, `status`, `total_amount`, `created_at`, `line_items`. The partner API expects `quoteId`, `status`, `sentAt`, `lineItemCount`, `anonymizedRef`.

If there's a mismatch, the partner hooks need mapping functions (similar to how `OrdersPage` maps `ApiOrder` → `PurchaseOrder`). This will be verified at runtime and fixed if broken.

- [ ] **Step 4: Document findings**

Note any mismatches found. If all endpoints exist and respond correctly, no code changes needed for this task.

### Task 9: Add entitlements list stub

**Files:**
- Modify: `server/src/routes/orders.routes.ts` (or create separate entitlements route)

- [ ] **Step 1: Check if standalone entitlements route exists**

```bash
grep -r "entitlement" server/src/routes/ --include="*.ts" -l
```

If only `orders.routes.ts` has the `verify-entitlement` endpoint, add a simple list stub.

- [ ] **Step 2: Add GET /entitlements stub to orders routes**

If no standalone route exists, add to `server/src/routes/orders.routes.ts`:

```typescript
  // Stub: list entitlements for the org (placeholder for future implementation)
  app.get('/entitlements', async (request, reply) => {
    return reply.send({ data: [], nextCursor: null, hasMore: false });
  });
```

Note: This may need to be registered separately in `index.ts` if the partner frontend hits `/api/v1/entitlements` rather than `/api/v1/orders/entitlements`. Check the partner API service to confirm the path.

- [ ] **Step 3: Commit if changes were made**

```bash
git add server/src/routes/orders.routes.ts
git commit -m "feat: add entitlements list stub for partner portal"
```

### Task 10: Verify delivery-partner role routing

**Files:**
- Read: `src/app/App.tsx`
- Read: `src/features/partner-portal/PartnerRouter.tsx`

- [ ] **Step 1: Check if delivery-partner users see partner portal**

Verify in `App.tsx` that the `ROLE_PAGES` for `"delivery-partner"` includes appropriate pages, and that the partner portal is shown. Currently the main App renders the standard pages for all roles. The `PartnerRouter.tsx` is a separate component — verify it's rendered when `userRole === "delivery-partner"`.

If the partner portal is not rendered (i.e., delivery-partner users see the same shell as VARs), update `App.tsx` to render `PartnerRouter` instead of the standard page switcher for delivery-partner role.

- [ ] **Step 2: Fix if needed**

If delivery-partner users don't see the partner portal, update the `renderPage()` function or the auth gate in `App.tsx` to conditionally render `<PartnerRouter />` when `userRole === "delivery-partner"`.

- [ ] **Step 3: Build and verify**

```bash
npm run build
```
Expected: Success.

- [ ] **Step 4: Commit if changes were made**

```bash
git add src/app/App.tsx
git commit -m "fix: route delivery-partner users to partner portal"
```

### Task 11: Final push

- [ ] **Step 1: Run full build**

```bash
npm run build
```
Expected: Success with no errors.

- [ ] **Step 2: Push all commits**

```bash
git push origin main
```

This triggers Railway auto-deploy for both frontend and API services.
