// ─── API Service Layer ───
// Calls Kitz Gateway tool endpoints with JWT auth

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000";
const TOKEN_KEY = "renewflow_token";
const USER_KEY = "renewflow_user";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getOrgId(): string {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "{}");
    return user.orgId || "";
  } catch {
    return "";
  }
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function callGateway<TInput, TOutput>(
  toolName: string,
  input: TInput,
): Promise<TOutput> {
  const token = getToken();
  if (!token) {
    throw new ApiError(401, "NO_TOKEN", "Not authenticated");
  }

  const res = await fetch(`${GATEWAY_URL}/tool-calls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-org-id": getOrgId(),
    },
    body: JSON.stringify({
      name: toolName,
      input,
      riskLevel: "low",
      requiredScopes: ["tools:invoke"],
    }),
  });

  if (res.status === 401) {
    // Token expired — clear auth
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent("renewflow:auth-expired"));
    throw new ApiError(401, "AUTH_EXPIRED", "Session expired");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.code || "API_ERROR", data.message || "Request failed");
  }

  return data.output as TOutput;
}

// ─── Tool APIs ───

export interface ListAssetsResponse {
  assets: unknown[];
  total: number;
}

export async function listAssets(): Promise<ListAssetsResponse> {
  return callGateway("list_assets", {});
}

export async function addAssets(assets: unknown[]): Promise<{ added: number }> {
  return callGateway("add_assets", { assets });
}

export async function getAssetMetrics(): Promise<Record<string, unknown>> {
  return callGateway("get_asset_metrics", {});
}

export async function generateInsights(): Promise<Record<string, unknown>> {
  return callGateway("generate_insights", {});
}

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

export async function generateQuote(assetIds: string[], coverageType: "tpm" | "oem"): Promise<QuoteResult> {
  return callGateway("generate_quote", { assetIds, coverageType });
}

export interface CustomQuoteItem {
  brand: string;
  model: string;
  deviceType: string;
  tier: string;
  quantity: number;
  coverageType: "tpm" | "oem";
}

export async function generateCustomQuote(
  items: CustomQuoteItem[],
  client: string,
): Promise<QuoteResult> {
  return callGateway("generate_custom_quote", { items, client });
}

export async function listOrders(): Promise<{ orders: unknown[]; total: number }> {
  return callGateway("list_orders", {});
}

export async function createOrder(order: unknown): Promise<{ orderId: string }> {
  return callGateway("create_order", { order });
}

export async function listTickets(): Promise<{ tickets: unknown[]; total: number }> {
  return callGateway("list_tickets", {});
}

export async function getRewards(): Promise<Record<string, unknown>> {
  return callGateway("get_rewards", {});
}

// ─── Email APIs ───

export interface SendQuoteEmailResponse {
  success: boolean;
  sent: string[];
  failed: string[];
  quoteId: string;
}

export async function sendQuoteEmail(
  recipients: string[],
  quote: QuoteResult,
  senderName: string,
  senderEmail: string,
): Promise<SendQuoteEmailResponse> {
  return callGateway("send_quote_email", { recipients, quote, senderName, senderEmail });
}
