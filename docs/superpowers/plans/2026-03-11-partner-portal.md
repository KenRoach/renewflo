# RenewFlow Partner Portal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a delivery partner-facing portal within the existing React + Vite codebase. Partners manage RFQs, price lists, POs, and entitlements through a self-service UI.

**Architecture:** Feature module under `src/features/partner-portal/` with role-based routing gated by `org_type = 'delivery_partner'`.

**Tech Stack:** React 19, TypeScript (strict), Zustand, Vite, existing component library

---

## File Structure

```
src/features/partner-portal/
├── index.ts                            # Feature exports
├── PartnerLayout.tsx                   # Shell with partner sidebar
├── PartnerRouter.tsx                   # Partner route definitions
├── components/
│   ├── PartnerSidebar.tsx
│   ├── PartnerKpiCard.tsx
│   └── StatusStepper.tsx
├── pages/
│   ├── PartnerDashboard.tsx
│   ├── RfqInbox.tsx
│   ├── RfqDetail.tsx
│   ├── PriceLists.tsx
│   ├── PriceListForm.tsx
│   ├── ActivePOs.tsx
│   ├── PODetail.tsx
│   ├── Entitlements.tsx
│   └── EntitlementForm.tsx
├── hooks/
│   ├── usePartnerDashboard.ts
│   ├── useRfqs.ts
│   ├── usePriceLists.ts
│   ├── usePartnerOrders.ts
│   └── useEntitlements.ts
├── services/
│   └── partner.api.ts                  # Typed API client functions
└── stores/
    └── partner.store.ts                # Zustand store for partner state
```

---

## Chunk 1: Infrastructure & Layout (Tasks 1–5)

### Task 1: Partner API service

**Files:** Create `src/features/partner-portal/services/partner.api.ts`

- [ ] **Step 1: Write typed API client**

```typescript
// src/features/partner-portal/services/partner.api.ts
const API_BASE = '/api/v1';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// Dashboard
export interface PartnerDashboardData {
  pendingRfqs: number;
  activePOs: number;
  monthlyRevenue: number;
  avgResponseTime: number; // hours
  recentPOs: PartnerPO[];
  urgentRfqs: PartnerRfq[];
}

export interface PartnerRfq {
  id: string;
  quoteId: string;
  status: 'sent' | 'responded' | 'expired' | 'declined';
  sentAt: string;
  lineItemCount: number;
  anonymizedRef: string;
}

export interface PartnerPO {
  id: string;
  status: string;
  total: number;
  anonymizedRef: string;
  createdAt: string;
  lineItemCount: number;
}

export interface PriceListEntry {
  id: string;
  brand: string;
  model_pattern: string;
  coverage_type: 'tpm' | 'oem';
  duration_months: number;
  unit_price: number;
  valid_from: string;
  valid_until: string;
}

export interface Entitlement {
  id: string;
  poId: string;
  assetId: string;
  entitlementId: string;
  coverageStart: string;
  coverageEnd: string;
  verifiedAt: string | null;
}

// RFQs
export const rfqApi = {
  list: (cursor?: string) =>
    apiFetch<{ data: PartnerRfq[]; nextCursor: string | null; hasMore: boolean }>(
      `/quotes?${cursor ? `cursor=${cursor}&` : ''}limit=50`
    ),
  getDetail: (quoteId: string) =>
    apiFetch<any>(`/quotes/${quoteId}`),
  respond: (quoteId: string, body: { lineItems: { lineItemId: string; unitPrice: number }[]; notes?: string }) =>
    apiFetch<any>(`/quotes/${quoteId}/rfq/respond`, { method: 'POST', body: JSON.stringify(body) }),
};

// Price Lists
export const priceListApi = {
  list: (cursor?: string) =>
    apiFetch<{ data: PriceListEntry[]; nextCursor: string | null; hasMore: boolean }>(
      `/price-lists?${cursor ? `cursor=${cursor}&` : ''}limit=50`
    ),
  create: (entry: Omit<PriceListEntry, 'id'>) =>
    apiFetch<PriceListEntry>('/price-lists', { method: 'POST', body: JSON.stringify({
      brand: entry.brand,
      modelPattern: entry.model_pattern,
      coverageType: entry.coverage_type,
      durationMonths: entry.duration_months,
      unitPrice: entry.unit_price,
      validFrom: entry.valid_from,
      validUntil: entry.valid_until,
    })}),
  update: (id: string, entry: Partial<PriceListEntry>) =>
    apiFetch<PriceListEntry>(`/price-lists/${id}`, { method: 'PATCH', body: JSON.stringify(entry) }),
  remove: (id: string) =>
    apiFetch<null>(`/price-lists/${id}`, { method: 'DELETE' }),
};

// Orders
export const orderApi = {
  list: (cursor?: string, status?: string) =>
    apiFetch<{ data: PartnerPO[]; nextCursor: string | null; hasMore: boolean }>(
      `/orders?${cursor ? `cursor=${cursor}&` : ''}${status ? `status=${status}&` : ''}limit=50`
    ),
  getDetail: (id: string) =>
    apiFetch<any>(`/orders/${id}`),
  acknowledge: (id: string) =>
    apiFetch<any>(`/orders/${id}/acknowledge`, { method: 'POST' }),
};

// Entitlements
export const entitlementApi = {
  submit: (orderId: string, entitlements: { assetId: string; entitlementId: string; coverageStart: string; coverageEnd: string }[]) =>
    apiFetch<any>(`/orders/${orderId}/verify-entitlement`, {
      method: 'POST',
      body: JSON.stringify({ entitlements }),
    }),
};
```

### Task 2: Partner Zustand store

**Files:** Create `src/features/partner-portal/stores/partner.store.ts`

- [ ] **Step 1: Write store**

```typescript
// src/features/partner-portal/stores/partner.store.ts
import { create } from 'zustand';

interface PartnerState {
  activeTab: 'dashboard' | 'rfqs' | 'price-lists' | 'orders' | 'entitlements';
  setActiveTab: (tab: PartnerState['activeTab']) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const usePartnerStore = create<PartnerState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
```

### Task 3: Partner sidebar

**Files:** Create `src/features/partner-portal/components/PartnerSidebar.tsx`

- [ ] **Step 1: Write sidebar**

```tsx
// src/features/partner-portal/components/PartnerSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePartnerStore } from '../stores/partner.store';

const NAV_ITEMS = [
  { path: '/partner', label: 'Dashboard', icon: 'grid' },
  { path: '/partner/rfqs', label: 'RFQ Inbox', icon: 'inbox' },
  { path: '/partner/price-lists', label: 'Price Lists', icon: 'list' },
  { path: '/partner/orders', label: 'Active POs', icon: 'package' },
  { path: '/partner/entitlements', label: 'Entitlements', icon: 'shield' },
] as const;

export function PartnerSidebar() {
  const { sidebarCollapsed, toggleSidebar } = usePartnerStore();

  return (
    <aside className={`partner-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>{sidebarCollapsed ? 'RF' : 'RenewFlow Partner'}</h2>
        <button onClick={toggleSidebar} className="sidebar-toggle">
          {sidebarCollapsed ? '>' : '<'}
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/partner'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

### Task 4: Partner layout shell

**Files:** Create `src/features/partner-portal/PartnerLayout.tsx`

- [ ] **Step 1: Write layout**

```tsx
// src/features/partner-portal/PartnerLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { PartnerSidebar } from './components/PartnerSidebar';

export function PartnerLayout() {
  return (
    <div className="partner-layout">
      <PartnerSidebar />
      <main className="partner-main">
        <Outlet />
      </main>
    </div>
  );
}
```

### Task 5: Partner router with role gate

**Files:** Create `src/features/partner-portal/PartnerRouter.tsx`

- [ ] **Step 1: Write router**

```tsx
// src/features/partner-portal/PartnerRouter.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PartnerLayout } from './PartnerLayout';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { RfqInbox } from './pages/RfqInbox';
import { RfqDetail } from './pages/RfqDetail';
import { PriceLists } from './pages/PriceLists';
import { PriceListForm } from './pages/PriceListForm';
import { ActivePOs } from './pages/ActivePOs';
import { PODetail } from './pages/PODetail';
import { Entitlements } from './pages/Entitlements';
import { EntitlementForm } from './pages/EntitlementForm';

interface PartnerRouterProps {
  orgType: string;
}

export function PartnerRouter({ orgType }: PartnerRouterProps) {
  if (orgType !== 'delivery_partner') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route element={<PartnerLayout />}>
        <Route index element={<PartnerDashboard />} />
        <Route path="rfqs" element={<RfqInbox />} />
        <Route path="rfqs/:quoteId" element={<RfqDetail />} />
        <Route path="price-lists" element={<PriceLists />} />
        <Route path="price-lists/new" element={<PriceListForm />} />
        <Route path="price-lists/:id/edit" element={<PriceListForm />} />
        <Route path="orders" element={<ActivePOs />} />
        <Route path="orders/:id" element={<PODetail />} />
        <Route path="entitlements" element={<Entitlements />} />
        <Route path="entitlements/:orderId" element={<EntitlementForm />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 2: Commit Chunk 1**

```bash
git add src/features/partner-portal/
git commit -m "feat(partner): scaffold partner portal with layout, routing, API client, store"
```

---

## Chunk 2: Partner Dashboard (Tasks 6–8)

### Task 6: Dashboard hook

**Files:** Create `src/features/partner-portal/hooks/usePartnerDashboard.ts`

- [ ] **Step 1: Write dashboard data hook**

```typescript
// src/features/partner-portal/hooks/usePartnerDashboard.ts
import { useState, useEffect } from 'react';
import { orderApi, rfqApi } from '../services/partner.api';
import type { PartnerPO, PartnerRfq } from '../services/partner.api';

interface DashboardData {
  pendingRfqs: number;
  activePOs: number;
  monthlyRevenue: number;
  recentPOs: PartnerPO[];
  urgentRfqs: PartnerRfq[];
  loading: boolean;
  error: string | null;
}

export function usePartnerDashboard(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    pendingRfqs: 0,
    activePOs: 0,
    monthlyRevenue: 0,
    recentPOs: [],
    urgentRfqs: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetch() {
      try {
        const [rfqs, orders] = await Promise.all([
          rfqApi.list(),
          orderApi.list(),
        ]);

        const pendingRfqs = rfqs.data.filter((r) => r.status === 'sent').length;
        const activePOs = orders.data.filter((o) =>
          !['completed', 'cancelled'].includes(o.status)
        ).length;
        const monthlyRevenue = orders.data
          .filter((o) => o.status === 'completed')
          .reduce((sum, o) => sum + o.total, 0);

        setData({
          pendingRfqs,
          activePOs,
          monthlyRevenue,
          recentPOs: orders.data.slice(0, 5),
          urgentRfqs: rfqs.data.filter((r) => r.status === 'sent').slice(0, 5),
          loading: false,
          error: null,
        });
      } catch (err) {
        setData((prev) => ({ ...prev, loading: false, error: (err as Error).message }));
      }
    }
    fetch();
  }, []);

  return data;
}
```

### Task 7: KPI card component

**Files:** Create `src/features/partner-portal/components/PartnerKpiCard.tsx`

- [ ] **Step 1: Write KPI card**

```tsx
// src/features/partner-portal/components/PartnerKpiCard.tsx
import React from 'react';

interface PartnerKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'success';
}

export function PartnerKpiCard({ title, value, subtitle, variant = 'default' }: PartnerKpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${variant}`}>
      <p className="kpi-card__title">{title}</p>
      <p className="kpi-card__value">{value}</p>
      {subtitle && <p className="kpi-card__subtitle">{subtitle}</p>}
    </div>
  );
}
```

### Task 8: Dashboard page

**Files:** Create `src/features/partner-portal/pages/PartnerDashboard.tsx`

- [ ] **Step 1: Write dashboard page**

```tsx
// src/features/partner-portal/pages/PartnerDashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { PartnerKpiCard } from '../components/PartnerKpiCard';
import { usePartnerDashboard } from '../hooks/usePartnerDashboard';

export function PartnerDashboard() {
  const { pendingRfqs, activePOs, monthlyRevenue, recentPOs, urgentRfqs, loading, error } = usePartnerDashboard();

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="partner-dashboard">
      <h1>Partner Dashboard</h1>

      <div className="kpi-grid">
        <PartnerKpiCard
          title="Pending RFQs"
          value={pendingRfqs}
          variant={pendingRfqs > 0 ? 'warning' : 'default'}
        />
        <PartnerKpiCard title="Active POs" value={activePOs} />
        <PartnerKpiCard
          title="Monthly Revenue"
          value={`$${monthlyRevenue.toLocaleString()}`}
          variant="success"
        />
      </div>

      {urgentRfqs.length > 0 && (
        <section className="dashboard-section">
          <h2>Urgent RFQs</h2>
          <div className="rfq-alerts">
            {urgentRfqs.map((rfq) => (
              <Link key={rfq.id} to={`/partner/rfqs/${rfq.quoteId}`} className="rfq-alert-item">
                <span className="rfq-ref">{rfq.anonymizedRef}</span>
                <span className="rfq-items">{rfq.lineItemCount} items</span>
                <span className="rfq-date">{new Date(rfq.sentAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Recent Purchase Orders</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>Items</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentPOs.map((po) => (
              <tr key={po.id}>
                <td>
                  <Link to={`/partner/orders/${po.id}`}>{po.anonymizedRef}</Link>
                </td>
                <td><span className={`status-badge status-badge--${po.status}`}>{po.status.replace(/_/g, ' ')}</span></td>
                <td>{po.lineItemCount}</td>
                <td>${po.total.toLocaleString()}</td>
                <td>{new Date(po.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit Chunk 2**

```bash
git add src/features/partner-portal/
git commit -m "feat(partner): add partner dashboard with KPIs and recent POs"
```

---

## Chunk 3: RFQ Inbox & Detail (Tasks 9–12)

### Task 9: RFQ hooks

**Files:** Create `src/features/partner-portal/hooks/useRfqs.ts`

- [ ] **Step 1: Write RFQ hooks**

```typescript
// src/features/partner-portal/hooks/useRfqs.ts
import { useState, useEffect, useCallback } from 'react';
import { rfqApi } from '../services/partner.api';
import type { PartnerRfq } from '../services/partner.api';

export function useRfqList() {
  const [rfqs, setRfqs] = useState<PartnerRfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchRfqs = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      const result = await rfqApi.list(cursor);
      setRfqs((prev) => cursor ? [...prev, ...result.data] : result.data);
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRfqs(); }, [fetchRfqs]);

  return { rfqs, loading, error, nextCursor, loadMore: () => nextCursor && fetchRfqs(nextCursor), refresh: () => fetchRfqs() };
}

export function useRfqDetail(quoteId: string) {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rfqApi.getDetail(quoteId).then(setQuote).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [quoteId]);

  const respond = async (lineItems: { lineItemId: string; unitPrice: number }[], notes?: string) => {
    await rfqApi.respond(quoteId, { lineItems, notes });
    // Refresh
    const updated = await rfqApi.getDetail(quoteId);
    setQuote(updated);
  };

  return { quote, loading, error, respond };
}
```

### Task 10: RFQ Inbox page

**Files:** Create `src/features/partner-portal/pages/RfqInbox.tsx`

- [ ] **Step 1: Write RFQ inbox**

```tsx
// src/features/partner-portal/pages/RfqInbox.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useRfqList } from '../hooks/useRfqs';

function urgencyColor(sentAt: string): string {
  const hoursAgo = (Date.now() - new Date(sentAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo > 72) return 'critical';
  if (hoursAgo > 24) return 'warning';
  return 'normal';
}

export function RfqInbox() {
  const { rfqs, loading, error, nextCursor, loadMore } = useRfqList();

  if (loading && rfqs.length === 0) return <div className="loading">Loading RFQs...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const pending = rfqs.filter((r) => r.status === 'sent');
  const responded = rfqs.filter((r) => r.status !== 'sent');

  return (
    <div className="rfq-inbox">
      <h1>RFQ Inbox</h1>

      {pending.length > 0 && (
        <section>
          <h2>Pending ({pending.length})</h2>
          <div className="rfq-list">
            {pending.map((rfq) => (
              <Link key={rfq.id} to={`/partner/rfqs/${rfq.quoteId}`} className={`rfq-card rfq-card--${urgencyColor(rfq.sentAt)}`}>
                <div className="rfq-card__header">
                  <span className="rfq-card__ref">{rfq.anonymizedRef}</span>
                  <span className={`urgency-dot urgency-dot--${urgencyColor(rfq.sentAt)}`} />
                </div>
                <div className="rfq-card__body">
                  <span>{rfq.lineItemCount} items</span>
                  <span>Received {new Date(rfq.sentAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {responded.length > 0 && (
        <section>
          <h2>History</h2>
          <table className="data-table">
            <thead>
              <tr><th>Client</th><th>Status</th><th>Items</th><th>Date</th></tr>
            </thead>
            <tbody>
              {responded.map((rfq) => (
                <tr key={rfq.id}>
                  <td><Link to={`/partner/rfqs/${rfq.quoteId}`}>{rfq.anonymizedRef}</Link></td>
                  <td><span className={`status-badge status-badge--${rfq.status}`}>{rfq.status}</span></td>
                  <td>{rfq.lineItemCount}</td>
                  <td>{new Date(rfq.sentAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {nextCursor && (
        <button onClick={loadMore} className="btn btn-secondary" disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Task 11: RFQ Detail page with pricing form

**Files:** Create `src/features/partner-portal/pages/RfqDetail.tsx`

- [ ] **Step 1: Write RFQ detail with pricing**

```tsx
// src/features/partner-portal/pages/RfqDetail.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRfqDetail } from '../hooks/useRfqs';

export function RfqDetail() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { quote, loading, error, respond } = useRfqDetail(quoteId!);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="loading">Loading RFQ...</div>;
  if (error || !quote) return <div className="error">{error || 'RFQ not found'}</div>;

  const lineItems = quote.quote_line_item ?? [];
  const canRespond = quote.status === 'rfq_pending';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const lineItemPrices = Object.entries(prices)
        .filter(([, price]) => price !== '')
        .map(([lineItemId, price]) => ({
          lineItemId,
          unitPrice: parseFloat(price),
        }));
      await respond(lineItemPrices, notes || undefined);
      navigate('/partner/rfqs');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="rfq-detail">
      <h1>RFQ Detail</h1>
      <p className="rfq-meta">
        Status: <span className={`status-badge status-badge--${quote.status}`}>{quote.status}</span>
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Brand</th>
            <th>Model</th>
            <th>Serial</th>
            <th>Coverage</th>
            <th>Duration</th>
            <th>Qty</th>
            {canRespond && <th>Your Price</th>}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li: any) => (
            <tr key={li.id}>
              <td>{li.asset_item?.brand ?? '—'}</td>
              <td>{li.asset_item?.model ?? '—'}</td>
              <td>{li.asset_item?.serial ?? '—'}</td>
              <td>{li.coverage_type.toUpperCase()}</td>
              <td>{li.duration_months}mo</td>
              <td>{li.quantity}</td>
              {canRespond && (
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={prices[li.id] ?? ''}
                    onChange={(e) => setPrices((p) => ({ ...p, [li.id]: e.target.value }))}
                    className="price-input"
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {canRespond && (
        <div className="rfq-response-form">
          <label>
            Notes (volume discounts, lead time, etc.)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
            />
          </label>
          <div className="form-actions">
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
              {submitting ? 'Submitting...' : 'Submit Pricing'}
            </button>
            <button onClick={() => navigate('/partner/rfqs')} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit Chunk 3**

```bash
git add src/features/partner-portal/
git commit -m "feat(partner): add RFQ inbox and detail with pricing response form"
```

---

## Chunk 4: Price Lists Management (Tasks 12–14)

### Task 12: Price list hooks

**Files:** Create `src/features/partner-portal/hooks/usePriceLists.ts`

- [ ] **Step 1: Write price list hooks**

```typescript
// src/features/partner-portal/hooks/usePriceLists.ts
import { useState, useEffect, useCallback } from 'react';
import { priceListApi } from '../services/partner.api';
import type { PriceListEntry } from '../services/partner.api';

export function usePriceLists() {
  const [entries, setEntries] = useState<PriceListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await priceListApi.list();
      setEntries(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (entry: Omit<PriceListEntry, 'id'>) => {
    await priceListApi.create(entry);
    await refresh();
  };

  const update = async (id: string, entry: Partial<PriceListEntry>) => {
    await priceListApi.update(id, entry);
    await refresh();
  };

  const remove = async (id: string) => {
    await priceListApi.remove(id);
    await refresh();
  };

  return { entries, loading, error, create, update, remove, refresh };
}
```

### Task 13: Price Lists page

**Files:** Create `src/features/partner-portal/pages/PriceLists.tsx`

- [ ] **Step 1: Write price lists page**

```tsx
// src/features/partner-portal/pages/PriceLists.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePriceLists } from '../hooks/usePriceLists';

export function PriceLists() {
  const { entries, loading, error, remove } = usePriceLists();
  const [filter, setFilter] = useState('');

  if (loading) return <div className="loading">Loading price lists...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const filtered = entries.filter((e) =>
    !filter || e.brand.toLowerCase().includes(filter.toLowerCase()) ||
    e.model_pattern.toLowerCase().includes(filter.toLowerCase())
  );

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  return (
    <div className="price-lists">
      <div className="page-header">
        <h1>Price Lists</h1>
        <Link to="/partner/price-lists/new" className="btn btn-primary">Add Entry</Link>
      </div>

      <input
        type="text"
        placeholder="Filter by brand or model..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="filter-input"
      />

      <table className="data-table">
        <thead>
          <tr>
            <th>Brand</th>
            <th>Model Pattern</th>
            <th>Coverage</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Valid From</th>
            <th>Valid Until</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry) => (
            <tr key={entry.id} className={isExpired(entry.valid_until) ? 'row--expired' : ''}>
              <td>{entry.brand}</td>
              <td><code>{entry.model_pattern}</code></td>
              <td>{entry.coverage_type.toUpperCase()}</td>
              <td>{entry.duration_months}mo</td>
              <td>${entry.unit_price.toLocaleString()}</td>
              <td>{entry.valid_from}</td>
              <td>{entry.valid_until}</td>
              <td>
                <Link to={`/partner/price-lists/${entry.id}/edit`} className="btn btn-sm">Edit</Link>
                <button onClick={() => remove(entry.id)} className="btn btn-sm btn-danger">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && <p className="empty-state">No price list entries found.</p>}
    </div>
  );
}
```

### Task 14: Price List form (add/edit)

**Files:** Create `src/features/partner-portal/pages/PriceListForm.tsx`

- [ ] **Step 1: Write price list form**

```tsx
// src/features/partner-portal/pages/PriceListForm.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { priceListApi } from '../services/partner.api';

export function PriceListForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    brand: '',
    model_pattern: '',
    coverage_type: 'tpm' as 'tpm' | 'oem',
    duration_months: 12,
    unit_price: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      // Fetch existing entry for editing
      priceListApi.list().then((result) => {
        const entry = result.data.find((e) => e.id === id);
        if (entry) {
          setForm({
            brand: entry.brand,
            model_pattern: entry.model_pattern,
            coverage_type: entry.coverage_type,
            duration_months: entry.duration_months,
            unit_price: entry.unit_price,
            valid_from: entry.valid_from,
            valid_until: entry.valid_until,
          });
        }
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        await priceListApi.update(id!, form);
      } else {
        await priceListApi.create(form);
      }
      navigate('/partner/price-lists');
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="price-list-form">
      <h1>{isEdit ? 'Edit' : 'Add'} Price List Entry</h1>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Brand
            <input type="text" value={form.brand} onChange={(e) => update('brand', e.target.value)} required />
          </label>

          <label>
            Model Pattern
            <input type="text" value={form.model_pattern} onChange={(e) => update('model_pattern', e.target.value)} required placeholder="e.g. PowerEdge R7*" />
            <small>Use * as wildcard</small>
          </label>

          <label>
            Coverage Type
            <select value={form.coverage_type} onChange={(e) => update('coverage_type', e.target.value)}>
              <option value="tpm">TPM</option>
              <option value="oem">OEM</option>
            </select>
          </label>

          <label>
            Duration (months)
            <input type="number" min="1" value={form.duration_months} onChange={(e) => update('duration_months', parseInt(e.target.value))} required />
          </label>

          <label>
            Unit Price ($)
            <input type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => update('unit_price', parseFloat(e.target.value))} required />
          </label>

          <label>
            Valid From
            <input type="date" value={form.valid_from} onChange={(e) => update('valid_from', e.target.value)} required />
          </label>

          <label>
            Valid Until
            <input type="date" value={form.valid_until} onChange={(e) => update('valid_until', e.target.value)} required />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
          <button type="button" onClick={() => navigate('/partner/price-lists')} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit Chunk 4**

```bash
git add src/features/partner-portal/
git commit -m "feat(partner): add price list management with CRUD and filtering"
```

---

## Chunk 5: Active POs & Acknowledgement (Tasks 15–18)

### Task 15: Order hooks

**Files:** Create `src/features/partner-portal/hooks/usePartnerOrders.ts`

- [ ] **Step 1: Write order hooks**

```typescript
// src/features/partner-portal/hooks/usePartnerOrders.ts
import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '../services/partner.api';
import type { PartnerPO } from '../services/partner.api';

export function usePartnerOrders(statusFilter?: string) {
  const [orders, setOrders] = useState<PartnerPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await orderApi.list(undefined, statusFilter);
      setOrders(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  return { orders, loading, error, refresh };
}

export function usePartnerOrderDetail(orderId: string) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await orderApi.getDetail(orderId);
      setOrder(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { refresh(); }, [refresh]);

  const acknowledge = async () => {
    await orderApi.acknowledge(orderId);
    await refresh();
  };

  return { order, loading, error, acknowledge, refresh };
}
```

### Task 16: Status stepper component

**Files:** Create `src/features/partner-portal/components/StatusStepper.tsx`

- [ ] **Step 1: Write status stepper**

```tsx
// src/features/partner-portal/components/StatusStepper.tsx
import React from 'react';

const PO_STEPS = [
  'submitted', 'under_review', 'approved', 'routed',
  'acknowledged', 'entitlement_verified', 'completed',
];

interface StatusStepperProps {
  currentStatus: string;
}

export function StatusStepper({ currentStatus }: StatusStepperProps) {
  const currentIndex = PO_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="status-stepper">
      {PO_STEPS.map((step, i) => {
        let state: 'done' | 'current' | 'upcoming' = 'upcoming';
        if (isCancelled) state = 'upcoming';
        else if (i < currentIndex) state = 'done';
        else if (i === currentIndex) state = 'current';

        return (
          <div key={step} className={`step step--${state}`}>
            <div className="step__dot" />
            <span className="step__label">{step.replace(/_/g, ' ')}</span>
          </div>
        );
      })}
      {isCancelled && (
        <div className="step step--cancelled">
          <div className="step__dot" />
          <span className="step__label">cancelled</span>
        </div>
      )}
    </div>
  );
}
```

### Task 17: Active POs page

**Files:** Create `src/features/partner-portal/pages/ActivePOs.tsx`

- [ ] **Step 1: Write active POs page**

```tsx
// src/features/partner-portal/pages/ActivePOs.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePartnerOrders } from '../hooks/usePartnerOrders';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'routed', label: 'Routed' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'entitlement_verified', label: 'Verified' },
  { value: 'completed', label: 'Completed' },
];

export function ActivePOs() {
  const [statusFilter, setStatusFilter] = useState('');
  const { orders, loading, error } = usePartnerOrders(statusFilter || undefined);

  if (loading) return <div className="loading">Loading orders...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="active-pos">
      <h1>Active Purchase Orders</h1>

      <div className="filter-bar">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`filter-btn ${statusFilter === f.value ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Status</th>
            <th>Items</th>
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((po) => (
            <tr key={po.id}>
              <td><Link to={`/partner/orders/${po.id}`}>{po.anonymizedRef}</Link></td>
              <td><span className={`status-badge status-badge--${po.status}`}>{po.status.replace(/_/g, ' ')}</span></td>
              <td>{po.lineItemCount}</td>
              <td>${po.total.toLocaleString()}</td>
              <td>{new Date(po.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && <p className="empty-state">No purchase orders found.</p>}
    </div>
  );
}
```

### Task 18: PO Detail page

**Files:** Create `src/features/partner-portal/pages/PODetail.tsx`

- [ ] **Step 1: Write PO detail**

```tsx
// src/features/partner-portal/pages/PODetail.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePartnerOrderDetail } from '../hooks/usePartnerOrders';
import { StatusStepper } from '../components/StatusStepper';

export function PODetail() {
  const { id } = useParams<{ id: string }>();
  const { order, loading, error, acknowledge } = usePartnerOrderDetail(id!);

  if (loading) return <div className="loading">Loading order...</div>;
  if (error || !order) return <div className="error">{error || 'Order not found'}</div>;

  const lineItems = order.order_line_item ?? [];
  const canAcknowledge = order.status === 'routed';
  const needsEntitlement = order.status === 'acknowledged';

  return (
    <div className="po-detail">
      <h1>Purchase Order</h1>

      <StatusStepper currentStatus={order.status} />

      <div className="po-info">
        <p><strong>Total:</strong> ${parseFloat(order.total).toLocaleString()}</p>
        <p><strong>Created:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
        {order.vendor_po_ref && <p><strong>Vendor Ref:</strong> {order.vendor_po_ref}</p>}
      </div>

      <h2>Line Items</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Coverage</th>
            <th>Duration</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li: any) => (
            <tr key={li.id}>
              <td>{li.coverage_type.toUpperCase()}</td>
              <td>{li.duration_months}mo</td>
              <td>{li.quantity}</td>
              <td>${parseFloat(li.unit_price).toLocaleString()}</td>
              <td>${(parseFloat(li.unit_price) * li.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="po-actions">
        {canAcknowledge && (
          <button onClick={acknowledge} className="btn btn-primary">
            Acknowledge Receipt
          </button>
        )}
        {needsEntitlement && (
          <Link to={`/partner/entitlements/${order.id}`} className="btn btn-primary">
            Enter Entitlements
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit Chunk 5**

```bash
git add src/features/partner-portal/
git commit -m "feat(partner): add active POs listing, detail view, and acknowledgement"
```

---

## Chunk 6: Entitlements (Tasks 19–22)

### Task 19: Entitlement hooks

**Files:** Create `src/features/partner-portal/hooks/useEntitlements.ts`

- [ ] **Step 1: Write entitlement hooks**

```typescript
// src/features/partner-portal/hooks/useEntitlements.ts
import { useState } from 'react';
import { entitlementApi } from '../services/partner.api';

export interface EntitlementEntry {
  assetId: string;
  entitlementId: string;
  coverageStart: string;
  coverageEnd: string;
}

export function useEntitlementSubmit(orderId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (entitlements: EntitlementEntry[]) => {
    setSubmitting(true);
    setError(null);
    try {
      await entitlementApi.submit(orderId, entitlements);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, error, success };
}
```

### Task 20: Entitlements listing page

**Files:** Create `src/features/partner-portal/pages/Entitlements.tsx`

- [ ] **Step 1: Write entitlements page**

```tsx
// src/features/partner-portal/pages/Entitlements.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePartnerOrders } from '../hooks/usePartnerOrders';

export function Entitlements() {
  const { orders, loading, error } = usePartnerOrders('acknowledged');

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="entitlements-page">
      <h1>Entitlements</h1>
      <p>Enter entitlement details for acknowledged purchase orders.</p>

      {orders.length === 0 ? (
        <p className="empty-state">No orders awaiting entitlement entry.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Items</th>
              <th>Total</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => (
              <tr key={po.id}>
                <td>{po.anonymizedRef}</td>
                <td>{po.lineItemCount}</td>
                <td>${po.total.toLocaleString()}</td>
                <td>{new Date(po.createdAt).toLocaleDateString()}</td>
                <td>
                  <Link to={`/partner/entitlements/${po.id}`} className="btn btn-sm btn-primary">
                    Enter Entitlements
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### Task 21: Entitlement form page

**Files:** Create `src/features/partner-portal/pages/EntitlementForm.tsx`

- [ ] **Step 1: Write entitlement entry form**

```tsx
// src/features/partner-portal/pages/EntitlementForm.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePartnerOrderDetail } from '../hooks/usePartnerOrders';
import { useEntitlementSubmit, type EntitlementEntry } from '../hooks/useEntitlements';

export function EntitlementForm() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, loading: orderLoading } = usePartnerOrderDetail(orderId!);
  const { submit, submitting, error, success } = useEntitlementSubmit(orderId!);

  const [entries, setEntries] = useState<Record<string, EntitlementEntry>>({});

  if (orderLoading) return <div className="loading">Loading order...</div>;
  if (!order) return <div className="error">Order not found</div>;

  const lineItems = order.order_line_item ?? [];

  const updateEntry = (assetId: string, field: keyof EntitlementEntry, value: string) => {
    setEntries((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        assetId,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    const entitlements = Object.values(entries).filter(
      (e) => e.entitlementId && e.coverageStart && e.coverageEnd
    );
    if (entitlements.length === 0) return;
    await submit(entitlements);
  };

  if (success) {
    return (
      <div className="entitlement-success">
        <h1>Entitlements Submitted</h1>
        <p>Entitlement details have been submitted for operator verification.</p>
        <button onClick={() => navigate('/partner/entitlements')} className="btn btn-primary">
          Back to Entitlements
        </button>
      </div>
    );
  }

  return (
    <div className="entitlement-form">
      <h1>Enter Entitlements</h1>
      <p>For each line item, enter the entitlement ID and coverage dates from the provisioning system.</p>

      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Coverage</th>
            <th>Duration</th>
            <th>Entitlement ID</th>
            <th>Coverage Start</th>
            <th>Coverage End</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li: any) => (
            <tr key={li.id}>
              <td>{li.coverage_type.toUpperCase()}</td>
              <td>{li.duration_months}mo</td>
              <td>
                <input
                  type="text"
                  placeholder="ENT-XXXX"
                  value={entries[li.asset_id]?.entitlementId ?? ''}
                  onChange={(e) => updateEntry(li.asset_id, 'entitlementId', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={entries[li.asset_id]?.coverageStart ?? ''}
                  onChange={(e) => updateEntry(li.asset_id, 'coverageStart', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={entries[li.asset_id]?.coverageEnd ?? ''}
                  onChange={(e) => updateEntry(li.asset_id, 'coverageEnd', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="form-actions">
        <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
          {submitting ? 'Submitting...' : 'Submit Entitlements'}
        </button>
        <button onClick={() => navigate('/partner/entitlements')} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

### Task 22: Feature exports & final integration

**Files:** Create `src/features/partner-portal/index.ts`

- [ ] **Step 1: Write feature exports**

```typescript
// src/features/partner-portal/index.ts
export { PartnerRouter } from './PartnerRouter';
export { PartnerLayout } from './PartnerLayout';
```

- [ ] **Step 2: Integrate into main app router**

Add to the main app router (e.g., `src/app/App.tsx` or router config):

```tsx
// In the main router, add:
import { PartnerRouter } from '../features/partner-portal';

// Inside <Routes>:
<Route path="/partner/*" element={<PartnerRouter orgType={user.orgType} />} />
```

- [ ] **Step 3: Commit Chunk 6**

```bash
git add src/features/partner-portal/
git commit -m "feat(partner): add entitlement entry, feature exports, and router integration"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1–5 | API service, Zustand store, sidebar, layout, router with role gate |
| 2 | 6–8 | Partner dashboard with KPIs, urgent RFQs, recent POs |
| 3 | 9–11 | RFQ inbox with urgency indicators, detail with pricing form |
| 4 | 12–14 | Price list CRUD with filtering and add/edit form |
| 5 | 15–18 | Active POs listing, detail with status stepper, acknowledge action |
| 6 | 19–22 | Entitlement entry form, listing, feature exports, router integration |

**Total: 22 tasks across 6 chunks**

**Key patterns throughout:**
- All data fetched through typed API service (`partner.api.ts`)
- Partners never see VAR identities — `anonymizedRef` everywhere
- Role-gated at router level (`org_type === 'delivery_partner'`)
- Feature module structure under `src/features/partner-portal/`
- Uses existing component library patterns (Badge, Card, etc.)
- Cursor-based pagination on all list views
