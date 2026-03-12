// ─── RenewFlow i18n Translations ───

export type Locale = "en" | "es" | "pt";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  pt: "PT",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

// Translation keys
export interface Translations {
  // Dashboard
  goodMorning: string;
  portfolioSummary: string;
  devicesTracked: string;
  activeDevices: string;
  clients: string;
  revenueAtRisk: string;
  next90Days: string;
  tpmSavings: string;
  vsOemPrice: string;
  renewalRate: string;
  activeAlerts: string;
  viewAll: string;
  renewalPipeline: string;
  recentActivity: string;
  // Support dashboard
  opsDashboard: string;
  supportOverview: string;
  totalAssets: string;
  organizations: string;
  urgent: string;
  requireAttention: string;
  lapsed: string;
  recoveryQueue: string;
  activeQuotes: string;
  pendingApproval: string;
  // Delivery dashboard
  myDashboard: string;
  deliveryOverview: string;
  assignedPOs: string;
  awaitingFulfillment: string;
  urgentDevices: string;
  daysToExpiry: string;
  devicesInScope: string;
  acrossAllPOs: string;
  // Sidebar
  general: string;
  dashboard: string;
  inbox: string;
  alerts: string;
  sales: string;
  quoter: string;
  purchaseOrders: string;
  importAssets: string;
  operations: string;
  support: string;
  rewards: string;
  pipeline: string;
  // Pipeline page
  businessPipeline: string;
  trackRenewals: string;
  stage: string;
  discovered: string;
  quoted: string;
  approved: string;
  ordered: string;
  fulfilled: string;
  lapsedRecover: string;
  totalValue: string;
  devices: string;
  // Orders
  assignedPOsTitle: string;
  newPO: string;
  // Support
  supportTickets: string;
  serviceTickets: string;
  newTicket: string;
  // Sidebar sections (role-specific)
  overview: string;
  management: string;
  fulfillment: string;
  communication: string;
  tracking: string;
  // Sidebar labels (role-specific)
  messages: string;
  quotesReview: string;
  partnerRewards: string;
  quoteBuilder: string;
  // How it works
  howItWorks: string;
  // Common
  loading: string;
  darkMode: string;
  lightMode: string;
  signOut: string;
  aiChat: string;
  warrantyPlatform: string;
}

export const translations: Record<Locale, Translations> = {
  en: {
    goodMorning: "Good morning, Partner",
    portfolioSummary: "Portfolio summary",
    devicesTracked: "devices tracked",
    activeDevices: "Active Devices",
    clients: "clients",
    revenueAtRisk: "Revenue at Risk",
    next90Days: "Next 90 days",
    tpmSavings: "TPM Savings",
    vsOemPrice: "vs OEM list price",
    renewalRate: "Renewal Rate",
    activeAlerts: "Active Alerts",
    viewAll: "View all",
    renewalPipeline: "Renewal Pipeline",
    recentActivity: "Recent Activity",
    opsDashboard: "Operations Dashboard",
    supportOverview: "RenewFlow support overview",
    totalAssets: "Total Assets",
    organizations: "organizations",
    urgent: "Urgent",
    requireAttention: "Require attention",
    lapsed: "Lapsed",
    recoveryQueue: "Recovery queue",
    activeQuotes: "Active Quotes",
    pendingApproval: "Pending approval",
    myDashboard: "My Dashboard",
    deliveryOverview: "Delivery fulfillment overview",
    assignedPOs: "Assigned POs",
    awaitingFulfillment: "Awaiting fulfillment",
    urgentDevices: "Urgent Devices",
    daysToExpiry: "≤14 days to expiry",
    devicesInScope: "Devices in Scope",
    acrossAllPOs: "Across all POs",
    general: "General",
    dashboard: "Dashboard",
    inbox: "Inbox",
    alerts: "Alerts",
    sales: "Sales",
    quoter: "Quoter",
    purchaseOrders: "Purchase Orders",
    importAssets: "Import Assets",
    operations: "Operations",
    support: "Support",
    rewards: "Rewards",
    pipeline: "Pipeline",
    businessPipeline: "Business Pipeline",
    trackRenewals: "Track warranty renewal progress across all stages",
    stage: "Stage",
    discovered: "Discovered",
    quoted: "Quoted",
    approved: "Approved",
    ordered: "Ordered",
    fulfilled: "Fulfilled",
    lapsedRecover: "Lapsed (recover)",
    totalValue: "Total Value",
    devices: "devices",
    assignedPOsTitle: "Assigned POs",
    newPO: "New PO",
    newTicket: "New Ticket",
    supportTickets: "Support Tickets",
    serviceTickets: "Service Tickets",
    overview: "Overview",
    management: "Management",
    fulfillment: "Fulfillment",
    communication: "Communication",
    tracking: "Tracking",
    messages: "Messages",
    quotesReview: "Quotes Review",
    partnerRewards: "Partner Rewards",
    quoteBuilder: "Quote Builder",
    howItWorks: "How does it work?",
    loading: "Loading...",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    signOut: "Sign out",
    aiChat: "AI Chat",
    warrantyPlatform: "Warranty Platform",
  },
  es: {
    goodMorning: "Buenos días, Socio",
    portfolioSummary: "Resumen de portafolio",
    devicesTracked: "dispositivos rastreados",
    activeDevices: "Dispositivos Activos",
    clients: "clientes",
    revenueAtRisk: "Ingresos en Riesgo",
    next90Days: "Próximos 90 días",
    tpmSavings: "Ahorro TPM",
    vsOemPrice: "vs precio OEM",
    renewalRate: "Tasa de Renovación",
    activeAlerts: "Alertas Activas",
    viewAll: "Ver todo",
    renewalPipeline: "Pipeline de Renovación",
    recentActivity: "Actividad Reciente",
    opsDashboard: "Panel de Operaciones",
    supportOverview: "Resumen de soporte RenewFlow",
    totalAssets: "Activos Totales",
    organizations: "organizaciones",
    urgent: "Urgente",
    requireAttention: "Requieren atención",
    lapsed: "Vencidos",
    recoveryQueue: "Cola de recuperación",
    activeQuotes: "Cotizaciones Activas",
    pendingApproval: "Pendiente de aprobación",
    myDashboard: "Mi Panel",
    deliveryOverview: "Resumen de cumplimiento de entregas",
    assignedPOs: "OC Asignadas",
    awaitingFulfillment: "Pendiente de entrega",
    urgentDevices: "Dispositivos Urgentes",
    daysToExpiry: "≤14 días para vencer",
    devicesInScope: "Dispositivos en Alcance",
    acrossAllPOs: "En todas las OC",
    general: "General",
    dashboard: "Panel",
    inbox: "Bandeja",
    alerts: "Alertas",
    sales: "Ventas",
    quoter: "Cotizador",
    purchaseOrders: "Órdenes de Compra",
    importAssets: "Importar Activos",
    operations: "Operaciones",
    support: "Soporte",
    rewards: "Recompensas",
    pipeline: "Pipeline",
    businessPipeline: "Pipeline de Negocio",
    trackRenewals: "Seguimiento de renovaciones de garantía en todas las etapas",
    stage: "Etapa",
    discovered: "Descubierto",
    quoted: "Cotizado",
    approved: "Aprobado",
    ordered: "Ordenado",
    fulfilled: "Cumplido",
    lapsedRecover: "Vencido (recuperar)",
    totalValue: "Valor Total",
    devices: "dispositivos",
    assignedPOsTitle: "OC Asignadas",
    newPO: "Nueva OC",
    newTicket: "Nuevo Ticket",
    supportTickets: "Tickets de Soporte",
    serviceTickets: "Tickets de Servicio",
    overview: "Resumen",
    management: "Gestión",
    fulfillment: "Cumplimiento",
    communication: "Comunicación",
    tracking: "Seguimiento",
    messages: "Mensajes",
    quotesReview: "Revisión de Cotizaciones",
    partnerRewards: "Recompensas de Socios",
    quoteBuilder: "Creador de Cotizaciones",
    howItWorks: "¿Cómo funciona?",
    loading: "Cargando...",
    darkMode: "Modo oscuro",
    lightMode: "Modo claro",
    signOut: "Cerrar sesión",
    aiChat: "Chat IA",
    warrantyPlatform: "Plataforma de Garantías",
  },
  pt: {
    goodMorning: "Bom dia, Parceiro",
    portfolioSummary: "Resumo do portfólio",
    devicesTracked: "dispositivos rastreados",
    activeDevices: "Dispositivos Ativos",
    clients: "clientes",
    revenueAtRisk: "Receita em Risco",
    next90Days: "Próximos 90 dias",
    tpmSavings: "Economia TPM",
    vsOemPrice: "vs preço OEM",
    renewalRate: "Taxa de Renovação",
    activeAlerts: "Alertas Ativos",
    viewAll: "Ver tudo",
    renewalPipeline: "Pipeline de Renovação",
    recentActivity: "Atividade Recente",
    opsDashboard: "Painel de Operações",
    supportOverview: "Visão geral de suporte RenewFlow",
    totalAssets: "Ativos Totais",
    organizations: "organizações",
    urgent: "Urgente",
    requireAttention: "Requerem atenção",
    lapsed: "Vencidos",
    recoveryQueue: "Fila de recuperação",
    activeQuotes: "Cotações Ativas",
    pendingApproval: "Pendente de aprovação",
    myDashboard: "Meu Painel",
    deliveryOverview: "Visão geral de entregas",
    assignedPOs: "OCs Atribuídas",
    awaitingFulfillment: "Aguardando entrega",
    urgentDevices: "Dispositivos Urgentes",
    daysToExpiry: "≤14 dias para vencer",
    devicesInScope: "Dispositivos em Escopo",
    acrossAllPOs: "Em todas as OCs",
    general: "Geral",
    dashboard: "Painel",
    inbox: "Caixa de Entrada",
    alerts: "Alertas",
    sales: "Vendas",
    quoter: "Cotador",
    purchaseOrders: "Pedidos de Compra",
    importAssets: "Importar Ativos",
    operations: "Operações",
    support: "Suporte",
    rewards: "Recompensas",
    pipeline: "Pipeline",
    businessPipeline: "Pipeline de Negócios",
    trackRenewals: "Acompanhe o progresso das renovações de garantia em todas as etapas",
    stage: "Etapa",
    discovered: "Descoberto",
    quoted: "Cotado",
    approved: "Aprovado",
    ordered: "Pedido",
    fulfilled: "Entregue",
    lapsedRecover: "Vencido (recuperar)",
    totalValue: "Valor Total",
    devices: "dispositivos",
    assignedPOsTitle: "OCs Atribuídas",
    newPO: "Nova OC",
    newTicket: "Novo Ticket",
    supportTickets: "Tickets de Suporte",
    serviceTickets: "Tickets de Serviço",
    overview: "Visão Geral",
    management: "Gestão",
    fulfillment: "Entrega",
    communication: "Comunicação",
    tracking: "Acompanhamento",
    messages: "Mensagens",
    quotesReview: "Revisão de Cotações",
    partnerRewards: "Recompensas de Parceiros",
    quoteBuilder: "Criador de Cotações",
    howItWorks: "Como funciona?",
    loading: "Carregando...",
    darkMode: "Modo escuro",
    lightMode: "Modo claro",
    signOut: "Sair",
    aiChat: "Chat IA",
    warrantyPlatform: "Plataforma de Garantias",
  },
};
