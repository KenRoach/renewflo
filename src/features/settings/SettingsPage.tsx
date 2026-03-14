import { useState, useEffect, type FC } from "react";
import { useTheme, FONT, MONO } from "@/theme";
import { useLocale } from "@/i18n";
import { Icon } from "@/components/icons";
import { useAuthStore } from "@/stores";
import { Badge } from "@/components/ui";
import { ROLE_LABELS, type UserRole } from "@/types";
import { users as usersApi, type ApiUser } from "@/services/gateway";

// ─── Timezone options ───
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Europe/London",
  "Europe/Madrid",
  "UTC",
];

// ─── Toggle switch ───
const Toggle: FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => {
  const { colors } = useTheme();
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        background: on ? colors.accent : colors.border,
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
};

// ─── Form field wrapper ───
const Field: FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => {
  const { colors } = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: colors.textMid,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 10, color: colors.textDim, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#2563EB",
  member: "#3B82F6",
  viewer: "#94A3B8",
};

export const SettingsPage: FC = () => {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const userRole: UserRole = user?.role || "var";

  // ─── Form state ───
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [tz, setTz] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );
  const [signature, setSignature] = useState("");

  // Notification prefs
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [renewalAlerts, setRenewalAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [saved, setSaved] = useState(false);

  // ─── Team Management state ───
  const [teamMembers, setTeamMembers] = useState<ApiUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Load team members
  useEffect(() => {
    let cancelled = false;
    setTeamLoading(true);
    usersApi.list()
      .then((res) => {
        if (!cancelled) setTeamMembers(res.data || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTeamLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    fontSize: 13,
    fontFamily: FONT,
    outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  };

  const handleSave = () => {
    if (user) {
      const updated = { ...user, name };
      localStorage.setItem("renewflow_user", JSON.stringify(updated));
      useAuthStore.getState().hydrate();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      await usersApi.invite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      // Refresh team list
      const res = await usersApi.list();
      setTeamMembers(res.data || []);
    } catch (err) {
      setInviteError((err as Error).message || "Failed to send invite");
    }
    setInviting(false);
  };

  const handleToggleActive = async (member: ApiUser) => {
    try {
      await usersApi.update(member.id, { active: !member.active });
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, active: !m.active } : m))
      );
    } catch { /* ignore */ }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await usersApi.update(memberId, { role: newRole });
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch { /* ignore */ }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: colors.text,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon name="settings" size={18} color={colors.accent} />
          {t.settings}
        </h2>
        <p style={{ fontSize: 13, color: colors.textMid, margin: "4px 0 0" }}>
          {ROLE_LABELS[userRole]} &middot; {user?.email}
        </p>
      </div>

      {/* ─── Profile Section ─── */}
      <div
        style={{
          background: colors.card,
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          padding: 24,
          marginBottom: 20,
          boxShadow: colors.shadow,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: "0 0 18px" }}>
          {t.profileSettings}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <Field label={t.displayName}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label={t.emailAddress} hint="Contact support to change email">
            <input type="email" value={email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
          </Field>
          <Field label={t.phone}>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle} />
          </Field>
          <Field label={t.timezone}>
            <select value={tz} onChange={(e) => setTz(e.target.value)} style={selectStyle}>
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ─── Company Section ─── */}
      <div
        style={{
          background: colors.card,
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          padding: 24,
          marginBottom: 20,
          boxShadow: colors.shadow,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: "0 0 18px" }}>
          {t.companyInfo}
        </h2>
        <Field label={t.companyName}>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" style={inputStyle} />
        </Field>
        <Field label={t.emailSignature} hint="Appended to outbound emails">
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={"Best regards,\nYour Name\nCompany Name"}
            rows={4}
            style={{ ...inputStyle, fontFamily: MONO, fontSize: 12, resize: "vertical", minHeight: 80 }}
          />
        </Field>
      </div>

      {/* ─── Team Management Section ─── */}
      <div
        style={{
          background: colors.card,
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          padding: 24,
          marginBottom: 20,
          boxShadow: colors.shadow,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>
            Team Members
          </h2>
          <Badge color={colors.accent}>{teamMembers.length} members</Badge>
        </div>

        {/* Invite Form */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="email"
            placeholder="teammate@company.com"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess(""); }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            style={{ ...selectStyle, width: 120, flex: "none" }}
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "none",
              background: colors.accent,
              color: colors.onAccent,
              fontSize: 12,
              fontWeight: 600,
              cursor: inviting ? "not-allowed" : "pointer",
              fontFamily: FONT,
              whiteSpace: "nowrap",
              opacity: inviting ? 0.7 : 1,
            }}
          >
            {inviting ? "Sending..." : "Invite"}
          </button>
        </div>

        {inviteError && (
          <div style={{ fontSize: 12, color: colors.danger, marginBottom: 12, padding: "8px 12px", background: colors.dangerDim, borderRadius: 8 }}>
            {inviteError}
          </div>
        )}
        {inviteSuccess && (
          <div style={{ fontSize: 12, color: colors.accent, marginBottom: 12, padding: "8px 12px", background: colors.accentDim, borderRadius: 8 }}>
            {inviteSuccess}
          </div>
        )}

        {/* Team Members List */}
        {teamLoading ? (
          <div style={{ padding: 20, textAlign: "center", color: colors.textMid, fontSize: 13 }}>
            Loading team...
          </div>
        ) : teamMembers.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: colors.textMid, fontSize: 13 }}>
            No team members found. Invite your first teammate above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {teamMembers.map((member) => (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: member.id === user?.id ? colors.accentDim : "transparent",
                  opacity: member.active ? 1 : 0.5,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${ROLE_COLORS[member.role] || "#94A3B8"}, ${ROLE_COLORS[member.role] || "#94A3B8"}88)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {member.full_name || member.email}
                    {member.id === user?.id && (
                      <span style={{ fontSize: 10, color: colors.accent, marginLeft: 6 }}>(you)</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMid }}>{member.email}</div>
                </div>

                {/* Role dropdown */}
                {member.id !== user?.id ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.id, e.target.value)}
                    style={{
                      ...selectStyle,
                      width: 100,
                      padding: "5px 8px",
                      fontSize: 11,
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <Badge color={ROLE_COLORS[member.role] || colors.textMid}>{member.role}</Badge>
                )}

                {/* Active toggle */}
                {member.id !== user?.id && (
                  <Toggle on={member.active} onChange={() => handleToggleActive(member)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Notifications Section ─── */}
      <div
        style={{
          background: colors.card,
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          padding: 24,
          marginBottom: 28,
          boxShadow: colors.shadow,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: "0 0 18px" }}>
          {t.notificationPrefs}
        </h2>

        {[
          { label: t.emailNotifications, desc: "Receive email updates about your account activity", on: emailNotifs, set: setEmailNotifs },
          { label: t.renewalAlerts, desc: "Get notified when warranties approach expiry dates", on: renewalAlerts, set: setRenewalAlerts },
          { label: t.weeklyDigest, desc: "Summary of portfolio status every Monday", on: weeklyDigest, set: setWeeklyDigest },
        ].map((pref) => (
          <div
            key={pref.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{pref.label}</div>
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>{pref.desc}</div>
            </div>
            <Toggle on={pref.on} onChange={pref.set} />
          </div>
        ))}
      </div>

      {/* ─── Save Button ─── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 28px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            background: saved ? colors.success : colors.accent,
            color: colors.onAccent,
            boxShadow: `0 2px 8px ${saved ? colors.successDim : colors.accent + "40"}`,
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {saved ? (
            <>
              <Icon name="check" size={14} color={colors.onAccent} />
              {t.saved}
            </>
          ) : (
            t.saveChanges
          )}
        </button>
      </div>
    </div>
  );
};
