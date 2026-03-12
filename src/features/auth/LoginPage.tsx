import { useState } from "react";
import { useTheme } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import { FONT } from "@/theme/tokens";

export function LoginPage({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: colors.bg,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: 400,
          padding: 40,
          background: colors.card,
          borderRadius: 16,
          boxShadow: colors.shadowLg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, color: colors.text, fontWeight: 700 }}>RenewFlow</h1>
        <p style={{ color: colors.textMid, marginTop: 8, marginBottom: 32 }}>
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: colors.dangerDim,
                color: colors.danger,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.textMid, marginBottom: 6 }}>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: 14,
                fontFamily: FONT,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 24 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.textMid, marginBottom: 6 }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: 14,
                fontFamily: FONT,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              background: colors.accent,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: FONT,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: colors.textMid }}>
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            style={{
              background: "none",
              border: "none",
              color: colors.accent,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              fontFamily: FONT,
              padding: 0,
            }}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
