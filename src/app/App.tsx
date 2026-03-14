import { useState, useEffect } from "react";
import { ThemeContext, LIGHT, DARK, FONT } from "@/theme";
import { LocaleContext, translations, type Locale } from "@/i18n";
import { Sidebar } from "@/components/layout";
import { DashboardPage } from "@/features/dashboard";
import { QuoterPage } from "@/features/quoter";
import { InboxPage } from "@/features/inbox";
import { NotificationsPage } from "@/features/notifications";
import { ImportModule } from "@/features/import";
import { SupportLogsPage } from "@/features/support";
import { RewardsPage } from "@/features/rewards";
import { OrdersPage } from "@/features/orders";
import { PipelinePage } from "@/features/pipeline";
import { SettingsPage } from "@/features/settings";
import { HowItWorksPage } from "@/features/how-it-works";
import { ChatPanel } from "@/features/chat";
import { LoginPage } from "@/features/auth";
import { ErrorBoundary, PageTransition } from "@/components/ui";
import { BrowserRouter } from "react-router-dom";
import { PartnerRouter } from "@/features/partner-portal";
import type { Asset, PageId, UserRole } from "@/types";
import type { ApiOrder } from "@/services/gateway";
import {
  useAssetStore,
  useAuthStore,
  useOrdersStore,
  useSupportStore,
  useNotificationsStore,
  useQuotesStore,
} from "@/stores";

const LOCALE_STORAGE_KEY = "renewflow_locale";

// Handle Supabase email verification callback
// Supabase redirects with hash params: #access_token=...&refresh_token=...&type=signup
function handleAuthCallback(): "recovery" | "signup" | "magiclink" | null {
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) return null;

  const params = new URLSearchParams(hash.replace("#", "?"));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type") as "signup" | "recovery" | "magiclink" | null;

  if (accessToken && (type === "signup" || type === "recovery" || type === "magiclink")) {
    // Clear stale user data to prevent identity mismatch
    localStorage.removeItem("renewflow_user");
    // Store the token so the auth store can hydrate
    localStorage.setItem("renewflow_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("renewflow_refresh_token", refreshToken);
    }
    // Clean the URL hash
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return type;
  }
  return null;
}

// ─── Role-based page access ───
const ROLE_PAGES: Record<UserRole, PageId[]> = {
  var: ["dashboard", "inbox", "notifications", "quoter", "orders", "import", "support", "rewards", "pipeline", "settings", "how-it-works"],
  support: ["dashboard", "notifications", "support", "orders", "inbox", "quoter", "rewards", "pipeline", "settings", "how-it-works"],
  "delivery-partner": ["dashboard", "notifications", "orders", "support", "inbox", "pipeline", "quoter", "settings", "how-it-works"],
};

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [page, setPage] = useState<PageId>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return (stored === "es" || stored === "pt") ? stored : "en";
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  };

  const assets = useAssetStore((s) => s.assets);
  const addAssets = useAssetStore((s) => s.addAssets);
  const loadFromApi = useAssetStore((s) => s.loadFromApi);
  const assetsLoaded = useAssetStore((s) => s.loaded);

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);

  const loadOrders = useOrdersStore((s) => s.load);
  const apiOrders = useOrdersStore((s) => s.orders);
  const ordersLoaded = useOrdersStore((s) => s.loaded);
  const loadSupport = useSupportStore((s) => s.load);
  const supportLoaded = useSupportStore((s) => s.loaded);
  const loadNotifications = useNotificationsStore((s) => s.load);
  const notificationsLoaded = useNotificationsStore((s) => s.loaded);
  const loadQuotes = useQuotesStore((s) => s.load);
  const quotesLoaded = useQuotesStore((s) => s.loaded);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const userRole: UserRole = user?.role || "var";
  const t = translations[locale];

  // Handle Supabase email verification / password recovery callbacks
  useEffect(() => {
    const callbackType = handleAuthCallback();
    if (callbackType === "recovery") {
      setIsRecovery(true);
    }
    hydrate();
  }, [hydrate]);

  // Listen for auth expiry events from API layer
  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener("renewflow:auth-expired", handleExpired);
    return () => window.removeEventListener("renewflow:auth-expired", handleExpired);
  }, [logout]);

  // Load all data from API when authenticated
  useEffect(() => {
    if (user && token) {
      if (!assetsLoaded) loadFromApi();
      if (!ordersLoaded) loadOrders();
      if (!supportLoaded) loadSupport();
      if (!notificationsLoaded) loadNotifications();
      if (!quotesLoaded) loadQuotes();
    }
  }, [user, token, assetsLoaded, ordersLoaded, supportLoaded, notificationsLoaded, quotesLoaded, loadFromApi, loadOrders, loadSupport, loadNotifications, loadQuotes]);

  // Poll notifications every 60s
  useEffect(() => {
    if (!user || !token) return;
    const interval = setInterval(() => loadNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [user, token, loadNotifications]);

  // Guard: redirect to dashboard if current page isn't accessible to role
  useEffect(() => {
    const allowed = ROLE_PAGES[userRole] || ROLE_PAGES.var;
    if (!allowed.includes(page)) {
      setPage("dashboard");
    }
  }, [userRole, page]);

  const colors = isDark ? DARK : LIGHT;

  const handleImport = (newAssets: Asset[] | null) => {
    if (!newAssets) {
      setPage("dashboard");
      return;
    }
    addAssets(newAssets);
  };

  // Navigation with role guard
  const handleNavigate = (targetPage: PageId) => {
    const allowed = ROLE_PAGES[userRole] || ROLE_PAGES.var;
    if (allowed.includes(targetPage)) {
      setPage(targetPage);
    }
  };

  // Auth gate: show login if not authenticated, or recovery reset form
  if (!user || !token || isRecovery) {
    return (
      <ThemeContext.Provider value={{ colors, isDark, toggle: () => setIsDark((d) => !d) }}>
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <LoginPage
            initialMode={isRecovery ? "reset" : undefined}
            onResetComplete={() => {
              setIsRecovery(false);
              // Clear recovery token — user must log in fresh with new password
              logout();
            }}
          />
        </LocaleContext.Provider>
      </ThemeContext.Provider>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <DashboardPage setPage={handleNavigate} assets={assets} userRole={userRole} />;
      case "import":
        return <ImportModule onImport={handleImport} />;
      case "quoter":
        return <QuoterPage assets={assets} />;
      case "inbox":
        return <InboxPage />;
      case "notifications":
        return <NotificationsPage assets={assets} />;
      case "orders":
        return <OrdersPage userRole={userRole} />;
      case "support":
        return <SupportLogsPage userRole={userRole} />;
      case "rewards":
        return <RewardsPage />;
      case "pipeline":
        return <PipelinePage assets={assets} userRole={userRole} />;
      case "settings":
        return <SettingsPage />;
      case "how-it-works":
        return <HowItWorksPage />;
      default:
        return <DashboardPage setPage={handleNavigate} assets={assets} userRole={userRole} />;
    }
  };

  if (userRole === "delivery-partner") {
    return (
      <ThemeContext.Provider value={{ colors, isDark, toggle: () => setIsDark((d) => !d) }}>
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <BrowserRouter>
            <PartnerRouter orgType="delivery_partner" />
          </BrowserRouter>
        </LocaleContext.Provider>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggle: () => setIsDark((d) => !d) }}>
      <LocaleContext.Provider value={{ locale, setLocale, t }}>
        <div
          style={{
            display: "flex",
            height: "100vh",
            background: colors.bg,
            fontFamily: FONT,
            color: colors.text,
            overflow: "hidden",
            transition: "background 0.3s ease",
          }}
        >
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />

          <Sidebar
            activePage={page}
            onNavigate={handleNavigate}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen((o) => !o)}
            userName={user.name}
            userRole={userRole}
            onLogout={logout}
            unreadNotifications={unreadCount}
          />

          <ChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            assets={assets}
            user={user}
            orders={apiOrders.map((o: ApiOrder) => ({
              id: o.id.slice(0, 8),
              client: "",
              quoteRef: o.quote_id?.slice(0, 8) || "",
              items: [],
              status: o.status as import("@/types").POStatus,
              total: o.total_amount,
              created: new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              updated: new Date(o.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            }))}
            currentPage={page}
            locale={locale}
          />

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <ErrorBoundary>
              <PageTransition pageKey={page}>{renderPage()}</PageTransition>
            </ErrorBoundary>
          </div>
        </div>
      </LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}
