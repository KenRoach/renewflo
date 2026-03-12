import { useState, useEffect } from "react";
import { ThemeContext, LIGHT, DARK, FONT } from "@/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout";
import { DashboardPage } from "@/features/dashboard";
import { QuoterPage } from "@/features/quoter";
import { InboxPage } from "@/features/inbox";
import { NotificationsPage } from "@/features/notifications";
import { ImportModule } from "@/features/import";
import { SupportLogsPage } from "@/features/support";
import { RewardsPage } from "@/features/rewards";
import { OrdersPage } from "@/features/orders";
import { ChatPanel } from "@/features/chat";
import { LoginPage, SignupPage } from "@/features/auth";
import { PartnerRouter } from "@/features/partner-portal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Asset, PageId } from "@/types";
import { useAssetStore } from "@/stores";

function AuthGate() {
  const { isAuthenticated, isLoading, org } = useAuth();
  const [authView, setAuthView] = useState<"login" | "signup">("login");

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === "login" ? (
      <LoginPage onSwitchToSignup={() => setAuthView("signup")} />
    ) : (
      <SignupPage onSwitchToLogin={() => setAuthView("login")} />
    );
  }

  if (org?.type === "delivery_partner") {
    return <PartnerRouter orgType="delivery_partner" />;
  }

  return <MainApp />;
}

function MainApp() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);

  const assets = useAssetStore((s) => s.assets);
  const addAssets = useAssetStore((s) => s.addAssets);
  const fetchAssets = useAssetStore((s) => s.fetchAssets);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const alerts = assets.filter((a) => a.daysLeft <= 30 && a.daysLeft >= 0).length;

  const handleImport = (newAssets: Asset[] | null) => {
    if (!newAssets) {
      setPage("dashboard");
      return;
    }
    addAssets(newAssets);
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <DashboardPage setPage={setPage} assets={assets} />;
      case "import":
        return <ImportModule onImport={handleImport} />;
      case "quoter":
        return <QuoterPage assets={assets} />;
      case "inbox":
        return <InboxPage />;
      case "notifications":
        return <NotificationsPage assets={assets} />;
      case "orders":
        return <OrdersPage />;
      case "support":
        return <SupportLogsPage />;
      case "rewards":
        return <RewardsPage />;
      default:
        return <DashboardPage setPage={setPage} assets={assets} />;
    }
  };

  return (
    <>
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        unreadCount={0}
        alertCount={alerts}
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>{renderPage()}</div>
    </>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggle: () => setIsDark((d) => !d) }}>
      <AuthProvider>
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
          <ErrorBoundary>
            <AuthGate />
          </ErrorBoundary>
        </div>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}
