# RenewFlow — Frictionless MVP Implementation Prompt

## Project Context

**Repo:** `/Users/fliaroach/renewflo` (GitHub: KenRoach/renewflo)
**Deployed:** www.renewflow.io (Railway — frontend + API services)
**API:** `https://api-production-dcc6.up.railway.app` (Fastify + Supabase)
**Supabase project:** `wulcqavwmbmpugcxcubx`
**Branding:** Blue #2563EB accent, DM Sans font, dark text #1E293B
**Email:** Resend via `noreply@renewflow.io` (domain verified, DKIM + SPF)

## Current State

The backend API is fully implemented with all routes, services, repositories, and Supabase schema. The frontend is a React 19 + TypeScript + Vite SPA with Zustand state management. **The frontend currently runs on seed/mock data and is NOT wired to the API for data operations.** Auth (signup, login, forgot-password) works end-to-end.

## What Needs to Be Done (7 workstreams)

---

### 1. Data Persistence — Wire Frontend to API

**Goal:** Replace all seed/mock data with real Supabase-backed API calls.

**Backend status:** All routes deployed and working at `https://api-production-dcc6.up.railway.app`

**Frontend API client exists at:** `src/services/gateway.ts` — has clients for assets, orders, support, notifications, but they need to be connected to the Zustand stores.

**Tasks:**
- Update `src/stores/assets.ts` — replace `INITIAL_ASSETS` seed data with `GET /assets` API call on hydrate
- Update `src/stores/` — create or update stores for orders, quotes, support, notifications
- Wire all CRUD operations through the API client:
  - Assets: list, getById, update, delete
  - Orders: list, getById, create (from accepted quote)
  - Support tickets: list, getById, create, update, escalate
  - Notifications: list, markRead, markAllRead
- Add auth token to all API requests (stored after login via `/auth/token`)
- Add loading states and error handling for all API calls
- Ensure per-org data isolation (API handles this via JWT claims)

**API endpoints (all under base URL, authenticated with Bearer token):**
```
GET    /assets?cursor=&limit=50&status=&tier=&brand=&search=
GET    /assets/:id
PATCH  /assets/:id
DELETE /assets/:id
GET    /orders?cursor=&limit=50&status=
GET    /orders/:id
POST   /orders  { quoteId }
GET    /support?cursor=&limit=50&status=
POST   /support { subject, description?, assetId?, poId?, priority }
GET    /support/:id
PATCH  /support/:id
POST   /support/:id/escalate
GET    /notifications?cursor=&limit=50&unreadOnly=
PATCH  /notifications/:id/read
POST   /notifications/mark-all-read
GET    /users/me
```

---

### 2. Asset Import — Excel/CSV to Supabase

**Goal:** VAR uploads Excel/CSV → assets persist to Supabase under their org.

**Backend:** `POST /assets/import` accepts multipart file upload (XLSX). Columns: brand, model, serial, warranty_end, device_type?, tier?, purchase_date?. Returns `{ batchId, imported, total }`.

**Tasks:**
- Update `src/features/import/ImportModule.tsx` to POST the file to `/assets/import` instead of processing client-side only
- After successful import, refresh the asset store from API
- Show import results (imported count, errors)
- Add progress indicator during upload

---

### 3. Forgot-Password Landing Page

**Goal:** User clicks reset link in email → sees a password reset form → sets new password.

**Tasks:**
- Create `src/features/auth/ResetPasswordPage.tsx`
  - Parse `?token=` from URL
  - Show form: new password + confirm password
  - POST to `/auth/reset-password` with `{ token, password }`
  - On success, redirect to login with success message
  - On error (expired/invalid token), show error with link to request new reset
- Add route handling in `src/app/App.tsx` for `/reset-password`
- The API endpoint already exists and works

---

### 4. Email Verification Flow

**Goal:** After signup, user verifies email before accessing the app.

**Supabase config:** `mailer_autoconfirm: false` — Supabase sends a confirmation email automatically on signup.

**Tasks:**
- Create `src/features/auth/VerifyEmailPage.tsx`
  - Show "Check your email" message after signup
  - Handle the Supabase confirmation callback URL (Supabase redirects to `site_url` with tokens in URL hash)
- Update signup flow to redirect to verify-email page instead of dashboard
- Handle the Supabase auth callback: parse tokens from URL, confirm session
- Add route in App.tsx for `/verify-email` and `/auth/callback`
- **Supabase site_url** is already set to `https://www.renewflow.io`

---

### 5. Real Quote Generation

**Goal:** VARs can select assets, request quotes with real pricing from delivery partners.

**Backend:** Full quote lifecycle implemented:
- `POST /quotes` — create quote with line items
- `POST /quotes/:id/submit` — submit for pricing
- `GET /quotes` — list quotes with status
- `POST /quotes/:id/accept` / `reject`
- Operator: `POST /quotes/:id/rfq/send` — send RFQ to partners
- Partner: `POST /quotes/:id/rfq/respond` — respond with pricing
- `POST /price-lists/lookup` — find matching prices

**Tasks:**
- Add quote API client to `src/services/gateway.ts`:
  ```typescript
  quotes: {
    list(params?): Promise<PaginatedResponse<Quote>>
    getById(id): Promise<Quote>
    create(body: { lineItems: QuoteLineItem[] }): Promise<Quote>
    submit(id): Promise<Quote>
    accept(id): Promise<Quote>
    reject(id): Promise<Quote>
  }
  ```
- Update `src/features/quoter/QuoterPage.tsx`:
  - Replace mock pricing with real API calls
  - Add asset selection → create quote flow
  - Show quote status progression (draft → pending → priced → accepted)
  - Add accept/reject actions on priced quotes
- Create Zustand store for quotes
- Wire price display from actual quote line items (unit_price from partner responses)

**Quote status flow:** `draft → pending → pricing → rfq_pending → priced → accepted|rejected|requote → expired`

---

### 6. Notification/Alert System — Scheduled Warranty Alerts

**Goal:** Automatically send email alerts when warranties are about to expire.

**Backend:** Notification routes exist. Email templates configured in Supabase (branded via Resend).

**Tasks:**
- Create a scheduled job (Railway cron or separate service) that runs daily:
  1. Query `asset_item` for items with warranty_end approaching (90, 60, 30, 14, 7, 0 days)
  2. Create `notif_alert` records for matching assets
  3. Send email via Resend using the warranty alert template
  4. Update asset status through the alert pipeline (discovered → alerted-90 → alerted-60 → etc.)
  5. Log to `notif_email_log`
- Wire frontend notifications page to API:
  - `GET /notifications` with unread badge count
  - Mark as read on click
  - Mark all as read button
- Add real-time notification indicator in sidebar (poll or Supabase realtime)

**Alert schedule:**
| Days to Expiry | Priority | Asset Status |
|---------------|----------|--------------|
| 90 | medium | alerted-90 |
| 60 | medium | alerted-60 |
| 30 | high | alerted-30 |
| 14 | high | alerted-14 |
| 7 | critical | alerted-7 |
| 0 (lapsed) | high | lapsed |

---

### 7. Multi-User / Team Management

**Goal:** Admins can invite team members, manage roles, org-level access control.

**Backend:**
- `POST /users/invite` — invite user by email (admin only)
- `GET /users` — list org users (admin only)
- `PATCH /users/:id` — update role/active status (admin only)
- `DELETE /users/:id` — deactivate user (admin only)

**Supabase schema:**
- `core_user`: id, org_id, email, full_name, role (admin|member|viewer), active
- `core_organization`: id, name, type (var|operator|delivery_partner), country

**Tasks:**
- Add users API client to `src/services/gateway.ts`
- Create `src/features/settings/TeamPage.tsx` (or add to existing settings):
  - List team members with role badges
  - Invite form (email + role selector)
  - Edit role dropdown
  - Deactivate toggle
- Add role-based UI rendering:
  - Admin: sees team management, all features
  - Member: sees assets, quotes, orders (no team management)
  - Viewer: read-only access
- Store current user role in auth context
- Hide/show UI elements based on role
- Invite email uses the branded Supabase invite template (already configured)

---

## Technical Notes

- **Auth token:** Stored after `/auth/token` login. Include as `Authorization: Bearer <token>` on all API requests.
- **Pagination:** All list endpoints use cursor-based pagination: `{ data, nextCursor, hasMore }`. Pass `cursor` param for next page.
- **Org isolation:** API automatically scopes all queries to the user's org via JWT claims. Frontend doesn't need to manage org_id.
- **Role enforcement:** API returns 403 for unauthorized role access. Frontend should hide UI elements proactively.
- **Supabase Realtime:** Consider using Supabase JS client for real-time notifications (optional, polling works too).
- **Error format:** API returns `{ code, message, traceId }` on errors.

## Priority Order

1. **Data persistence** (assets + orders wired to API) — makes the app functional
2. **Reset password page** — completes the auth flow users are already hitting
3. **Email verification** — prevents stuck users after signup
4. **Asset import** — #1 onboarding action
5. **Quotes** — core business value
6. **Notifications** — retention + urgency
7. **Team management** — multi-user support

## Deployment

- Frontend: push to `main` on `KenRoach/renewflo` → Railway auto-deploys
- API: push to `main` on `KenRoach/renewflo` (server/ directory) → Railway auto-deploys
- Supabase migrations: run via Supabase dashboard SQL editor or CLI
