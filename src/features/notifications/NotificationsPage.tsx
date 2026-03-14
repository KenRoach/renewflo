import { useState, type FC } from "react";
import { useTheme } from "@/theme";
import { Icon } from "@/components/icons";
import { Badge, Card, PageHeader, Pill } from "@/components/ui";
import { tierColor, urgencyColor } from "@/utils";
import type { Asset, AssetTier } from "@/types";
import { MONO, FONT } from "@/theme";
import { useLocale } from "@/i18n";
import { useNotificationsStore } from "@/stores";

interface NotificationsPageProps {
  assets: Asset[];
}

export const NotificationsPage: FC<NotificationsPageProps> = ({ assets }) => {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [filter, setFilter] = useState<"all" | AssetTier>("all");

  const apiNotifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  const filtered = filter === "all" ? assets : assets.filter((a) => a.tier === filter);

  return (
    <div>
      <PageHeader
        title={t.assetAlerts}
        subtitle={`${assets.filter((a) => a.daysLeft <= 30).length} ${t.expiringWithin30} · ${assets.length} ${t.totalDevices}`}
      />

      {/* API Notifications Section */}
      {apiNotifications.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
              Notifications {unreadCount > 0 && <Badge color={colors.accent}>{unreadCount} unread</Badge>}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                style={{
                  background: "none",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: FONT,
                  color: colors.textMid,
                }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {apiNotifications.slice(0, 10).map((n) => (
              <Card
                key={n.id}
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: n.read ? 0.7 : 1,
                  cursor: n.read ? "default" : "pointer",
                }}
                onClick={() => { if (!n.read) markRead(n.id); }}
              >
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.accent, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: colors.text }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: colors.textMid, marginTop: 2 }}>{n.body}</div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: colors.textDim }}>
                  {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Asset Alerts Section */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "critical", "standard", "low-use"] as const).map((t) => (
          <Pill
            key={t}
            active={filter === t}
            onClick={() => setFilter(t)}
            count={t === "all" ? assets.length : assets.filter((a) => a.tier === t).length}
          >
            {t === "all" ? "All" : t}
          </Pill>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {filtered
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .map((a) => {
            const uc = urgencyColor(colors, a.daysLeft);
            const tc = tierColor(colors, a.tier);
            return (
              <Card key={a.id} style={{ borderLeft: `3px solid ${uc}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                      {a.brand} {a.model}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMid }}>
                      {a.client} &middot; S/N: <span style={{ fontFamily: MONO }}>{a.serial}</span>
                    </div>
                  </div>
                  <Badge color={tc}>{a.tier}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge color={uc}>
                    {a.daysLeft < 0 ? `Lapsed ${Math.abs(a.daysLeft)}d` : a.daysLeft <= 7 ? `${a.daysLeft}d left` : `${a.daysLeft} days`}
                  </Badge>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      style={{
                        background: `${colors.accent}12`,
                        border: "none",
                        borderRadius: 6,
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Icon name="send" size={13} color={colors.accent} />
                    </button>
                    <button
                      style={{
                        background: `${colors.blue}12`,
                        border: "none",
                        borderRadius: 6,
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Icon name="quote" size={13} color={colors.blue} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
};
