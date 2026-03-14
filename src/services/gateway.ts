// ─── RenewFlow API Gateway Client ───
// Direct REST client for the RenewFlow backend (Fastify + Supabase)

const API_URL = import.meta.env.VITE_API_URL || "https://api-production-dcc6.up.railway.app/api/v1";
const TOKEN_KEY = "renewflow_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;
  traceId?: string;

  constructor(status: number, code: string, message: string, traceId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("renewflow_user");
    window.dispatchEvent(new CustomEvent("renewflow:auth-expired"));
    throw new ApiError(401, "AUTH_EXPIRED", "Session expired");
  }

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.code || "API_ERROR",
      data.message || `Request failed (${res.status})`,
      data.traceId,
    );
  }

  return data as T;
}

// ─── Pagination ───

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Assets ───

export interface ApiAsset {
  id: string;
  org_id: string;
  brand: string;
  model: string;
  serial: string;
  device_type: string | null;
  tier: string;
  warranty_end: string;
  purchase_date: string | null;
  status: string;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
  daysLeft: number; // computed by API
}

export interface ListAssetsParams {
  cursor?: string;
  limit?: number;
  status?: string;
  tier?: string;
  brand?: string;
  search?: string;
}

export const assets = {
  async list(params: ListAssetsParams = {}): Promise<PaginatedResponse<ApiAsset>> {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.status) qs.set("status", params.status);
    if (params.tier) qs.set("tier", params.tier);
    if (params.brand) qs.set("brand", params.brand);
    if (params.search) qs.set("search", params.search);
    const query = qs.toString();
    return request<PaginatedResponse<ApiAsset>>(`/assets${query ? `?${query}` : ""}`);
  },

  async getById(id: string): Promise<ApiAsset> {
    return request<ApiAsset>(`/assets/${id}`);
  },

  async update(id: string, body: Record<string, unknown>): Promise<ApiAsset> {
    return request<ApiAsset>(`/assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async remove(id: string): Promise<void> {
    return request<void>(`/assets/${id}`, { method: "DELETE" });
  },

  async importFile(file: File): Promise<{ batchId: string; imported: number; total: number }> {
    const form = new FormData();
    form.append("file", file);
    return request(`/assets/import`, {
      method: "POST",
      body: form,
    });
  },
};

// ─── Orders ───

export interface ApiOrder {
  id: string;
  org_id: string;
  quote_id: string | null;
  status: string;
  total_amount: number;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

export interface ListOrdersParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export const orders = {
  async list(params: ListOrdersParams = {}): Promise<PaginatedResponse<ApiOrder>> {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.status) qs.set("status", params.status);
    const query = qs.toString();
    return request<PaginatedResponse<ApiOrder>>(`/orders${query ? `?${query}` : ""}`);
  },

  async getById(id: string): Promise<ApiOrder> {
    return request<ApiOrder>(`/orders/${id}`);
  },

  async create(body: { quoteId: string }): Promise<ApiOrder> {
    return request<ApiOrder>(`/orders`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// ─── Support ───

export interface ApiTicket {
  id: string;
  org_id: string;
  reported_by: string;
  subject: string;
  description: string | null;
  asset_id: string | null;
  po_id: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketBody {
  subject: string;
  description?: string;
  assetId?: string;
  poId?: string;
  priority: string;
}

export interface ListTicketsParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export const support = {
  async list(params: ListTicketsParams = {}): Promise<PaginatedResponse<ApiTicket>> {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.status) qs.set("status", params.status);
    const query = qs.toString();
    return request<PaginatedResponse<ApiTicket>>(`/support${query ? `?${query}` : ""}`);
  },

  async getById(id: string): Promise<ApiTicket> {
    return request<ApiTicket>(`/support/${id}`);
  },

  async create(body: CreateTicketBody): Promise<ApiTicket> {
    return request<ApiTicket>(`/support`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id: string, body: Record<string, unknown>): Promise<ApiTicket> {
    return request<ApiTicket>(`/support/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async escalate(id: string): Promise<ApiTicket> {
    return request<ApiTicket>(`/support/${id}/escalate`, { method: "POST" });
  },
};

// ─── Notifications ───

export interface ApiNotification {
  id: string;
  org_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  asset_id: string | null;
  created_at: string;
}

export interface ListNotificationsParams {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
}

export const notifications = {
  async list(params: ListNotificationsParams = {}): Promise<PaginatedResponse<ApiNotification>> {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.unreadOnly) qs.set("unreadOnly", "true");
    const query = qs.toString();
    return request<PaginatedResponse<ApiNotification>>(`/notifications${query ? `?${query}` : ""}`);
  },

  async markRead(id: string): Promise<void> {
    await request(`/notifications/${id}/read`, { method: "PATCH" });
  },

  async markAllRead(): Promise<void> {
    await request(`/notifications/mark-all-read`, { method: "POST" });
  },
};

// ─── Quotes ───

export interface ApiQuote {
  id: string;
  org_id: string;
  status: string;
  total_amount: number | null;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  line_items: ApiQuoteLineItem[];
}

export interface ApiQuoteLineItem {
  id: string;
  asset_id: string | null;
  brand: string;
  model: string;
  serial: string | null;
  coverage_type: string;
  unit_price: number | null;
  quantity: number;
}

export interface CreateQuoteBody {
  lineItems: {
    assetId?: string;
    brand: string;
    model: string;
    serial?: string;
    coverageType: "tpm" | "oem";
    quantity: number;
  }[];
}

export interface ListQuotesParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export const quotes = {
  async list(params: ListQuotesParams = {}): Promise<PaginatedResponse<ApiQuote>> {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.status) qs.set("status", params.status);
    const query = qs.toString();
    return request<PaginatedResponse<ApiQuote>>(`/quotes${query ? `?${query}` : ""}`);
  },

  async getById(id: string): Promise<ApiQuote> {
    return request<ApiQuote>(`/quotes/${id}`);
  },

  async create(body: CreateQuoteBody): Promise<ApiQuote> {
    return request<ApiQuote>(`/quotes`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async submit(id: string): Promise<ApiQuote> {
    return request<ApiQuote>(`/quotes/${id}/submit`, { method: "POST" });
  },

  async accept(id: string): Promise<ApiQuote> {
    return request<ApiQuote>(`/quotes/${id}/accept`, { method: "POST" });
  },

  async reject(id: string): Promise<ApiQuote> {
    return request<ApiQuote>(`/quotes/${id}/reject`, { method: "POST" });
  },
};

// ─── Users ───

export interface ApiUser {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
}

export const users = {
  async me(): Promise<ApiUser> {
    return request<ApiUser>(`/users/me`);
  },

  async list(): Promise<PaginatedResponse<ApiUser>> {
    return request<PaginatedResponse<ApiUser>>(`/users`);
  },

  async invite(body: { email: string; role: string }): Promise<ApiUser> {
    return request<ApiUser>(`/users/invite`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id: string, body: { role?: string; active?: boolean }): Promise<ApiUser> {
    return request<ApiUser>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async remove(id: string): Promise<void> {
    return request<void>(`/users/${id}`, { method: "DELETE" });
  },
};

// ─── Auth (Railway API) ───

export interface LoginResponse {
  user: { id: string; email: string; fullName: string; role: string };
  org: { id: string; name: string; type: string };
  session: { accessToken: string; refreshToken: string };
}

export interface SignupResponse {
  user: { id: string; email: string; fullName: string };
  org: { id: string; name: string; type: string };
  session: { accessToken: string; refreshToken: string };
}

export const auth = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async signup(body: {
    email: string;
    password: string;
    fullName: string;
    orgName: string;
    orgType: "var" | "delivery_partner";
    country?: string;
  }): Promise<SignupResponse> {
    return request<SignupResponse>(`/auth/signup`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};
