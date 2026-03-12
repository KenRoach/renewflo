export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  features: {
    aiChat: import.meta.env.VITE_FEATURE_AI_CHAT !== "false",
    rewards: import.meta.env.VITE_FEATURE_REWARDS !== "false",
    poManagement: import.meta.env.VITE_FEATURE_PO_MANAGEMENT !== "false",
  },
} as const;
