import type { Asset, InboxMessage, SupportTicket, RewardsProfile, PurchaseOrder } from "@/types";

export const INITIAL_ASSETS: Asset[] = [
  { id: "A-1001", brand: "Dell", model: "PowerEdge R760", serial: "SVRTG7X3", client: "Grupo Alfa", tier: "critical", daysLeft: 7, oem: 4890, tpm: 2450, status: "alerted-7" },
  { id: "A-1002", brand: "HPE", model: "ProLiant DL380 Gen11", serial: "SVR2K9M1", client: "Rex Distribution", tier: "critical", daysLeft: 14, oem: 5200, tpm: 2680, status: "alerted-14" },
  { id: "A-1003", brand: "NetApp", model: "AFF A250", serial: "NAS8R2P4", client: "Banco del Pacífico", tier: "critical", daysLeft: 28, oem: 12800, tpm: 6400, status: "alerted-30" },
  { id: "A-1004", brand: "Cisco", model: "Catalyst 9300-48P", serial: "NET5N8Q2", client: "Grupo Alfa", tier: "standard", daysLeft: 45, oem: 1890, tpm: 945, status: "alerted-90" },
  { id: "A-1005", brand: "Dell", model: "PowerStore 1200T", serial: "STO7T3K2", client: "Beta Investments", tier: "critical", daysLeft: 60, oem: 18500, tpm: 9250, status: "alerted-60" },
  { id: "A-1006", brand: "Lenovo", model: "ThinkSystem SR650 V3", serial: "SVRP4X1", client: "TechSoluciones", tier: "standard", daysLeft: 88, oem: 3200, tpm: 1600, status: "alerted-90" },
  { id: "A-1007", brand: "HPE", model: "Nimble Storage HF40", serial: "STO2W9K", client: "Banco del Pacífico", tier: "critical", daysLeft: 22, oem: 22400, tpm: 11200, status: "quoted" },
  { id: "A-1008", brand: "Fortinet", model: "FortiGate 200F", serial: "FW5N1R7", client: "Grupo Alfa", tier: "critical", daysLeft: -15, oem: null, tpm: 3200, status: "lapsed" },
  { id: "A-1009", brand: "Cisco", model: "UCS C240 M7", serial: "SVR9K4P1", client: "Rex Distribution", tier: "critical", daysLeft: 12, oem: 6800, tpm: 3400, status: "alerted-14" },
  { id: "A-1010", brand: "Dell", model: "PowerEdge R660", serial: "SVRM3N7", client: "TechSoluciones", tier: "standard", daysLeft: 35, oem: 3600, tpm: 1800, status: "alerted-60" },
  { id: "A-1011", brand: "Pure Storage", model: "FlashArray//X50 R4", serial: "PSAN2Q8", client: "Beta Investments", tier: "critical", daysLeft: 19, oem: 28000, tpm: 14000, status: "quoted" },
  { id: "A-1012", brand: "Palo Alto", model: "PA-3260", serial: "FW8R5T3", client: "Banco del Pacífico", tier: "critical", daysLeft: 52, oem: 8900, tpm: 4450, status: "alerted-60" },
];

export const INBOX_DATA: InboxMessage[] = [
  { id: 1, from: "Carlos Méndez", company: "Grupo Alfa", subject: "RE: TPM Quote — 3x Dell PowerEdge R760", preview: "We approve the TPM quote for the 3 PowerEdge servers. Please send PO to ServiceNet LATAM.", time: "10:32 AM", unread: true },
  { id: 2, from: "Ana Rodríguez", company: "Rex Distribution", subject: "Quote Request — HPE ProLiant DL380 Gen11 Fleet", preview: "Need warranty renewal quotes for our DL380 fleet (8 units). TPM preferred.", time: "9:15 AM", unread: true },
  { id: 3, from: "Pedro Silva", company: "TechSoluciones", subject: "OEM vs TPM — Cisco UCS C240 M7", preview: "What are the OEM and TPM pricing options for the UCS rack servers?", time: "Yesterday", unread: false },
  { id: 4, from: "María Torres", company: "Beta Investments", subject: "Storage Renewal — Dell PowerStore 1200T + Pure FlashArray", preview: "Need to renew coverage on our storage arrays before Q2. Can you generate a PO?", time: "Yesterday", unread: false },
  { id: 5, from: "Luis García", company: "Banco del Pacífico", subject: "NetApp AFF A250 — Disk Shelf Issue", preview: "SAS connectivity issue on disk shelf. Is this covered under our current warranty?", time: "Mar 9", unread: false },
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "PO-3001", client: "Grupo Alfa", quoteRef: "Q-5001", status: "approved",
    total: 7350, created: "Mar 11", updated: "Mar 11", vendorPO: "GA-2026-0042", deliveryPartner: "ServiceNet LATAM",
    items: [
      { assetId: "A-1001", brand: "Dell", model: "PowerEdge R760", serial: "SVRTG7X3", coverageType: "tpm", price: 2450, quantity: 3 },
    ],
  },
  {
    id: "PO-3002", client: "Rex Distribution", quoteRef: "Q-5002", status: "pending-approval",
    total: 5360, created: "Mar 10", updated: "Mar 10",
    items: [
      { assetId: "A-1002", brand: "HPE", model: "ProLiant DL380 Gen11", serial: "SVR2K9M1", coverageType: "tpm", price: 2680, quantity: 2 },
    ],
  },
  {
    id: "PO-3003", client: "Banco del Pacífico", quoteRef: "Q-5003", status: "draft",
    total: 22400, created: "Mar 9", updated: "Mar 9",
    items: [
      { assetId: "A-1007", brand: "HPE", model: "Nimble Storage HF40", serial: "STO2W9K", coverageType: "oem", price: 22400, quantity: 1 },
    ],
  },
  {
    id: "PO-3004", client: "Beta Investments", quoteRef: "Q-5004", status: "fulfilled",
    total: 18500, created: "Mar 3", updated: "Mar 7", vendorPO: "BI-2026-0018", deliveryPartner: "Evernex LATAM",
    items: [
      { assetId: "A-1005", brand: "Dell", model: "PowerStore 1200T", serial: "STO7T3K2", coverageType: "tpm", price: 9250, quantity: 2 },
    ],
  },
  {
    id: "PO-3005", client: "TechSoluciones", quoteRef: "Q-5005", status: "submitted",
    total: 6800, created: "Mar 6", updated: "Mar 8", vendorPO: "TS-2026-0091", deliveryPartner: "Park Place Technologies",
    items: [
      { assetId: "A-1009", brand: "Cisco", model: "UCS C240 M7", serial: "SVR9K4P1", coverageType: "tpm", price: 3400, quantity: 2 },
    ],
  },
];

export const SUPPORT_LOGS: SupportTicket[] = [
  { id: "T-2001", client: "Grupo Alfa", device: "Dell PowerEdge R760", issue: "RAID controller failure — degraded array on production DB server", status: "open", priority: "critical", created: "Mar 11", assignee: "ServiceNet LATAM" },
  { id: "T-2002", client: "Banco del Pacífico", device: "NetApp AFF A250", issue: "Disk shelf offline — intermittent SAS connectivity", status: "in-progress", priority: "high", created: "Mar 10", assignee: "Evernex LATAM" },
  { id: "T-2003", client: "Rex Distribution", device: "HPE ProLiant DL380 Gen11", issue: "PSU redundancy lost — replace failed power supply", status: "resolved", priority: "medium", created: "Mar 8", assignee: "Park Place Technologies" },
  { id: "T-2004", client: "Beta Investments", device: "Dell PowerStore 1200T", issue: "Firmware update failed — storage controller unresponsive", status: "escalated", priority: "critical", created: "Mar 7", assignee: "Dell ProSupport" },
  { id: "T-2005", client: "Grupo Alfa", device: "Fortinet FortiGate 200F", issue: "HA failover not triggering — secondary unit out of sync", status: "open", priority: "high", created: "Mar 6", assignee: "Fortinet TAC" },
  { id: "T-2006", client: "TechSoluciones", device: "Cisco Catalyst 9300-48P", issue: "PoE ports not powering APs after IOS upgrade", status: "in-progress", priority: "medium", created: "Mar 5", assignee: "Cisco TAC" },
];

export const REWARDS_DATA: RewardsProfile = {
  points: 8250,
  level: "Platinum",
  nextLevel: "Platinum",
  nextAt: 15000,
  history: [
    { action: "Server fleet renewal — Grupo Alfa (3x PowerEdge R760)", pts: 750, date: "Mar 10" },
    { action: "Storage array coverage — Banco del Pacífico (NetApp AFF A250)", pts: 500, date: "Mar 9" },
    { action: "Referral: TechSoluciones signed up", pts: 500, date: "Mar 8" },
    { action: "Enterprise quote sent — Rex Distribution (HPE DL380 fleet)", pts: 100, date: "Mar 7" },
    { action: "PowerStore 1200T renewal closed — Beta Investments", pts: 500, date: "Mar 6" },
    { action: "Firewall coverage — Grupo Alfa (FortiGate 200F)", pts: 250, date: "Mar 5" },
    { action: "Multi-vendor PO submitted — TechSoluciones (Cisco UCS)", pts: 150, date: "Mar 4" },
    { action: "7-day daily usage streak", pts: 100, date: "Mar 2" },
  ],
};

export const IMPORT_FIELD_DEFINITIONS = [
  { key: "serial", label: "Serial / Service Tag", required: true, hint: "Dell service tag, HPE serial, NetApp system ID, etc." },
  { key: "brand", label: "Brand", required: true, hint: "Dell, HPE, Cisco, NetApp, Lenovo, Fortinet, Pure Storage, Palo Alto" },
  { key: "model", label: "Model", required: true, hint: "e.g. PowerEdge R760, ProLiant DL380 Gen11, AFF A250" },
  { key: "client", label: "Client / Account", required: false, hint: "Company name" },
  { key: "warranty_end", label: "Warranty End Date", required: true, hint: "OEM warranty expiry date" },
  { key: "device_type", label: "Device Type", required: false, hint: "Server, Storage, Firewall, Network Switch" },
  { key: "purchase_date", label: "Purchase Date", required: false, hint: "Original purchase date" },
  { key: "quantity", label: "Quantity", required: false, hint: "Number of identical units" },
] as const;

export const SAMPLE_TEMPLATE_ROWS = [
  ["Serial / Service Tag", "Brand", "Model", "Client", "Warranty End", "Device Type", "Purchase Date", "Qty"],
  ["SVRTG7X3", "Dell", "PowerEdge R760", "Grupo Alfa", "2026-06-15", "Server", "2023-06-15", 3],
  ["SVR2K9M1", "HPE", "ProLiant DL380 Gen11", "Rex Distribution", "2026-04-01", "Server", "2023-04-01", 2],
  ["NAS8R2P4", "NetApp", "AFF A250", "Banco del Pacífico", "2026-04-10", "Storage", "2023-10-10", 1],
  ["NET5N8Q2", "Cisco", "Catalyst 9300-48P", "Grupo Alfa", "2026-05-01", "Network Switch", "2022-05-01", 4],
];
