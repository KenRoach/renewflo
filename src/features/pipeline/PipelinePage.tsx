import type { FC } from "react";
import { useTheme, MONO } from "@/theme";
import { Card, SectionHeader, Badge, StatusDot } from "@/components/ui";
import { urgencyColor } from "@/utils";
import type { Asset, UserRole } from "@/types";

interface PipelinePageProps {
  assets: Asset[];
  userRole: UserRole;
}

interface PipelineStage {
  key: string;
  label: string;
  statuses: string[];
  color: string;
}

export const PipelinePage: FC<PipelinePageProps> = ({ assets, userRole }) => {
  const { colors } = useTheme();

  const stages: PipelineStage[] = [
    { key: "discovered", label: "Discovered", statuses: ["discovered"], color: colors.textMid },
    { key: "alerted", label: "Alerted", statuses: ["alerted-7", "alerted-14", "alerted-30", "alerted-60", "alerted-90"], color: colors.warn },
    { key: "quoted", label: "Quoted", statuses: ["quoted"], color: colors.blue },
    { key: "approved", label: "Approved", statuses: ["tpm-approved", "oem-approved"], color: colors.purple },
    { key: "fulfilled", label: "Fulfilled", statuses: ["fulfilled"], color: colors.accent },
    { key: "lapsed", label: "Lapsed", statuses: ["lapsed"], color: colors.danger },
    { key: "lost", label: "Lost", statuses: ["lost"], color: colors.textDim },
  ];

  const stageData = stages.map((s) => {
    const stageAssets = assets.filter((a) => s.statuses.includes(a.status));
    const count = stageAssets.length;
    const value = stageAssets.reduce((sum, a) => sum + a.tpm, 0);
    const oemValue = stageAssets.reduce((sum, a) => sum + (a.oem ?? 0), 0);
    return { ...s, assets: stageAssets, count, value, oemValue };
  });

  const totalDevices = assets.length;

  // Active pipeline = everything except fulfilled and lost
  const activeStages = stageData.filter((s) => !["fulfilled", "lost"].includes(s.key));
  const activeValue = activeStages.reduce((s, d) => s + d.value, 0);
  const activeCount = activeStages.reduce((s, d) => s + d.count, 0);

  const heading = userRole === "delivery-partner" ? "Fulfillment Pipeline" : "Warranty Renewal Pipeline";
  const subheading = userRole === "delivery-partner"
    ? "Track assigned warranty coverage through fulfillment stages"
    : "Track warranty renewal progress across all stages";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>{heading}</h2>
        <p style={{ fontSize: 13, color: colors.textMid, margin: "4px 0 0" }}>{subheading}</p>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Total Devices", value: String(totalDevices), color: colors.accent },
          { label: "Active Pipeline", value: `$${activeValue.toLocaleString()}`, color: colors.blue },
          { label: "In Progress", value: String(activeCount), color: colors.warn },
          { label: "Fulfilled", value: String(stageData.find((s) => s.key === "fulfilled")?.count ?? 0), color: colors.accent },
        ].map((m, i) => (
          <Card key={i} style={{ textAlign: "center", padding: "16px 12px" }}>
            <div style={{ fontSize: 11, color: colors.textMid, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: MONO }}>{m.value}</div>
          </Card>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <SectionHeader title="Pipeline Stages" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stageData.map((s) => {
            const pct = totalDevices > 0 ? (s.count / totalDevices) * 100 : 0;
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: s.count > 0 ? `${s.color}08` : "transparent",
                  border: `1px solid ${s.count > 0 ? s.color + "18" : colors.border}`,
                }}
              >
                <div style={{ width: 4, height: 36, borderRadius: 2, background: s.color }} />
                <div style={{ width: 100, fontSize: 13, fontWeight: 600, color: colors.text }}>{s.label}</div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: colors.border, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.max(pct, s.count > 0 ? 3 : 0)}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}CC)`,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <span style={{ width: 40, textAlign: "right", fontSize: 16, fontWeight: 700, color: s.color, fontFamily: MONO }}>
                  {s.count}
                </span>
                <span style={{ width: 90, textAlign: "right", fontSize: 12, color: colors.textMid, fontFamily: MONO }}>
                  ${s.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stage Details — show assets in each active stage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {stageData
          .filter((s) => s.count > 0 && !["fulfilled", "lost"].includes(s.key))
          .slice(0, 4)
          .map((s) => (
            <Card key={s.key}>
              <SectionHeader title={`${s.label} (${s.count})`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.assets.slice(0, 5).map((a) => {
                  const uc = urgencyColor(colors, a.daysLeft);
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: `${uc}06`,
                        border: `1px solid ${uc}12`,
                      }}
                    >
                      <StatusDot color={uc} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.brand} {a.model}
                        </div>
                        <div style={{ fontSize: 10, color: colors.textMid }}>
                          {a.client} &middot; {a.daysLeft < 0 ? "Lapsed" : `${a.daysLeft}d`}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.accent, fontFamily: MONO }}>
                        ${a.tpm.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
      </div>

      {/* Client Breakdown */}
      <Card>
        <SectionHeader title="By Client" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(() => {
            const clientMap: Record<string, { count: number; value: number }> = {};
            for (const a of assets) {
              if (!clientMap[a.client]) clientMap[a.client] = { count: 0, value: 0 };
              const entry = clientMap[a.client]!;
              entry.count++;
              entry.value += a.tpm;
            }
            return Object.entries(clientMap)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([client, data]) => (
                <div key={client} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${colors.border}` }}>
                  <Badge color={colors.accent}>{data.count}</Badge>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: colors.text }}>{client}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.accent, fontFamily: MONO }}>
                    ${data.value.toLocaleString()}
                  </span>
                </div>
              ));
          })()}
        </div>
      </Card>
    </div>
  );
};
