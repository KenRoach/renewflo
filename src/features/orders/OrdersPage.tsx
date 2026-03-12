import { useState, useEffect, type FC } from "react";
import { useTheme, MONO, FONT } from "@/theme";
import { Icon } from "@/components/icons";
import { Badge, Card, Pill, SectionHeader } from "@/components/ui";
import { ordersApi, type OrderSummary } from "@/services/orders.api";
import type { POStatus } from "@/types";

export const OrdersPage: FC = () => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<"all" | POStatus>("all");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.list().then((res) => { setOrders(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: colors.textMid }}>Loading orders...</div>;

  const statusColor = (s: POStatus) =>
    ({
      draft: colors.textMid,
      "pending-approval": colors.warn,
      approved: colors.accent,
      submitted: colors.blue,
      acknowledged: colors.blue,
      fulfilled: colors.accent,
      cancelled: colors.danger,
    })[s] ?? colors.textMid;

  const statusLabel = (s: POStatus) =>
    ({
      draft: "Draft",
      "pending-approval": "Pending Approval",
      approved: "Approved",
      submitted: "Submitted",
      acknowledged: "Acknowledged",
      fulfilled: "Fulfilled",
      cancelled: "Cancelled",
    })[s] ?? s;

  const filtered =
    filter === "all" ? orders : orders.filter((po) => po.status === filter);

  const totalValue = orders.reduce((s, po) => s + po.total, 0);
  const activeCount = orders.filter(
    (po) => po.status !== "fulfilled" && po.status !== "cancelled",
  ).length;

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
          <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>
            Purchase Orders
          </h2>
          <p style={{ fontSize: 13, color: colors.textMid, margin: "4px 0 0" }}>
            {activeCount} active &middot; ${totalValue.toLocaleString()} total value
          </p>
        </div>
        <button
          style={{
            background: colors.accent,
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONT,
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: `0 2px 8px ${colors.accent}40`,
          }}
        >
          <Icon name="plus" size={14} color="#fff" /> New PO
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "draft", "pending-approval", "approved", "fulfilled"] as const).map((s) => (
          <Pill key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === "all"
              ? "All"
              : s === "pending-approval"
                ? "Pending"
                : s.charAt(0).toUpperCase() + s.slice(1)}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((po) => (
          <Card
            key={po.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${statusColor(po.status as POStatus)}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="order" size={18} color={statusColor(po.status as POStatus)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{po.id.slice(0, 8)}</span>
                <Badge color={statusColor(po.status as POStatus)}>{statusLabel(po.status as POStatus)}</Badge>
              </div>
              <div style={{ fontSize: 12, color: colors.textMid, marginTop: 2 }}>
                {po.line_item_count} line item{po.line_item_count !== 1 ? "s" : ""}
                {po.partner_name && <> &middot; Partner: {po.partner_name}</>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{ fontSize: 16, fontWeight: 700, color: colors.text, fontFamily: MONO }}
              >
                ${po.total.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: colors.textMid }}>{new Date(po.updated_at).toLocaleDateString()}</div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <Icon name="order" size={32} color={colors.textDim} />
          <div style={{ fontSize: 14, color: colors.textMid, marginTop: 12 }}>
            No purchase orders match this filter.
          </div>
        </Card>
      )}

      {/* Summary */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="PO Pipeline" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(
            [
              { stage: "Draft", status: "draft" as POStatus, color: colors.textMid },
              { stage: "Pending Approval", status: "pending-approval" as POStatus, color: colors.warn },
              { stage: "Approved", status: "approved" as POStatus, color: colors.accent },
              { stage: "Submitted to Vendor", status: "submitted" as POStatus, color: colors.blue },
              { stage: "Fulfilled", status: "fulfilled" as POStatus, color: colors.accent },
            ] as const
          ).map((s, i) => {
            const count = orders.filter((po) => po.status === s.status).length;
            const value = orders.filter((po) => po.status === s.status).reduce(
              (sum, po) => sum + po.total,
              0,
            );
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 4, height: 32, borderRadius: 2, background: s.color }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: colors.text }}>
                  {s.stage}
                </span>
                <span style={{ fontSize: 12, color: colors.textMid, fontFamily: MONO }}>
                  {count} PO{count !== 1 ? "s" : ""}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: s.color,
                    fontFamily: MONO,
                    minWidth: 60,
                    textAlign: "right",
                  }}
                >
                  ${value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
