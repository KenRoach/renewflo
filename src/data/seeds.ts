import type { RewardsProfile } from "@/types";

export const REWARDS_DATA: RewardsProfile = {
  points: 4750,
  level: "Gold",
  nextLevel: "Platinum",
  nextAt: 7500,
  history: [
    { action: "Renewal closed — Grupo Alfa (5 devices)", pts: 250, date: "Mar 10" },
    { action: "Referral: TechSoluciones signed up", pts: 500, date: "Mar 8" },
    { action: "Quote sent — Rex Distribution", pts: 50, date: "Mar 7" },
    { action: "Onboarding complete — Modern Arch", pts: 200, date: "Mar 5" },
    { action: "Renewal closed — Café Central (3 devices)", pts: 150, date: "Mar 3" },
    { action: "7-day daily usage streak", pts: 100, date: "Mar 2" },
  ],
};

export const IMPORT_FIELD_DEFINITIONS = [
  { key: "serial", label: "Serial / Service Tag", required: true, hint: "Dell service tag, HP serial, etc." },
  { key: "brand", label: "Brand", required: true, hint: "Dell, HP, Lenovo" },
  { key: "model", label: "Model", required: true, hint: "e.g. Latitude 5540" },
  { key: "client", label: "Client / Account", required: false, hint: "Company name" },
  { key: "warranty_end", label: "Warranty End Date", required: true, hint: "OEM warranty expiry date" },
  { key: "device_type", label: "Device Type", required: false, hint: "Laptop, desktop, workstation" },
  { key: "purchase_date", label: "Purchase Date", required: false, hint: "Original purchase date" },
  { key: "quantity", label: "Quantity", required: false, hint: "Number of identical units" },
] as const;

export const SAMPLE_TEMPLATE_ROWS = [
  ["Serial / Service Tag", "Brand", "Model", "Client", "Warranty End", "Device Type", "Purchase Date", "Qty"],
  ["DLTG7X3", "Dell", "Latitude 5540", "Grupo Alfa", "2026-06-15", "Laptop", "2023-06-15", 1],
  ["HP2K9M1", "HP", "EliteBook 840 G10", "Rex Distribution", "2026-04-01", "Laptop", "2023-04-01", 1],
  ["LNV8R2P", "Lenovo", "ThinkPad T14 Gen 4", "Café Central", "2026-04-10", "Laptop", "2023-10-10", 1],
  ["DLQW5N8", "Dell", "OptiPlex 7010", "Grupo Alfa", "2026-05-01", "Desktop", "2022-05-01", 3],
];
