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
import { ChatPanel } from "@/features/chat";
import { LoginPage } from "@/features/auth";
import type { Asset, PageId, UserRole } from "@/types";
import { useAssetStore, useAuthStore } from "@/stores";

const LOCALE_STORAGE_KEY = "renewflow_locale";

// ─── Role-based page access ───
const ROLE_PAGES: Record<UserRole, PageId[]> = {
  var: ["dashboard", "inbox", "notifications", "quoter", "orders", "import", "support", "rewards", "pipeline"],
  support: ["dashboard", "notifications", "support", "orders", "inbox", "quoter", "rewards", "pipeline"],
  "delivery-partner": ["dashboard", "notifications", "orders", "support", "inbox", "pipeline", "quoter"],
};

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [page, setPage] = useState<PageId>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
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

  const userRole: UserRole = user?.role || "var";
  const t = translations[locale];

  // Hydrate auth from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Listen for auth expiry events from API layer
  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener("renewflow:auth-expired", handleExpired);
    return () => window.removeEventListener("renewflow:auth-expired", handleExpired);
  }, [logout]);

  // Load assets from API when authenticated
  useEffect(() => {
    if (user && token && !assetsLoaded) {
      loadFromApi();
    }
  }, [user, token, assetsLoaded, loadFromApi]);

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

  // Auth gate: show login if not authenticated
  if (!user || !token) {
    return (
      <ThemeContext.Provider value={{ colors, isDark, toggle: () => setIsDark((d) => !d) }}>
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <LoginPage />
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
      default:
        return <DashboardPage setPage={handleNavigate} assets={assets} userRole={userRole} />;
    }
  };

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
          />

          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>{renderPage()}</div>
        </div>
      </LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}
