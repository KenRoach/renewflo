import type { InboxEmail } from "@/types";

export const INBOX_EMAILS: InboxEmail[] = [
  // ── Inbound: Reply to warranty quote (thread with outbound #6) ──
  {
    id: "EM-1001",
    direction: "inbound",
    category: "reply",
    from: "carlos.mendez@acmecorp.com",
    fromName: "Carlos Mendez",
    to: "quotes@techpartners.com",
    toName: "TechPartners",
    subject: "Re: Your Warranty Quote from TechPartners",
    body: `Hi team,

Thanks for sending this over. Could you clarify the difference between the TPM and OEM options for the PowerEdge R760 servers? We're leaning toward TPM but need to understand response times before we approve.

Best regards,
Carlos`,
    read: false,
    starred: true,
    timestamp: "2026-03-11T14:22:00Z",
    threadId: "thread-001",
    replyTo: "EM-1006",
  },

  // ── Inbound: Renewal inquiry — new lead ──
  {
    id: "EM-1002",
    direction: "inbound",
    category: "renewal",
    from: "patricia.vega@techvista.io",
    fromName: "Patricia Vega",
    to: "renewals@techpartners.com",
    toName: "TechPartners",
    subject: "Warranty Coverage Inquiry",
    body: `Hello,

We have approximately 50 Dell Latitude 5540 laptops coming off warranty in April. We're looking for competitive coverage options — both OEM and third-party. Could you put together a quote for us?

Thanks,
Patricia Vega
IT Procurement, TechVista Solutions`,
    read: false,
    starred: false,
    timestamp: "2026-03-11T10:45:00Z",
  },

  // ── Inbound: Reply to promo (thread with outbound #8) ──
  {
    id: "EM-1003",
    direction: "inbound",
    category: "reply",
    from: "jorge.ramirez@meridianhealth.com",
    fromName: "Jorge Ramirez",
    to: "promos@techpartners.com",
    toName: "TechPartners",
    subject: "Re: Special Offer: Extended Warranty Savings",
    body: `Hi there,

This looks interesting. We have a mix of HPE ProLiant servers and NetApp storage that could use coverage. Can you send us a custom quote based on the promo pricing?

Regards,
Jorge Ramirez
Meridian Healthcare`,
    read: false,
    starred: false,
    timestamp: "2026-03-10T16:30:00Z",
    threadId: "thread-003",
    replyTo: "EM-1008",
  },

  // ── Inbound: Support / warranty claim question ──
  {
    id: "EM-1004",
    direction: "inbound",
    category: "general",
    from: "lucia.fernandez@globallogistics.com",
    fromName: "Lucia Fernandez",
    to: "support@techpartners.com",
    toName: "TechPartners",
    subject: "Warranty Claim Question",
    body: `Hi support team,

One of our Cisco Catalyst 9300 switches failed yesterday. We have active TPM coverage through you. What is the process to file a warranty claim and what is the expected turnaround for a replacement?

Thanks,
Lucia Fernandez
Global Logistics Inc`,
    read: true,
    starred: false,
    timestamp: "2026-03-10T09:15:00Z",
  },

  // ── Inbound: PO confirmation (thread with outbound follow-up #9) ──
  {
    id: "EM-1005",
    direction: "inbound",
    category: "reply",
    from: "daniel.ortega@cloudfirst.tech",
    fromName: "Daniel Ortega",
    to: "orders@techpartners.com",
    toName: "TechPartners",
    subject: "Re: Purchase Order PO-2024-087",
    body: `Hi,

Confirming we received the PO and everything looks correct. We've forwarded it to our finance team for processing. Expect payment within net-30 terms.

Thanks,
Daniel Ortega
CloudFirst Technologies`,
    read: true,
    starred: false,
    timestamp: "2026-03-09T11:50:00Z",
    threadId: "thread-005",
  },

  // ── Outbound: Quote email to Acme Corp (thread with inbound #1) ──
  {
    id: "EM-1006",
    direction: "outbound",
    category: "quote",
    from: "quotes@techpartners.com",
    fromName: "TechPartners",
    to: "carlos.mendez@acmecorp.com",
    toName: "Carlos Mendez",
    subject: "Your Warranty Quote for Acme Corp",
    body: `Dear Carlos,

Please find below our warranty quote (Q-4521) for 3x Dell PowerEdge R760 servers:

- OEM (Dell ProSupport): $4,890/unit — 4hr response, next-business-day parts
- TPM (ServiceNet LATAM): $2,450/unit — 4hr response, same-day parts, 40% savings

Both options include 24/7 monitoring and on-site support. Let us know which option works best for your team.

Best regards,
TechPartners Renewals Team`,
    read: true,
    starred: true,
    timestamp: "2026-03-08T15:00:00Z",
    threadId: "thread-001",
  },

  // ── Outbound: Renewal reminder ──
  {
    id: "EM-1007",
    direction: "outbound",
    category: "renewal",
    from: "renewals@techpartners.com",
    fromName: "TechPartners",
    to: "patricia.vega@techvista.io",
    toName: "Patricia Vega",
    subject: "Warranty Renewal Notice — 30 Days Remaining",
    body: `Dear Patricia,

This is a reminder that warranty coverage for 12x Lenovo ThinkSystem SR650 V3 servers expires in 30 days. We recommend renewing now to avoid any coverage gaps.

We can offer TPM coverage at 45% below OEM pricing with identical SLAs. Would you like us to prepare a comparison quote?

Best regards,
TechPartners Renewals Team`,
    read: true,
    starred: false,
    timestamp: "2026-03-07T09:00:00Z",
  },

  // ── Outbound: Promo blast (thread with inbound #3) ──
  {
    id: "EM-1008",
    direction: "outbound",
    category: "promo",
    from: "promos@techpartners.com",
    fromName: "TechPartners",
    to: "jorge.ramirez@meridianhealth.com",
    toName: "Jorge Ramirez",
    subject: "Exclusive Q1 Savings: Up to 45% Off TPM Coverage",
    body: `Dear Jorge,

For Q1 2026, we are offering exclusive savings on third-party maintenance coverage:

- Servers: up to 45% off OEM pricing
- Storage: up to 40% off OEM pricing
- Networking: up to 35% off OEM pricing

Offer valid through March 31, 2026. Contact us today for a personalized quote.

Best regards,
TechPartners Renewals Team`,
    read: true,
    starred: false,
    timestamp: "2026-03-05T10:00:00Z",
    threadId: "thread-003",
  },

  // ── Outbound: Follow-up on quote ──
  {
    id: "EM-1009",
    direction: "outbound",
    category: "quote",
    from: "quotes@techpartners.com",
    fromName: "TechPartners",
    to: "daniel.ortega@cloudfirst.tech",
    toName: "Daniel Ortega",
    subject: "Following Up: Warranty Quote Q-4521",
    body: `Dear Daniel,

Just following up on the warranty quote we sent last week for your Palo Alto PA-3260 firewalls. The TPM option offers significant savings while maintaining the same response SLAs.

Happy to schedule a call if you have questions. The quote is valid through March 31.

Best regards,
TechPartners Renewals Team`,
    read: true,
    starred: false,
    timestamp: "2026-03-04T14:30:00Z",
    threadId: "thread-005",
  },

  // ── Outbound: Onboarding / welcome email (thread with inbound #12) ──
  {
    id: "EM-1010",
    direction: "outbound",
    category: "general",
    from: "onboarding@techpartners.com",
    fromName: "TechPartners",
    to: "sandra.liu@novanetworks.com",
    toName: "Sandra Liu",
    subject: "Welcome to RenewFlow Coverage",
    body: `Dear Sandra,

Welcome aboard! Your TPM coverage for 8x HPE ProLiant DL380 Gen11 servers is now active (PO-2024-092). Here is what you need to know:

- Coverage start date: March 1, 2026
- Support hotline: +1-800-555-RENEW
- Online portal: renewflow.io/support

If you have any questions, do not hesitate to reach out.

Best regards,
TechPartners Onboarding Team`,
    read: true,
    starred: false,
    timestamp: "2026-03-03T08:00:00Z",
    threadId: "thread-006",
  },

  // ── Inbound: Urgent request ──
  {
    id: "EM-1011",
    direction: "inbound",
    category: "renewal",
    from: "ricardo.santos@grupoindustrial.mx",
    fromName: "Ricardo Santos",
    to: "renewals@techpartners.com",
    toName: "TechPartners",
    subject: "URGENT: Server Warranty Expiring Friday",
    body: `Hi,

We just realized our Dell PowerEdge R760xs warranty expires this Friday and we have no coverage lined up. These are production database servers and we cannot afford any downtime.

Can you get us a TPM quote today? We need something in place by end of week.

Ricardo Santos
Grupo Industrial MX`,
    read: false,
    starred: true,
    timestamp: "2026-03-11T08:05:00Z",
  },

  // ── Inbound: Thank-you reply (thread with outbound #10) ──
  {
    id: "EM-1012",
    direction: "inbound",
    category: "reply",
    from: "sandra.liu@novanetworks.com",
    fromName: "Sandra Liu",
    to: "onboarding@techpartners.com",
    toName: "TechPartners",
    subject: "Re: Welcome to RenewFlow Coverage",
    body: `Hi team,

Thank you for the smooth onboarding! Everything looks great and we already have the portal bookmarked. Looking forward to a great partnership.

Best,
Sandra Liu
Nova Networks`,
    read: true,
    starred: false,
    timestamp: "2026-03-04T13:20:00Z",
    threadId: "thread-006",
    replyTo: "EM-1010",
  },

  // ── Inbound: Multi-vendor inquiry ──
  {
    id: "EM-1013",
    direction: "inbound",
    category: "quote",
    from: "alejandro.ruiz@andeantech.co",
    fromName: "Alejandro Ruiz",
    to: "quotes@techpartners.com",
    toName: "TechPartners",
    subject: "Quote Request: Mixed Fleet — Servers + Storage",
    body: `Hello,

We are looking for warranty coverage across our entire data center. The fleet includes 6x HPE DL380 Gen11 servers, 2x NetApp AFF A250 arrays, and 4x Cisco Catalyst 9300 switches.

Would appreciate both OEM and TPM options so we can present both to management.

Thanks,
Alejandro Ruiz
Andean Technologies`,
    read: false,
    starred: false,
    timestamp: "2026-02-28T11:00:00Z",
  },

  // ── Outbound: Coverage renewal confirmation ──
  {
    id: "EM-1014",
    direction: "outbound",
    category: "renewal",
    from: "renewals@techpartners.com",
    fromName: "TechPartners",
    to: "lucia.fernandez@globallogistics.com",
    toName: "Lucia Fernandez",
    subject: "Coverage Renewed: Cisco Catalyst 9300 Fleet",
    body: `Dear Lucia,

Great news! Your TPM coverage for the Cisco Catalyst 9300-48P fleet has been renewed for another 12 months. Coverage details:

- Assets covered: 4x Catalyst 9300-48P
- Coverage period: March 1, 2026 to February 28, 2027
- Annual cost: $3,780 (45% below OEM)

Your updated certificates are attached. Thank you for your continued trust.

Best regards,
TechPartners Renewals Team`,
    read: true,
    starred: false,
    timestamp: "2026-02-27T16:00:00Z",
  },
];
