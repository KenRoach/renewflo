import { useState, useEffect, type FC } from "react";
import { useTheme, FONT } from "@/theme";
import { Icon } from "@/components/icons";
import { Badge, Card, Pill } from "@/components/ui";
import { listTickets } from "@/services/api";
import { SUPPORT_LOGS } from "@/data/seeds";
import type { SupportTicket, TicketStatus, UserRole } from "@/types";

interface SupportLogsPageProps {
  userRole?: UserRole;
}

export const SupportLogsPage: FC<SupportLogsPageProps> = ({ userRole = "var" }) => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTickets()
      .then((data) => {
        if (!cancelled) {
          const apiTickets = (data.tickets || []) as SupportTicket[];
          setTickets(apiTickets.length > 0 ? apiTickets : SUPPORT_LOGS);
        }
      })
      .catch(() => { if (!cancelled) setTickets(SUPPORT_LOGS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const statusColor = (s: TicketStatus) =>
    ({ open: colors.warn, "in-progress": colors.blue, escalated: colors.danger, resolved: colors.accent }[s] ?? colors.textMid);

  const priorityColor = (p: string) =>
    ({ critical: colors.danger, high: colors.warn, medium: colors.blue, low: colors.textMid }[p] ?? colors.textMid);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: colors.textMid, fontSize: 14 }}>
        Loading support tickets...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>
          {userRole === "delivery-partner" ? "Service Tickets" : userRole === "support" ? "Support Tickets" : "Support"}
        </h2>
        {(userRole === "var" || userRole === "support") && (
          <button
            style={{
              background: colors.card,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: colors.shadow,
            }}
          >
            <Icon name="plus" size={14} color={colors.accent} /> New Ticket
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "open", "in-progress", "escalated", "resolved"] as const).map((s) => (
          <Pill key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === "all" ? "All" : s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((t) => (
          <Card key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
            <Icon name="support" size={18} color={statusColor(t.status)} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{t.id}</span>
                <Badge color={priorityColor(t.priority)}>{t.priority}</Badge>
                <Badge color={statusColor(t.status)}>{t.status}</Badge>
              </div>
              <div style={{ fontSize: 13, color: colors.text }}>{t.issue}</div>
              <div style={{ fontSize: 12, color: colors.textMid, marginTop: 2 }}>
                {t.client} &middot; {t.device} &middot; {t.assignee}
              </div>
            </div>
            <span style={{ fontSize: 12, color: colors.textMid }}>{t.created}</span>
          </Card>
        ))}
      </div>
    </div>
  );
};
