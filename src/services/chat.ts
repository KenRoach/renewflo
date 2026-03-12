import type { ChatContext, ChatMessage } from "@/types";

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

export interface ChatService {
  sendMessage(history: ChatMessage[], userText: string, context?: ChatContext): Promise<string>;
}

export function createChatService(): ChatService {
  return {
    async sendMessage(
      history: ChatMessage[],
      userText: string,
      context?: ChatContext,
    ): Promise<string> {
      const token = getToken();
      if (!token) {
        return "Please log in to use RenewFlow AI.";
      }

      const chatHistory = history
        .filter((m) => m.role !== "system")
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      try {
        const res = await fetch(`${GATEWAY_URL}/tool-calls`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-org-id": getOrgId(),
          },
          body: JSON.stringify({
            name: "ai_chat",
            input: { message: userText, history: chatHistory, context: context ?? null },
            riskLevel: "low",
            requiredScopes: ["tools:invoke"],
          }),
        });

        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          window.dispatchEvent(new CustomEvent("renewflow:auth-expired"));
          return "Session expired. Please log in again.";
        }

        if (!res.ok) {
          return "AI service is temporarily unavailable. Please try again.";
        }

        const data = await res.json();
        return data.output?.reply || "Unable to process your request.";
      } catch {
        return "Cannot reach the AI service. Please check your connection.";
      }
    },
  };
}
