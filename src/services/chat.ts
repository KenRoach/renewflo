import type { ChatMessage } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const SYSTEM_PROMPT = `You are RenewFlow AI — intelligent assistant for warranty renewal management in the LATAM IT channel. Help resellers manage installed base, generate TPM+OEM quotes, handle purchase orders, and send email alerts. Always present TPM first for Standard/Low-use (30-60% savings). OEM first for Critical. Communication is email-only. Max 200 words. Use emojis sparingly.`;

export interface ChatService {
  sendMessage(history: ChatMessage[], userText: string): Promise<string>;
}

export function createChatService(): ChatService {
  return {
    async sendMessage(history: ChatMessage[], userText: string): Promise<string> {
      const apiMessages = [...history, { role: "user" as const, text: userText }]
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        }));

      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: apiMessages,
          system: SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        return "Error processing response. Please try again.";
      }

      const data = await response.json();
      return data.content || "Error processing response. Please try again.";
    },
  };
}
