import { useState, useEffect, type FC } from "react";
import { useTheme } from "@/theme";
import { Icon } from "@/components/icons";
import { Badge, Card } from "@/components/ui";
import { notificationsApi, type Notification } from "@/services/notifications.api";

export const InboxPage: FC = () => {
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.list().then((res) => { setNotifications(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: colors.textMid }}>Loading notifications...</div>;

  const unreadCount = notifications.filter((m) => !m.read).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>Inbox</h2>
          <p style={{ fontSize: 13, color: colors.textMid, margin: "4px 0 0" }}>
            Email communications
          </p>
        </div>
        <Badge>{unreadCount} unread</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {notifications.map((n) => (
          <Card
            key={n.id}
            onClick={() => setSelectedId(selectedId === n.id ? null : n.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              background: !n.read ? `${colors.accent}06` : colors.card,
              border: `1px solid ${!n.read ? colors.accent + "25" : colors.border}`,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: `${colors.blue}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="email" size={16} color={colors.blue} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: !n.read ? 600 : 400,
                    color: colors.text,
                  }}
                >
                  {n.type}
                </span>
                <span style={{ fontSize: 11, color: colors.textMid }}>{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: !n.read ? 500 : 400,
                  color: !n.read ? colors.text : colors.textMid,
                  marginTop: 2,
                }}
              >
                {n.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: colors.textMid,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {n.body}
              </div>
            </div>
            {!n.read && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: colors.accent,
                  boxShadow: `0 0 6px ${colors.accent}55`,
                }}
              />
            )}
          </Card>
        ))}
        {notifications.length === 0 && (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, color: colors.textMid }}>No notifications yet.</div>
          </Card>
        )}
      </div>
    </div>
  );
};
