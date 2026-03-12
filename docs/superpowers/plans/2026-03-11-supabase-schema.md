# RenewFlow Supabase Schema Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all PostgreSQL tables, RLS policies, indexes, and auth helpers for RenewFlow's multi-tenant warranty renewal platform on Supabase.

**Architecture:** Flat schema with domain-prefixed tables (`core_*`, `asset_*`, `quote_*`, `order_*`, `support_*`, `notif_*`, `audit_*`). Row Level Security enforces tenant isolation. Supabase Auth with custom JWT claims (`org_id`, `org_type`). Migrations managed via SQL files applied through Supabase CLI.

**Tech Stack:** PostgreSQL 15+ (Supabase), Supabase CLI, Supabase Auth, pg_cron

---

## File Structure

```
supabase/
├── config.toml                          # Supabase project config
├── migrations/
│   ├── 00001_core_tables.sql           # core_organization, core_user, core_contact
│   ├── 00002_asset_tables.sql          # asset_import_batch, asset_item
│   ├── 00003_quote_tables.sql          # quote_request, quote_line_item, quote_price_list, quote_rfq
│   ├── 00004_order_tables.sql          # order_po, order_line_item, order_entitlement
│   ├── 00005_support_tables.sql        # support_ticket
│   ├── 00006_notif_tables.sql          # notif_alert, notif_email_log
│   ├── 00007_audit_tables.sql          # audit_status_change
│   ├── 00008_indexes.sql               # All recommended indexes
│   ├── 00009_auth_helpers.sql          # auth.org_type() function, JWT claim hooks
│   ├── 00010_rls_core.sql             # RLS policies for core_* tables
│   ├── 00011_rls_asset.sql            # RLS policies for asset_* tables
│   ├── 00012_rls_quote.sql            # RLS policies for quote_* tables
│   ├── 00013_rls_order.sql            # RLS policies for order_* tables
│   ├── 00014_rls_support_notif.sql    # RLS policies for support_*, notif_* tables
│   ├── 00015_rls_audit.sql            # RLS policies for audit_* table
│   └── 00016_seed_data.sql            # Seed data for development/testing
└── seed.sql                            # Applies seed migration for local dev
tests/
└── db/
    ├── helpers.ts                      # Supabase test client factory, seed helpers
    ├── core.test.ts                    # Tests for core tables + RLS
    ├── asset.test.ts                   # Tests for asset tables + RLS
    ├── quote.test.ts                   # Tests for quote tables + RLS
    ├── order.test.ts                   # Tests for order tables + RLS
    └── support-notif.test.ts           # Tests for support + notif tables + RLS
```

---

## Chunk 1: Project Setup & Core Tables

### Task 1: Initialize Supabase project

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Install Supabase CLI**

Run: `npm install -D supabase`
Expected: Package added to devDependencies

- [ ] **Step 2: Initialize Supabase project**

Run: `npx supabase init`
Expected: Creates `supabase/` directory with `config.toml`

- [ ] **Step 3: Add db test dependencies**

Run: `npm install -D @supabase/supabase-js dotenv`
Expected: Packages added to devDependencies

- [ ] **Step 4: Commit**

```bash
git add supabase/ package.json package-lock.json
git commit -m "chore: initialize supabase project"
```

### Task 2: Create core domain tables

**Files:**
- Create: `supabase/migrations/00001_core_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00001_core_tables.sql

-- Core domain: organizations, users, contacts

CREATE TABLE core_organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('var', 'operator', 'delivery_partner')),
  country text,
  industry text,
  billing_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE core_user (
  id uuid PRIMARY KEY, -- matches auth.users.id
  org_id uuid NOT NULL REFERENCES core_organization(id),
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE core_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES core_organization(id),
  name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: Migration applied successfully, 3 tables created

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00001_core_tables.sql
git commit -m "feat: add core domain tables (organization, user, contact)"
```

### Task 3: Create asset domain tables

**Files:**
- Create: `supabase/migrations/00002_asset_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00002_asset_tables.sql

-- Asset domain: import batches and asset items

CREATE TABLE asset_import_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES core_organization(id),
  uploaded_by uuid NOT NULL REFERENCES core_user(id),
  file_name text,
  row_count integer,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  error_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE asset_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES core_organization(id),
  import_batch_id uuid REFERENCES asset_import_batch(id),
  brand text NOT NULL,
  model text NOT NULL,
  serial text NOT NULL,
  device_type text,
  tier text NOT NULL CHECK (tier IN ('critical', 'standard', 'low-use', 'eol')),
  warranty_end date NOT NULL,
  purchase_date date,
  status text NOT NULL DEFAULT 'discovered'
    CHECK (status IN (
      'discovered',
      'alerted-90', 'alerted-60', 'alerted-30', 'alerted-14', 'alerted-7',
      'quoted', 'tpm-approved', 'oem-approved',
      'fulfilled', 'lost', 'lapsed'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, serial)
);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: Migration applied, 5 tables total

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00002_asset_tables.sql
git commit -m "feat: add asset domain tables (import_batch, asset_item)"
```

### Task 4: Create quote domain tables

**Files:**
- Create: `supabase/migrations/00003_quote_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00003_quote_tables.sql

-- Quote domain: requests, line items, price lists, RFQs

CREATE TABLE quote_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES core_organization(id),
  requested_by uuid NOT NULL REFERENCES core_user(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending', 'pricing', 'rfq_pending',
      'priced', 'accepted', 'requote', 'expired', 'rejected'
    )),
  version integer NOT NULL DEFAULT 1,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quote_line_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quote_request(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES core_organization(id),
  asset_id uuid NOT NULL REFERENCES asset_item(id),
  coverage_type text NOT NULL CHECK (coverage_type IN ('tpm', 'oem')),
  duration_months integer NOT NULL,
  unit_price numeric(12,2),
  quantity integer NOT NULL DEFAULT 1,
  partner_id uuid REFERENCES core_organization(id),
  source text NOT NULL CHECK (source IN ('price_list', 'rfq')),
  version integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quote_price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES core_organization(id),
  brand text NOT NULL,
  model_pattern text NOT NULL,
  coverage_type text NOT NULL CHECK (coverage_type IN ('tpm', 'oem')),
  duration_months integer NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until >= valid_from)
);

CREATE TABLE quote_rfq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quote_request(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES core_organization(id),
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'responded', 'expired', 'declined')),
  sent_at timestamptz,
  responded_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: Migration applied, 9 tables total

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00003_quote_tables.sql
git commit -m "feat: add quote domain tables (request, line_item, price_list, rfq)"
```

### Task 5: Create order domain tables

**Files:**
- Create: `supabase/migrations/00004_order_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00004_order_tables.sql

-- Order domain: purchase orders, line items, entitlements

CREATE TABLE order_po (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES core_organization(id),
  quote_id uuid NOT NULL REFERENCES quote_request(id),
  submitted_by uuid NOT NULL REFERENCES core_user(id),
  partner_id uuid NOT NULL REFERENCES core_organization(id),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'submitted', 'under_review', 'approved', 'routed',
      'acknowledged', 'entitlement_verified', 'completed', 'cancelled'
    )),
  total numeric(12,2) NOT NULL,
  vendor_po_ref text,
  reviewed_by uuid REFERENCES core_user(id),
  reviewed_at timestamptz,
  routed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_line_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES order_po(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES core_organization(id),
  partner_id uuid NOT NULL REFERENCES core_organization(id),
  asset_id uuid NOT NULL REFERENCES asset_item(id),
  coverage_type text NOT NULL CHECK (coverage_type IN ('tpm', 'oem')),
  duration_months integer NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);

CREATE TABLE order_entitlement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES order_po(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES core_organization(id),
  partner_id uuid NOT NULL REFERENCES core_organization(id),
  asset_id uuid NOT NULL REFERENCES asset_item(id),
  entitlement_id text,
  coverage_start date NOT NULL,
  coverage_end date NOT NULL,
  verified_by uuid REFERENCES core_user(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (coverage_end >= coverage_start)
);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: Migration applied, 12 tables total

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00004_order_tables.sql
git commit -m "feat: add order domain tables (po, line_item, entitlement)"
```

### Task 6: Create support & notification tables

**Files:**
- Create: `supabase/migrations/00005_support_tables.sql`
- Create: `supabase/migrations/00006_notif_tables.sql`

- [ ] **Step 1: Write support migration**

```sql
-- supabase/migrations/00005_support_tables.sql

CREATE TABLE support_ticket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES core_organization(id),
  partner_id uuid REFERENCES core_organization(id),
  asset_id uuid REFERENCES asset_item(id),
  po_id uuid REFERENCES order_po(id),
  reported_by uuid NOT NULL REFERENCES core_user(id),
  assignee uuid REFERENCES core_user(id),
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'escalated', 'resolved')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Write notification migration**

```sql
-- supabase/migrations/00006_notif_tables.sql

CREATE TABLE notif_alert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES core_organization(id),
  user_id uuid REFERENCES core_user(id),
  asset_id uuid REFERENCES asset_item(id),
  quote_id uuid REFERENCES quote_request(id),
  po_id uuid REFERENCES order_po(id),
  type text NOT NULL
    CHECK (type IN (
      'warranty_expiry', 'quote_update', 'po_status',
      'entitlement', 'rfq_received', 'system'
    )),
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notif_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES notif_alert(id),
  to_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 3: Apply migrations locally**

Run: `npx supabase db reset`
Expected: Migration applied, 15 tables total

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00005_support_tables.sql supabase/migrations/00006_notif_tables.sql
git commit -m "feat: add support and notification domain tables"
```

### Task 7: Create audit table

**Files:**
- Create: `supabase/migrations/00007_audit_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00007_audit_tables.sql

CREATE TABLE audit_status_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES core_user(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: Migration applied, 16 tables total

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00007_audit_tables.sql
git commit -m "feat: add audit_status_change table"
```

---

## Chunk 2: Indexes, Auth Helpers & RLS Policies

### Task 8: Create indexes

**Files:**
- Create: `supabase/migrations/00008_indexes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00008_indexes.sql

-- Asset indexes
CREATE INDEX idx_asset_item_org_warranty ON asset_item (org_id, warranty_end);
CREATE INDEX idx_asset_item_org_status ON asset_item (org_id, status);

-- Quote indexes
CREATE INDEX idx_quote_request_org_status ON quote_request (org_id, status);
CREATE INDEX idx_quote_line_item_quote_version ON quote_line_item (quote_id, version);
CREATE INDEX idx_quote_price_list_lookup ON quote_price_list (partner_id, brand, coverage_type);
CREATE INDEX idx_quote_rfq_partner_status ON quote_rfq (partner_id, status);

-- Order indexes
CREATE INDEX idx_order_po_org_status ON order_po (org_id, status);
CREATE INDEX idx_order_po_partner_status ON order_po (partner_id, status);

-- Support indexes
CREATE INDEX idx_support_ticket_org_status ON support_ticket (org_id, status);

-- Notification indexes
CREATE INDEX idx_notif_alert_org_read ON notif_alert (org_id, read, created_at);

-- Audit indexes
CREATE INDEX idx_audit_status_change_lookup ON audit_status_change (table_name, record_id);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: Migration applied, all indexes created

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00008_indexes.sql
git commit -m "feat: add recommended indexes for all domains"
```

### Task 9: Create auth helper functions

**Files:**
- Create: `supabase/migrations/00009_auth_helpers.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00009_auth_helpers.sql

-- Helper: get current user's org_id from JWT
CREATE OR REPLACE FUNCTION auth.org_id() RETURNS uuid AS $$
  SELECT (auth.jwt()->>'org_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Helper: get current user's org_type from JWT
-- Uses SECURITY DEFINER to bypass RLS on core_organization lookup
CREATE OR REPLACE FUNCTION auth.org_type() RETURNS text AS $$
  SELECT type FROM public.core_organization
  WHERE id = (auth.jwt()->>'org_id')::uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Hook: inject org_id and org_type into JWT claims on login
-- This is called by Supabase Auth after successful authentication
CREATE OR REPLACE FUNCTION public.handle_auth_user_claims()
RETURNS trigger AS $$
DECLARE
  user_org_id uuid;
  user_org_type text;
BEGIN
  SELECT cu.org_id, co.type
  INTO user_org_id, user_org_type
  FROM public.core_user cu
  JOIN public.core_organization co ON co.id = cu.org_id
  WHERE cu.id = NEW.id;

  IF user_org_id IS NOT NULL THEN
    NEW.raw_app_meta_data = jsonb_set(
      jsonb_set(
        COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
        '{org_id}', to_jsonb(user_org_id::text)
      ),
      '{org_type}', to_jsonb(user_org_type)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: update claims on auth.users insert/update
CREATE OR REPLACE TRIGGER on_auth_user_created_or_updated
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_claims();
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: Functions and trigger created

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00009_auth_helpers.sql
git commit -m "feat: add auth helper functions and JWT claim hooks"
```

### Task 10: RLS policies for core tables

**Files:**
- Create: `supabase/migrations/00010_rls_core.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00010_rls_core.sql

-- Enable RLS on all core tables
ALTER TABLE core_organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_contact ENABLE ROW LEVEL SECURITY;

-- core_organization: operators see all, others see own org
CREATE POLICY "core_organization_select" ON core_organization
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR id = auth.org_id()
  );

CREATE POLICY "core_organization_insert" ON core_organization
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
  );

CREATE POLICY "core_organization_update" ON core_organization
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR (id = auth.org_id() AND auth.jwt()->>'role' = 'admin')
  );

-- core_user: operators see all, others see own org
CREATE POLICY "core_user_select" ON core_user
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
  );

CREATE POLICY "core_user_insert" ON core_user
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
  );

CREATE POLICY "core_user_update" ON core_user
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
  );

-- core_contact: operators see all, VARs see own org, partners no access
CREATE POLICY "core_contact_select" ON core_contact
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "core_contact_insert" ON core_contact
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "core_contact_update" ON core_contact
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "core_contact_delete" ON core_contact
  FOR DELETE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: RLS enabled, policies created for core tables

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00010_rls_core.sql
git commit -m "feat: add RLS policies for core domain tables"
```

### Task 11: RLS policies for asset tables

**Files:**
- Create: `supabase/migrations/00011_rls_asset.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00011_rls_asset.sql

ALTER TABLE asset_import_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_item ENABLE ROW LEVEL SECURITY;

-- asset_import_batch: operators + own org (VARs only, partners no access)
CREATE POLICY "asset_import_batch_select" ON asset_import_batch
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "asset_import_batch_insert" ON asset_import_batch
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

-- asset_item: operators + own org (VARs only, partners no access)
CREATE POLICY "asset_item_select" ON asset_item
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "asset_item_insert" ON asset_item
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "asset_item_update" ON asset_item
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "asset_item_delete" ON asset_item
  FOR DELETE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: RLS enabled and policies created for asset tables

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00011_rls_asset.sql
git commit -m "feat: add RLS policies for asset domain tables"
```

### Task 12: RLS policies for quote tables

**Files:**
- Create: `supabase/migrations/00012_rls_quote.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00012_rls_quote.sql

ALTER TABLE quote_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_rfq ENABLE ROW LEVEL SECURITY;

-- quote_request: operators see all, VARs see own, partners see quotes with their RFQs
CREATE POLICY "quote_request_select" ON quote_request
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR id IN (
      SELECT quote_id FROM quote_rfq
      WHERE partner_id = auth.org_id()
    )
  );

CREATE POLICY "quote_request_insert" ON quote_request
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "quote_request_update" ON quote_request
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

-- quote_line_item: operators see all, VARs via org_id, partners via partner_id
CREATE POLICY "quote_line_item_select" ON quote_line_item
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR partner_id = auth.org_id()
  );

CREATE POLICY "quote_line_item_insert" ON quote_line_item
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

CREATE POLICY "quote_line_item_update" ON quote_line_item
  FOR UPDATE USING (
    auth.org_type() = 'operator'
  );

-- quote_price_list: operators see all, partners see/manage own
CREATE POLICY "quote_price_list_select" ON quote_price_list
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'delivery_partner' AND partner_id = auth.org_id())
  );

CREATE POLICY "quote_price_list_insert" ON quote_price_list
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'delivery_partner' AND partner_id = auth.org_id())
  );

CREATE POLICY "quote_price_list_update" ON quote_price_list
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'delivery_partner' AND partner_id = auth.org_id())
  );

CREATE POLICY "quote_price_list_delete" ON quote_price_list
  FOR DELETE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'delivery_partner' AND partner_id = auth.org_id())
  );

-- quote_rfq: operators see all, partners see/respond to own
CREATE POLICY "quote_rfq_select" ON quote_rfq
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'delivery_partner' AND partner_id = auth.org_id())
  );

CREATE POLICY "quote_rfq_insert" ON quote_rfq
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
  );

CREATE POLICY "quote_rfq_update" ON quote_rfq
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'delivery_partner' AND partner_id = auth.org_id())
  );
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: RLS enabled and policies created for quote tables

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00012_rls_quote.sql
git commit -m "feat: add RLS policies for quote domain tables"
```

### Task 13: RLS policies for order tables

**Files:**
- Create: `supabase/migrations/00013_rls_order.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00013_rls_order.sql

ALTER TABLE order_po ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_entitlement ENABLE ROW LEVEL SECURITY;

-- order_po: operators see all, VARs own org, partners see routed POs
CREATE POLICY "order_po_select" ON order_po
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR partner_id = auth.org_id()
  );

CREATE POLICY "order_po_insert" ON order_po
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

-- Partners can only update status and vendor_po_ref (acknowledge PO).
-- Broader field updates are enforced at the API service layer.
CREATE POLICY "order_po_update_operator" ON order_po
  FOR UPDATE USING (
    auth.org_type() = 'operator'
  );

CREATE POLICY "order_po_update_partner" ON order_po
  FOR UPDATE USING (
    auth.org_type() = 'delivery_partner'
    AND partner_id = auth.org_id()
  );

-- order_line_item: operators see all, VARs via org_id, partners via partner_id
CREATE POLICY "order_line_item_select" ON order_line_item
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR partner_id = auth.org_id()
  );

CREATE POLICY "order_line_item_insert" ON order_line_item
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'var' AND org_id = auth.org_id())
  );

-- order_entitlement: operators see all, VARs via org_id, partners via partner_id
CREATE POLICY "order_entitlement_select" ON order_entitlement
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR partner_id = auth.org_id()
  );

CREATE POLICY "order_entitlement_insert" ON order_entitlement
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR (auth.org_type() = 'delivery_partner' AND partner_id = auth.org_id())
  );

CREATE POLICY "order_entitlement_update" ON order_entitlement
  FOR UPDATE USING (
    auth.org_type() = 'operator'
  );
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: RLS enabled and policies created for order tables

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00013_rls_order.sql
git commit -m "feat: add RLS policies for order domain tables"
```

### Task 14: RLS policies for support, notification, and audit tables

**Files:**
- Create: `supabase/migrations/00014_rls_support_notif.sql`
- Create: `supabase/migrations/00015_rls_audit.sql`

- [ ] **Step 1: Write support & notification RLS migration**

```sql
-- supabase/migrations/00014_rls_support_notif.sql

ALTER TABLE support_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE notif_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE notif_email_log ENABLE ROW LEVEL SECURITY;

-- support_ticket: operators see all, others see own org or partner_id match
CREATE POLICY "support_ticket_select" ON support_ticket
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR partner_id = auth.org_id()
  );

CREATE POLICY "support_ticket_insert" ON support_ticket
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR partner_id = auth.org_id()
  );

CREATE POLICY "support_ticket_update" ON support_ticket
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
    OR partner_id = auth.org_id()
  );

-- notif_alert: operators see all, others see own org
CREATE POLICY "notif_alert_select" ON notif_alert
  FOR SELECT USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
  );

CREATE POLICY "notif_alert_update" ON notif_alert
  FOR UPDATE USING (
    auth.org_type() = 'operator'
    OR org_id = auth.org_id()
  );

CREATE POLICY "notif_alert_insert" ON notif_alert
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
  );

-- notif_email_log: operators only
CREATE POLICY "notif_email_log_select" ON notif_email_log
  FOR SELECT USING (
    auth.org_type() = 'operator'
  );

CREATE POLICY "notif_email_log_insert" ON notif_email_log
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
  );
```

- [ ] **Step 2: Write audit RLS migration**

```sql
-- supabase/migrations/00015_rls_audit.sql

ALTER TABLE audit_status_change ENABLE ROW LEVEL SECURITY;

-- audit_status_change: operators only
CREATE POLICY "audit_status_change_select" ON audit_status_change
  FOR SELECT USING (
    auth.org_type() = 'operator'
  );

CREATE POLICY "audit_status_change_insert" ON audit_status_change
  FOR INSERT WITH CHECK (
    auth.org_type() = 'operator'
  );
```

- [ ] **Step 3: Apply migrations locally**

Run: `npx supabase db reset`
Expected: All RLS enabled across all tables

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00014_rls_support_notif.sql supabase/migrations/00015_rls_audit.sql
git commit -m "feat: add RLS policies for support, notification, and audit tables"
```

---

## Chunk 3: Seed Data & Tests

### Task 15: Create seed data

**Files:**
- Create: `supabase/migrations/00016_seed_data.sql`

- [ ] **Step 1: Write seed data migration**

```sql
-- supabase/migrations/00016_seed_data.sql
-- Development seed data — DO NOT apply to production

-- Organizations
INSERT INTO core_organization (id, name, type, country, industry) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'RenewFlow Operations', 'operator', 'PA', 'Technology'),
  ('a0000000-0000-0000-0000-000000000002', 'Grupo Alfa S.A.', 'var', 'PA', 'Finance'),
  ('a0000000-0000-0000-0000-000000000003', 'Rex Distribution', 'var', 'CR', 'Retail'),
  ('a0000000-0000-0000-0000-000000000004', 'ServiceNet LATAM', 'delivery_partner', 'MX', 'IT Services'),
  ('a0000000-0000-0000-0000-000000000005', 'Dell Direct LATAM', 'delivery_partner', 'BR', 'IT Services');

-- Users (IDs will be matched to auth.users in a real setup)
INSERT INTO core_user (id, org_id, email, full_name, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'kenneth@renewflo.com', 'Kenneth Roach', 'admin'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'carlos@grupoalfa.com', 'Carlos Mendez', 'admin'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'maria@rexdist.com', 'Maria Vargas', 'admin'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'juan@servicenet.com', 'Juan Torres', 'admin'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'ana@delldirect.com', 'Ana Silva', 'admin');

-- Contacts
INSERT INTO core_contact (org_id, name, email, phone, role, is_primary) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Carlos Mendez', 'carlos@grupoalfa.com', '+507-6123-4567', 'IT Director', true),
  ('a0000000-0000-0000-0000-000000000003', 'Maria Vargas', 'maria@rexdist.com', '+506-8765-4321', 'Procurement Manager', true);

-- Assets for Grupo Alfa
INSERT INTO asset_item (org_id, brand, model, serial, device_type, tier, warranty_end, status) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Dell', 'PowerEdge R740', 'SVC-7741', 'Server', 'critical', CURRENT_DATE + 88, 'discovered'),
  ('a0000000-0000-0000-0000-000000000002', 'Dell', 'PowerEdge R740', 'SVC-7742', 'Server', 'critical', CURRENT_DATE + 45, 'alerted-60'),
  ('a0000000-0000-0000-0000-000000000002', 'HP', 'ProLiant DL380', 'HPE-3801', 'Server', 'standard', CURRENT_DATE + 22, 'alerted-30'),
  ('a0000000-0000-0000-0000-000000000002', 'Lenovo', 'ThinkSystem SR650', 'LNV-6501', 'Server', 'standard', CURRENT_DATE + 60, 'alerted-60');

-- Assets for Rex Distribution
INSERT INTO asset_item (org_id, brand, model, serial, device_type, tier, warranty_end, status) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'Dell', 'PowerEdge R640', 'SVC-6401', 'Server', 'low-use', CURRENT_DATE + 12, 'alerted-14'),
  ('a0000000-0000-0000-0000-000000000003', 'Dell', 'Latitude 5520', 'LAT-5520', 'Laptop', 'eol', CURRENT_DATE - 15, 'lapsed'),
  ('a0000000-0000-0000-0000-000000000003', 'HP', 'EliteDesk 800', 'HPD-8001', 'Desktop', 'standard', CURRENT_DATE + 75, 'discovered');

-- Price lists for ServiceNet LATAM
INSERT INTO quote_price_list (partner_id, brand, model_pattern, coverage_type, duration_months, unit_price, valid_from, valid_until) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'Dell', 'PowerEdge R7%', 'oem', 36, 1240.00, '2026-01-01', '2026-12-31'),
  ('a0000000-0000-0000-0000-000000000004', 'Dell', 'PowerEdge R6%', 'tpm', 12, 480.00, '2026-01-01', '2026-12-31'),
  ('a0000000-0000-0000-0000-000000000004', 'HP', 'ProLiant DL3%', 'oem', 24, 890.00, '2026-01-01', '2026-12-31');

-- Price lists for Dell Direct LATAM
INSERT INTO quote_price_list (partner_id, brand, model_pattern, coverage_type, duration_months, unit_price, valid_from, valid_until) VALUES
  ('a0000000-0000-0000-0000-000000000005', 'Dell', 'PowerEdge R7%', 'oem', 36, 1180.00, '2026-01-01', '2026-12-31'),
  ('a0000000-0000-0000-0000-000000000005', 'Dell', 'PowerEdge R6%', 'oem', 12, 520.00, '2026-01-01', '2026-12-31'),
  ('a0000000-0000-0000-0000-000000000005', 'Dell', 'Latitude%', 'tpm', 12, 150.00, '2026-01-01', '2026-12-31');

-- Quote request (for FK targets in order tests)
INSERT INTO quote_request (id, org_id, requested_by, status, version) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'accepted', 1),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'draft', 1);

-- Quote line items
INSERT INTO quote_line_item (id, quote_id, org_id, asset_id, coverage_type, duration_months, unit_price, quantity, partner_id, source, version) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM asset_item WHERE serial = 'SVC-7741'), 'oem', 36, 1240.00, 1, 'a0000000-0000-0000-0000-000000000004', 'price_list', 1);

-- Quote RFQ
INSERT INTO quote_rfq (id, quote_id, partner_id, status, sent_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'responded', now());

-- Purchase order (from accepted quote)
INSERT INTO order_po (id, org_id, quote_id, submitted_by, partner_id, status, total) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'routed', 1240.00);

-- Order line item
INSERT INTO order_line_item (po_id, org_id, partner_id, asset_id, coverage_type, duration_months, unit_price, quantity) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM asset_item WHERE serial = 'SVC-7741'), 'oem', 36, 1240.00, 1);

-- Support ticket
INSERT INTO support_ticket (id, org_id, partner_id, po_id, reported_by, subject, description, status, priority) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Entitlement delay on PO-001', 'Coverage not showing after 48h', 'open', 'high');

-- Notification alert
INSERT INTO notif_alert (id, org_id, user_id, po_id, type, title, body) VALUES
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'po_status', 'PO routed to ServiceNet', 'Your PO has been routed to the delivery partner.');
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset`
Expected: All seed data inserted, no errors

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00016_seed_data.sql
git commit -m "feat: add development seed data for all domains"
```

### Task 16: Create test helpers

**Files:**
- Create: `tests/db/helpers.ts`

- [ ] **Step 1: Write test helpers**

```typescript
// tests/db/helpers.ts

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These match the default Supabase local dev credentials
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** Service role client — bypasses RLS, used for setup/teardown */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/** Anon client — respects RLS, used for testing policies */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Well-known seed IDs for testing
export const SEED_IDS = {
  orgs: {
    operator: "a0000000-0000-0000-0000-000000000001",
    grupoAlfa: "a0000000-0000-0000-0000-000000000002",
    rexDist: "a0000000-0000-0000-0000-000000000003",
    serviceNet: "a0000000-0000-0000-0000-000000000004",
    dellDirect: "a0000000-0000-0000-0000-000000000005",
  },
  users: {
    kenneth: "b0000000-0000-0000-0000-000000000001",
    carlos: "b0000000-0000-0000-0000-000000000002",
    maria: "b0000000-0000-0000-0000-000000000003",
    juan: "b0000000-0000-0000-0000-000000000004",
    ana: "b0000000-0000-0000-0000-000000000005",
  },
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add tests/db/helpers.ts
git commit -m "feat: add database test helpers with seed IDs"
```

### Task 17: Write core domain tests

**Files:**
- Create: `tests/db/core.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// tests/db/core.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import { serviceClient, SEED_IDS } from "./helpers";

const db = serviceClient();

describe("core domain tables", () => {
  describe("core_organization", () => {
    it("should have 5 seed organizations", async () => {
      const { data, error } = await db
        .from("core_organization")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(5);
    });

    it("should have correct org types", async () => {
      const { data } = await db
        .from("core_organization")
        .select("name, type")
        .order("name");

      const types = data!.map((o) => o.type);
      expect(types).toContain("operator");
      expect(types).toContain("var");
      expect(types).toContain("delivery_partner");
    });

    it("should reject invalid org types", async () => {
      const { error } = await db
        .from("core_organization")
        .insert({ name: "Bad Org", type: "invalid" });

      expect(error).not.toBeNull();
    });
  });

  describe("core_user", () => {
    it("should have 5 seed users", async () => {
      const { data, error } = await db
        .from("core_user")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(5);
    });

    it("should enforce unique email", async () => {
      const { error } = await db
        .from("core_user")
        .insert({
          id: "c0000000-0000-0000-0000-000000000099",
          org_id: SEED_IDS.orgs.operator,
          email: "kenneth@renewflo.com", // duplicate
          role: "member",
        });

      expect(error).not.toBeNull();
    });

    it("should reject invalid roles", async () => {
      const { error } = await db
        .from("core_user")
        .insert({
          id: "c0000000-0000-0000-0000-000000000098",
          org_id: SEED_IDS.orgs.operator,
          email: "test@test.com",
          role: "superadmin",
        });

      expect(error).not.toBeNull();
    });
  });

  describe("core_contact", () => {
    it("should have 2 seed contacts", async () => {
      const { data, error } = await db
        .from("core_contact")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/db/core.test.ts`
Expected: All tests pass (requires `npx supabase start` running)

- [ ] **Step 3: Commit**

```bash
git add tests/db/core.test.ts
git commit -m "test: add core domain table tests"
```

### Task 18: Write asset domain tests

**Files:**
- Create: `tests/db/asset.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// tests/db/asset.test.ts

import { describe, it, expect } from "vitest";
import { serviceClient, SEED_IDS } from "./helpers";

const db = serviceClient();

describe("asset domain tables", () => {
  describe("asset_item", () => {
    it("should have 7 seed assets across 2 orgs", async () => {
      const { data, error } = await db
        .from("asset_item")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(7);
    });

    it("should enforce unique serial per org", async () => {
      const { error } = await db
        .from("asset_item")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          brand: "Dell",
          model: "PowerEdge R740",
          serial: "SVC-7741", // duplicate within grupoAlfa
          tier: "critical",
          warranty_end: "2026-12-31",
        });

      expect(error).not.toBeNull();
    });

    it("should allow same serial in different org", async () => {
      const { data, error } = await db
        .from("asset_item")
        .insert({
          org_id: SEED_IDS.orgs.rexDist, // different org
          brand: "Dell",
          model: "PowerEdge R740",
          serial: "SVC-7741", // same serial, different org = OK
          tier: "critical",
          warranty_end: "2026-12-31",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.serial).toBe("SVC-7741");

      // Cleanup
      await db.from("asset_item").delete().eq("id", data!.id);
    });

    it("should reject invalid tier", async () => {
      const { error } = await db
        .from("asset_item")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          brand: "Dell",
          model: "Test",
          serial: "TEST-001",
          tier: "ultra",
          warranty_end: "2026-12-31",
        });

      expect(error).not.toBeNull();
    });

    it("should reject invalid status", async () => {
      const { error } = await db
        .from("asset_item")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          brand: "Dell",
          model: "Test",
          serial: "TEST-002",
          tier: "standard",
          warranty_end: "2026-12-31",
          status: "invalid-status",
        });

      expect(error).not.toBeNull();
    });
  });

  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/db/asset.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/db/asset.test.ts
git commit -m "test: add asset domain table tests"
```

### Task 19: Write quote domain tests

**Files:**
- Create: `tests/db/quote.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// tests/db/quote.test.ts

import { describe, it, expect } from "vitest";
import { serviceClient, SEED_IDS } from "./helpers";

const db = serviceClient();

const SEED_QUOTE_IDS = {
  accepted: "c0000000-0000-0000-0000-000000000001",
  draft: "c0000000-0000-0000-0000-000000000002",
};

describe("quote domain tables", () => {
  describe("quote_request", () => {
    it("should have 2 seed quote requests", async () => {
      const { data, error } = await db
        .from("quote_request")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it("should reject invalid status", async () => {
      const { error } = await db
        .from("quote_request")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          requested_by: SEED_IDS.users.carlos,
          status: "bogus",
        });

      expect(error).not.toBeNull();
    });
  });

  describe("quote_line_item", () => {
    it("should have 1 seed line item", async () => {
      const { data, error } = await db
        .from("quote_line_item")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("should reject invalid coverage_type", async () => {
      const { data: assets } = await db
        .from("asset_item")
        .select("id")
        .limit(1)
        .single();

      const { error } = await db
        .from("quote_line_item")
        .insert({
          quote_id: SEED_QUOTE_IDS.draft,
          org_id: SEED_IDS.orgs.rexDist,
          asset_id: assets!.id,
          coverage_type: "invalid",
          duration_months: 12,
          source: "price_list",
          version: 1,
        });

      expect(error).not.toBeNull();
    });
  });

  describe("quote_price_list", () => {
    it("should have 6 seed price list entries", async () => {
      const { data, error } = await db
        .from("quote_price_list")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(6);
    });

    it("should enforce valid_until >= valid_from", async () => {
      const { error } = await db
        .from("quote_price_list")
        .insert({
          partner_id: SEED_IDS.orgs.serviceNet,
          brand: "Dell",
          model_pattern: "Test%",
          coverage_type: "tpm",
          duration_months: 12,
          unit_price: 100,
          valid_from: "2026-12-31",
          valid_until: "2026-01-01",
        });

      expect(error).not.toBeNull();
    });
  });

  describe("quote_rfq", () => {
    it("should have 1 seed RFQ", async () => {
      const { data, error } = await db
        .from("quote_rfq")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("should reject invalid status", async () => {
      const { error } = await db
        .from("quote_rfq")
        .insert({
          quote_id: SEED_QUOTE_IDS.accepted,
          partner_id: SEED_IDS.orgs.dellDirect,
          status: "invalid",
        });

      expect(error).not.toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/db/quote.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/db/quote.test.ts
git commit -m "test: add quote domain table tests"
```

### Task 20: Write order domain tests

**Files:**
- Create: `tests/db/order.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// tests/db/order.test.ts

import { describe, it, expect } from "vitest";
import { serviceClient, SEED_IDS } from "./helpers";

const db = serviceClient();

const SEED_PO_ID = "f0000000-0000-0000-0000-000000000001";
const SEED_QUOTE_ID = "c0000000-0000-0000-0000-000000000001";

describe("order domain tables", () => {
  describe("order_po", () => {
    it("should have 1 seed PO", async () => {
      const { data, error } = await db
        .from("order_po")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("should reject invalid status", async () => {
      const { error } = await db
        .from("order_po")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          quote_id: SEED_QUOTE_ID,
          submitted_by: SEED_IDS.users.carlos,
          partner_id: SEED_IDS.orgs.serviceNet,
          status: "invalid",
          total: 1000,
        });

      expect(error).not.toBeNull();
    });
  });

  describe("order_line_item", () => {
    it("should have 1 seed order line item", async () => {
      const { data, error } = await db
        .from("order_line_item")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("order_entitlement", () => {
    it("should enforce coverage_end >= coverage_start", async () => {
      const { data: assets } = await db
        .from("asset_item")
        .select("id")
        .eq("serial", "SVC-7741")
        .single();

      const { error } = await db
        .from("order_entitlement")
        .insert({
          po_id: SEED_PO_ID,
          org_id: SEED_IDS.orgs.grupoAlfa,
          partner_id: SEED_IDS.orgs.serviceNet,
          asset_id: assets!.id,
          coverage_start: "2026-12-31",
          coverage_end: "2026-01-01", // before start
        });

      expect(error).not.toBeNull();
    });

    it("should accept valid coverage dates", async () => {
      const { data: assets } = await db
        .from("asset_item")
        .select("id")
        .eq("serial", "SVC-7742")
        .single();

      const { data, error } = await db
        .from("order_entitlement")
        .insert({
          po_id: SEED_PO_ID,
          org_id: SEED_IDS.orgs.grupoAlfa,
          partner_id: SEED_IDS.orgs.serviceNet,
          asset_id: assets!.id,
          entitlement_id: "ENT-TEST-001",
          coverage_start: "2026-01-01",
          coverage_end: "2029-01-01",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.entitlement_id).toBe("ENT-TEST-001");

      // Cleanup
      await db.from("order_entitlement").delete().eq("id", data!.id);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/db/order.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/db/order.test.ts
git commit -m "test: add order domain table tests"
```

### Task 21: Write support & notification domain tests

**Files:**
- Create: `tests/db/support-notif.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// tests/db/support-notif.test.ts

import { describe, it, expect } from "vitest";
import { serviceClient, SEED_IDS } from "./helpers";

const db = serviceClient();

describe("support domain tables", () => {
  describe("support_ticket", () => {
    it("should have 1 seed ticket", async () => {
      const { data, error } = await db
        .from("support_ticket")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("should reject invalid status", async () => {
      const { error } = await db
        .from("support_ticket")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          reported_by: SEED_IDS.users.carlos,
          subject: "Test",
          status: "invalid",
          priority: "low",
        });

      expect(error).not.toBeNull();
    });

    it("should reject invalid priority", async () => {
      const { error } = await db
        .from("support_ticket")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          reported_by: SEED_IDS.users.carlos,
          subject: "Test",
          status: "open",
          priority: "urgent", // not a valid value
        });

      expect(error).not.toBeNull();
    });
  });
});

describe("notification domain tables", () => {
  describe("notif_alert", () => {
    it("should have 1 seed alert", async () => {
      const { data, error } = await db
        .from("notif_alert")
        .select("*");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("should reject invalid type", async () => {
      const { error } = await db
        .from("notif_alert")
        .insert({
          org_id: SEED_IDS.orgs.grupoAlfa,
          type: "invalid_type",
          title: "Test",
        });

      expect(error).not.toBeNull();
    });

    it("should default read to false", async () => {
      const { data } = await db
        .from("notif_alert")
        .select("read")
        .limit(1)
        .single();

      expect(data!.read).toBe(false);
    });
  });

  describe("notif_email_log", () => {
    it("should reject invalid status", async () => {
      const { error } = await db
        .from("notif_email_log")
        .insert({
          to_email: "test@test.com",
          subject: "Test",
          status: "pending", // not valid
        });

      expect(error).not.toBeNull();
    });

    it("should accept valid email log entry", async () => {
      const { data, error } = await db
        .from("notif_email_log")
        .insert({
          alert_id: "20000000-0000-0000-0000-000000000001",
          to_email: "carlos@grupoalfa.com",
          subject: "PO Update",
          status: "queued",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.status).toBe("queued");

      // Cleanup
      await db.from("notif_email_log").delete().eq("id", data!.id);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/db/support-notif.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/db/support-notif.test.ts
git commit -m "test: add support and notification domain table tests"
```

### Task 22: Create seed.sql

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Write seed.sql**

```sql
-- supabase/seed.sql
-- This file is run by `supabase db reset` after all migrations.
-- Seed data is in migration 00016 so it runs in order with other migrations.
-- This file is intentionally empty — seed data lives in migrations.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore: add seed.sql placeholder"
```

### Task 23: Final verification

- [ ] **Step 1: Reset database and run all migrations**

Run: `npx supabase db reset`
Expected: All 16 migrations applied successfully

- [ ] **Step 2: Run all tests**

Run: `npx vitest run tests/db/`
Expected: All tests pass

- [ ] **Step 3: Verify table count**

Run: `npx supabase db lint`
Expected: No lint errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify all migrations and tests pass"
```
