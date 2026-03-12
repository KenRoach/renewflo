# RenewFlow Next Phase Design — Backend API, Supabase Schema, Partner Portal

**Date:** 2026-03-11
**Status:** Draft
**Author:** Kenneth Roach + Claude

---

## 1. Overview

RenewFlow is an AI-native warranty renewal management platform for LATAM IT resellers. It brokers between VARs (Value-Added Resellers) and Delivery Partners (Dell Direct, ServiceNet LATAM, etc.). VARs never interact with delivery partners directly — RenewFlow is the operational middleman.

This spec covers the next phase: wiring up the existing frontend MVP scaffold with a production backend, database schema, and a new delivery partner portal.

### Subsystems (in build order)

1. **Supabase Schema** — PostgreSQL tables, RLS policies, auth
2. **Backend API** — Fastify service layer on Railway
3. **Partner Portal** — Delivery partner-facing UI

### Hosting

- **Supabase** — Database (PostgreSQL), Auth, Row Level Security
- **Railway** — Fastify API server, React frontend (static build)

---

## 2. Users & Tenancy

### Three user types

| Type | org_type | What they do |
|------|----------|-------------|
| **VAR** | `var` | Import assets, request quotes, submit POs, track renewals |
| **RenewFlow Operator** | `operator` | Broker between VARs and partners, review POs, verify entitlements |
| **Delivery Partner** | `delivery_partner` | Maintain price lists, respond to RFQs, acknowledge POs, provision entitlements |

### Tenant isolation

- **Isolated tenants** — each VAR sees only their own data
- **Operators see everything** across all VARs and partners
- **Partners see only** POs routed to them and their own price lists/RFQs
- Enforced via Supabase Row Level Security with `org_id` on every data table

### Auth

- Supabase Auth (email/password, magic links)
- JWT includes `org_id` and custom claims
- Helper function `auth.org_type()` reads org type from JWT for RLS policies

---

## 3. Supabase Schema

### Approach: Flat schema with naming conventions

Single `public` schema. Tables prefixed by domain: `core_*`, `asset_*`, `quote_*`, `order_*`, `support_*`, `notif_*`. Full Supabase compatibility, clear domain boundaries, simple migrations.

### 3.1 Core Domain (core_*)

#### core_organization

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | |
| type | text NOT NULL | `var`, `operator`, `delivery_partner` |
| country | text | |
| industry | text | |
| billing_email | text | |
| created_at | timestamptz | DEFAULT now() |

#### core_user

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | = Supabase auth.users.id |
| org_id | uuid FK → core_organization | |
| email | text NOT NULL UNIQUE | |
| full_name | text | |
| role | text NOT NULL | `admin`, `member`, `viewer` |
| active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |

#### core_contact

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK → core_organization | |
| name | text NOT NULL | |
| email | text | |
| phone | text | |
| role | text | Job title / function |
| is_primary | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |

### 3.2 Asset Domain (asset_*)

#### asset_import_batch

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| uploaded_by | uuid FK → core_user | |
| file_name | text | |
| row_count | integer | |
| status | text | `processing`, `completed`, `failed` |
| error_summary | jsonb | Nullable, validation errors |
| created_at | timestamptz | DEFAULT now() |

#### asset_item

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| import_batch_id | uuid FK → asset_import_batch | Nullable |
| brand | text NOT NULL | |
| model | text NOT NULL | |
| serial | text NOT NULL | |
| device_type | text | |
| tier | text NOT NULL | `critical`, `standard`, `low-use`, `eol` |
| warranty_end | date NOT NULL | |
| purchase_date | date | |
| status | text NOT NULL | See asset status enum below |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**UNIQUE constraint:** `(org_id, serial)` — no duplicate serials within an org.

**Computed (not stored):** `daysLeft = warranty_end - CURRENT_DATE`

**Asset statuses:** `discovered`, `alerted-90`, `alerted-60`, `alerted-30`, `alerted-14`, `alerted-7`, `quoted`, `tpm-approved`, `oem-approved`, `fulfilled`, `lost`, `lapsed`

### 3.3 Quoting Domain (quote_*)

#### quote_request

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | VAR's org |
| requested_by | uuid FK → core_user | |
| status | text NOT NULL | `draft`, `pending`, `pricing`, `rfq_pending`, `priced`, `accepted`, `requote`, `expired`, `rejected` |
| version | integer NOT NULL | DEFAULT 1, increments on requote |
| expires_at | timestamptz | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### quote_line_item

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| quote_id | uuid FK → quote_request | |
| org_id | uuid FK → core_organization | Denormalized from quote_request for flat RLS |
| asset_id | uuid FK → asset_item | |
| coverage_type | text NOT NULL | `tpm`, `oem` |
| duration_months | integer NOT NULL | |
| unit_price | numeric(12,2) | Nullable — populated during pricing/RFQ phase |
| quantity | integer NOT NULL | DEFAULT 1 |
| partner_id | uuid FK → core_organization | Nullable — populated during pricing/RFQ phase |
| source | text NOT NULL | `price_list`, `rfq` |
| version | integer NOT NULL | Matches parent quote version |
| updated_at | timestamptz | DEFAULT now() |

#### quote_price_list

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| partner_id | uuid FK → core_organization | |
| brand | text NOT NULL | |
| model_pattern | text NOT NULL | Wildcard matching, e.g. `PowerEdge R7*` |
| coverage_type | text NOT NULL | `tpm`, `oem` |
| duration_months | integer NOT NULL | |
| unit_price | numeric(12,2) NOT NULL | |
| valid_from | date NOT NULL | |
| valid_until | date NOT NULL | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### quote_rfq

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| quote_id | uuid FK → quote_request | |
| partner_id | uuid FK → core_organization | |
| status | text NOT NULL | `sent`, `responded`, `expired`, `declined` |
| sent_at | timestamptz | |
| responded_at | timestamptz | |
| notes | text | Partner's notes on response |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### 3.4 Order Domain (order_*)

#### order_po

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | VAR's org |
| quote_id | uuid FK → quote_request | |
| submitted_by | uuid FK → core_user | |
| partner_id | uuid FK → core_organization | Delivery partner |
| status | text NOT NULL | `submitted`, `under_review`, `approved`, `routed`, `acknowledged`, `entitlement_verified`, `completed`, `cancelled` |
| total | numeric(12,2) NOT NULL | |
| vendor_po_ref | text | Partner's PO reference |
| reviewed_by | uuid FK → core_user | Operator who reviewed |
| reviewed_at | timestamptz | |
| routed_at | timestamptz | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### order_line_item

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| po_id | uuid FK → order_po | |
| org_id | uuid FK → core_organization | Denormalized from order_po for flat RLS |
| partner_id | uuid FK → core_organization | Denormalized from order_po for flat RLS |
| asset_id | uuid FK → asset_item | |
| coverage_type | text NOT NULL | |
| duration_months | integer NOT NULL | Copied from accepted quote line item |
| unit_price | numeric(12,2) NOT NULL | |
| quantity | integer NOT NULL | DEFAULT 1 |

#### order_entitlement

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| po_id | uuid FK → order_po | |
| org_id | uuid FK → core_organization | Denormalized from order_po for flat RLS |
| partner_id | uuid FK → core_organization | Denormalized from order_po for flat RLS |
| asset_id | uuid FK → asset_item | |
| entitlement_id | text | External ID from delivery partner |
| coverage_start | date NOT NULL | |
| coverage_end | date NOT NULL | |
| verified_by | uuid FK → core_user | Operator |
| verified_at | timestamptz | |
| created_at | timestamptz | DEFAULT now() |

### 3.5 Support Domain (support_*)

#### support_ticket

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | Reporter's org |
| partner_id | uuid FK → core_organization | Nullable — set when partner creates ticket or ticket is PO-related |
| asset_id | uuid FK → asset_item | Nullable |
| po_id | uuid FK → order_po | Nullable |
| reported_by | uuid FK → core_user | |
| assignee | uuid FK → core_user | Nullable |
| subject | text NOT NULL | |
| description | text | |
| status | text NOT NULL | `open`, `in_progress`, `escalated`, `resolved` |
| priority | text NOT NULL | `critical`, `high`, `medium`, `low` |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### 3.6 Notification Domain (notif_*)

#### notif_alert

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| user_id | uuid FK → core_user | Nullable (org-wide alerts) |
| asset_id | uuid FK → asset_item | Nullable |
| quote_id | uuid FK → quote_request | Nullable |
| po_id | uuid FK → order_po | Nullable |
| type | text NOT NULL | `warranty_expiry`, `quote_update`, `po_status`, `entitlement`, `rfq_received`, `system` |
| title | text NOT NULL | |
| body | text | |
| read | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### notif_email_log

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| alert_id | uuid FK → notif_alert | Nullable |
| to_email | text NOT NULL | |
| subject | text NOT NULL | |
| status | text NOT NULL | `queued`, `sent`, `failed` |
| sent_at | timestamptz | |
| error | text | |
| created_at | timestamptz | DEFAULT now() |

### 3.7 Audit

#### audit_status_change

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| table_name | text NOT NULL | e.g. `quote_request`, `order_po` |
| record_id | uuid NOT NULL | |
| old_status | text | |
| new_status | text NOT NULL | |
| changed_by | uuid FK → core_user | |
| notes | text | |
| created_at | timestamptz | DEFAULT now() |

### 3.8 Recommended Indexes

| Table | Index | Rationale |
|-------|-------|-----------|
| asset_item | `(org_id, warranty_end)` | Dashboard queries, cron warranty scan |
| asset_item | `(org_id, status)` | Filter by pipeline stage |
| quote_request | `(org_id, status)` | VAR quote listing |
| quote_line_item | `(quote_id, version)` | Quote detail with version filtering |
| quote_price_list | `(partner_id, brand, coverage_type)` | Price list lookup |
| quote_rfq | `(partner_id, status)` | Partner RFQ inbox |
| order_po | `(org_id, status)` | VAR order listing |
| order_po | `(partner_id, status)` | Partner PO listing |
| support_ticket | `(org_id, status)` | Ticket listing |
| notif_alert | `(org_id, read, created_at)` | Unread alerts sorted by time |
| audit_status_change | `(table_name, record_id)` | Audit trail lookup |

---

## 4. Row Level Security

### Helper function

```sql
CREATE FUNCTION auth.org_type() RETURNS text AS $$
  SELECT type FROM core_organization
  WHERE id = (auth.jwt()->>'org_id')::uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Policy matrix

| Table | VAR | Operator | Delivery Partner |
|-------|-----|----------|-----------------|
| core_organization | Own org | All | Own org |
| core_user | Own org | All | Own org |
| core_contact | Own org | All | No access |
| asset_item | Own org | All | No access |
| asset_import_batch | Own org | All | No access |
| quote_request | Own org | All | Quotes with an RFQ for their org (SELECT only) |
| quote_line_item | Own org (via org_id) | All | Own org (via partner_id) |
| quote_price_list | No access | All | Own org (CRUD) |
| quote_rfq | No access | All | Own org (respond) |
| order_po | Own org | All | partner_id match |
| order_line_item | Own org (via org_id) | All | Own org (via partner_id) |
| order_entitlement | Own org (via org_id) | All | Own org (via partner_id) |
| support_ticket | Own org | All | Own org OR partner_id match |
| notif_alert | Own org | All | Own org |
| notif_email_log | No access | All | No access |
| audit_status_change | No access | All | No access |

### Implementation patterns

```sql
-- Pattern 1: Standard org-scoped (e.g., asset_item)
CREATE POLICY "asset_item_select" ON asset_item FOR SELECT USING (
  auth.org_type() = 'operator'
  OR org_id = (auth.jwt()->>'org_id')::uuid
);

-- Pattern 2: Dual-org with partner_id (e.g., order_po, order_line_item)
CREATE POLICY "order_po_select" ON order_po FOR SELECT USING (
  auth.org_type() = 'operator'
  OR org_id = (auth.jwt()->>'org_id')::uuid
  OR partner_id = (auth.jwt()->>'org_id')::uuid
);

-- Pattern 3: Join-based (e.g., quote_request for partners)
CREATE POLICY "quote_request_select" ON quote_request FOR SELECT USING (
  auth.org_type() = 'operator'
  OR org_id = (auth.jwt()->>'org_id')::uuid
  OR id IN (SELECT quote_id FROM quote_rfq
            WHERE partner_id = (auth.jwt()->>'org_id')::uuid)
);

-- Pattern 4: Dual-org with partner_id (e.g., support_ticket)
CREATE POLICY "support_ticket_select" ON support_ticket FOR SELECT USING (
  auth.org_type() = 'operator'
  OR org_id = (auth.jwt()->>'org_id')::uuid
  OR partner_id = (auth.jwt()->>'org_id')::uuid
);
```

**Denormalization rationale:** `org_id` and `partner_id` are denormalized onto child tables (`quote_line_item`, `order_line_item`, `order_entitlement`) to enable flat RLS policies without subquery joins. This trades slight write-time overhead for significantly faster reads.

---

## 5. Status Machines

### 5.1 Quote Status Flow

```
draft → pending → pricing → priced → accepted
                     ↓          ↑
                rfq_pending     │
                     ↓          │
                  (partner      │
                   responds) ───┘

accepted → READY FOR PO

priced → requote → pricing (version++)

Any state → expired (pg_cron daily)
Any state → rejected (VAR)
```

**Transitions enforced by:** Service layer (primary) + DB check constraint (safety net)

**Quote versioning:** On `requote`, `version` increments. Previous line items preserved with their version number. New pricing round starts fresh.

**Expiry:** `pg_cron` daily job checks `expires_at` and moves stale quotes to `expired`.

### 5.2 PO Status Flow

```
submitted → under_review → approved → routed → acknowledged → entitlement_verified → completed

Any pre-completed state → cancelled (operator)
```

**Linear flow, no negotiation.** Quote pricing is already locked when PO is created.

**Key transitions:**
- `submitted → under_review`: Operator picks up
- `approved → routed`: Operator sends to delivery partner
- `routed → acknowledged`: Partner confirms receipt
- `acknowledged → entitlement_verified`: Operator confirms coverage is active
- `entitlement_verified → completed`: VAR notified "good to go"

### 5.3 Asset Status Flow

```
discovered → alerted-90 → alerted-60 → alerted-30 → alerted-14 → alerted-7 → lapsed
                                                                                  │
Any alerted-* state → quoted (when included in a quote request)                   │
quoted → tpm-approved | oem-approved (when quote accepted)                        │
tpm-approved | oem-approved → fulfilled (when PO completed)                       │
                                                                                  │
Any state → lost (VAR manually marks asset as decommissioned/sold)                │
discovered → lapsed (warranty_end passes with no action) ─────────────────────────┘
```

**Transitions:**
- `discovered → alerted-*`: Automated by pg_cron warranty expiry job. Only moves forward (90→60→30→14→7), never backward.
- `alerted-* → quoted`: Triggered when asset is added to a quote_request.
- `quoted → tpm-approved/oem-approved`: Triggered when the quote is accepted, based on coverage_type.
- `approved → fulfilled`: Triggered when the PO reaches `completed` status.
- **Warranty date correction:** If `warranty_end` is updated and the computed `daysLeft` changes bracket, the next cron run will update status to the correct `alerted-*` value (forward or backward).

### 5.4 Audit

Every status change on `quote_request` and `order_po` inserts a row into `audit_status_change` with who, when, old/new status, and optional notes.

---

## 6. Backend API

### Stack

- **Fastify** on Node.js 20+, TypeScript
- **Hosted on Railway**
- **Supabase client** for database access (respects RLS)
- **Zod** for request validation

### Architecture

```
Route (validation + auth) → Service (business logic) → Repository (Supabase client)
```

- **Routes** — Fastify handlers. Validate with Zod. Extract `org_id`, `org_type`, `user_id` from JWT.
- **Services** — Business logic. Status transitions, pricing computation, RFQ orchestration.
- **Repositories** — Thin Supabase wrappers. Standard queries go through RLS. Cross-org operator queries use service role key.

### Route Groups

| Prefix | Access | Key Endpoints |
|--------|--------|--------------|
| `POST /auth/signup` | Public | Create account + org |
| `POST /auth/login` | Public | Get JWT |
| `POST /auth/forgot-password` | Public | Password reset flow |
| `GET /assets` | VAR, Operator | List assets (paginated, filterable) |
| `POST /assets/import` | VAR, Operator | Multipart CSV upload, parse, validate, bulk insert |
| `GET /assets/:id` | VAR, Operator | Single asset with computed daysLeft |
| `PATCH /assets/:id` | VAR, Operator | Update asset |
| `DELETE /assets/:id` | VAR, Operator | Remove asset |
| `POST /quotes` | VAR | Create quote request (draft) |
| `GET /quotes` | VAR, Operator | List quotes |
| `GET /quotes/:id` | VAR, Operator, Partner | Quote detail with line items |
| `POST /quotes/:id/submit` | VAR | Submit draft for pricing |
| `POST /quotes/:id/requote` | VAR | Request re-pricing (version++) |
| `POST /quotes/:id/accept` | VAR | Accept quoted price |
| `POST /quotes/:id/reject` | VAR | Reject quote |
| `POST /quotes/:id/rfq/send` | Operator | Send RFQ to partner(s) |
| `POST /quotes/:id/rfq/respond` | Partner | Submit pricing response |
| `GET /price-lists` | Partner, Operator | List price entries |
| `POST /price-lists` | Partner | Add price list entry |
| `PATCH /price-lists/:id` | Partner | Update entry |
| `DELETE /price-lists/:id` | Partner | Remove entry |
| `POST /price-lists/lookup` | Operator | Match assets against price lists |
| `POST /orders` | VAR | Create PO from accepted quote |
| `GET /orders` | VAR, Operator, Partner | List POs |
| `GET /orders/:id` | VAR, Operator, Partner | PO detail |
| `POST /orders/:id/review` | Operator | Mark under review |
| `POST /orders/:id/approve` | Operator | Approve PO |
| `POST /orders/:id/route` | Operator | Route to delivery partner |
| `POST /orders/:id/acknowledge` | Partner | Confirm receipt |
| `POST /orders/:id/verify-entitlement` | Operator | Confirm coverage active |
| `POST /orders/:id/complete` | Operator | Mark completed, notify VAR |
| `POST /orders/:id/cancel` | Operator | Cancel PO |
| `GET /support` | All | List tickets |
| `POST /support` | All | Create ticket |
| `GET /support/:id` | All | Ticket detail |
| `PATCH /support/:id` | All | Update ticket |
| `POST /support/:id/escalate` | All | Escalate ticket |
| `GET /notifications` | All | List alerts |
| `PATCH /notifications/:id/read` | All | Mark read |
| `POST /notifications/mark-all-read` | All | Mark all read |
| `GET /orgs` | Operator | List all organizations |
| `GET /orgs/:id` | Operator | Org detail |
| `PATCH /orgs/:id` | Operator | Update org |
| `GET /users` | Admin, Operator | List users in org (or all for operator) |
| `POST /users/invite` | Admin, Operator | Invite user |
| `PATCH /users/:id` | Admin, Operator | Update user |
| `DELETE /users/:id` | Admin, Operator | Deactivate user |
| `POST /chat/message` | VAR, Operator | Proxy to Anthropic API |

### Key design decisions

- **Status transitions in services, not DB triggers** — easier to test, debug, extend. DB constraints as safety net only.
- **Chat proxy** — moves Anthropic API key server-side. Frontend calls `/api/v1/chat/message`.
- **Email delivery** — triggered by service layer after status changes. Resend or Supabase Edge Functions.
- **CSV import** — multipart upload to `/assets/import`, parsed server-side with SheetJS, validated, bulk-inserted.
- **Pagination** — cursor-based on all list endpoints. Default 50 items.

---

## 7. Partner Portal

### Purpose

Self-service portal for delivery partners. Replaces Phase 1 email-based PO flow. Same React + Vite codebase, role-based routing by `org_type`.

### Pages

| Page | Description |
|------|-------------|
| **Dashboard** | KPIs: pending RFQs, active POs, monthly revenue, avg response time. Urgency alerts. Recent PO table. |
| **RFQ Inbox** | List of pending RFQs with urgency indicators. Click into RFQ to enter per-item pricing, add notes, submit or decline. |
| **Price Lists** | CRUD for standard pricing entries. CSV import/export. Model pattern matching with wildcards (`PowerEdge R7*`). Validity date ranges. |
| **Active POs** | POs routed to this partner. Acknowledge receipt, track fulfillment progress. |
| **Entitlements** | After PO fulfilled, enter entitlement IDs and coverage dates. RenewFlow operator verifies. |
| **Reports** | Phase 3: historical performance data, revenue trends, SLA metrics. |

### Access control

- Gated by `org_type = 'delivery_partner'` in the frontend router
- All data access through the same Fastify API, enforced by RLS
- Partners cannot see VAR names or identities — RLS on `core_organization` blocks partner lookups of VAR orgs. POs routed to partners expose the `org_id` UUID but partners cannot resolve it to a name. API responses for partner-facing endpoints strip `org_id` and use an `anonymized_ref` (e.g., "Client-A") generated at route time.

### RFQ response flow

1. Partner sees RFQ in inbox with device list (brand, model, serial, coverage type, duration)
2. Partner enters per-item pricing + optional notes (volume discounts, lead time, etc.)
3. Partner submits pricing or declines the RFQ
4. RenewFlow operator assembles final quote from partner response(s)

### Price list matching

When an operator runs pricing for a quote:
1. System matches each asset's `brand` + `model` against `quote_price_list.model_pattern` using SQL `LIKE`
2. Filters by `coverage_type`, `duration_months`, and `valid_from <= NOW() <= valid_until`
3. If match found → auto-populates `quote_line_item` with `source = 'price_list'`
4. If no match → flags item for RFQ

---

## 8. Notification System

### Triggers

| Event | Alert type | Recipient |
|-------|-----------|-----------|
| Asset warranty ≤ 90/60/30/14/7/0 days | `warranty_expiry` | VAR users (asset owner org) |
| Quote priced | `quote_update` | VAR who requested |
| Quote requoted | `quote_update` | Operator |
| PO status change | `po_status` | VAR + relevant operator |
| PO routed to partner | `po_status` | Partner |
| Entitlement verified | `entitlement` | VAR |
| New RFQ received | `rfq_received` | Partner |

### Delivery

- **In-app:** Insert into `notif_alert`. Frontend polls or uses Supabase Realtime subscription.
- **Email:** Service layer queues email via `notif_email_log`. Background worker sends via Resend API. Tracks delivery status.

### Warranty expiry cron

`pg_cron` daily job scans `asset_item` where `warranty_end - CURRENT_DATE` hits a threshold (90, 60, 30, 14, 7, 0). Inserts `notif_alert` rows and queues emails. Updates `asset_item.status` to corresponding `alerted-*` value.

---

## 9. Out of Scope (for this phase)

- WhatsApp notifications
- OEM API integrations for asset enrichment
- Phase 3 partner API integration (programmatic PO submission)
- Rewards/gamification system backend
- SSO / SAML
- Mobile app
