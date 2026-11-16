import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminOtpSend, adminOtpVerify } from "../../api/apiClient";

/**
 * Standalone login page — renders WITHOUT AdminLayout/sidebar.
 * No logout button here — user is not yet authenticated.
 */
export default function AdminLogin() {
  const { adminSignIn } = useAuth();
  const navigate        = useNavigate();

  const [tab,     setTab]     = useState("password");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Password state
  const [form, setForm] = useState({ username: "", password: "" });

  // OTP state
  const [otpUsername, setOtpUsername] = useState("");
  const [otp,         setOtp]         = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [hasSmsPhone, setHasSmsPhone] = useState(false);
  const [cooldown,    setCooldown]    = useState(0);

  const switchTab = (t) => { setTab(t); setError(""); setOtpSent(false); setOtp(""); };

  // ── Password login ──────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await adminSignIn(form.username, form.password);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid username or password");
    } finally { setLoading(false); }
  };

  // ── OTP: send ──────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!otpUsername.trim()) { setError("Enter your admin username"); return; }
    setError(""); setLoading(true);
    try {
      const res = await adminOtpSend(otpUsername.trim());
      setHasSmsPhone(!!res.data.hasSmsPhone);
      setOtpSent(true);
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  // ── OTP: verify ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { setError("Enter the OTP"); return; }
    setError(""); setLoading(true);
    try {
      const res = await adminOtpVerify(otpUsername.trim(), otp.trim());
      const d   = res.data;
      localStorage.setItem("fh_admin_token", d.token);
      localStorage.setItem("fh_admin_user",  JSON.stringify({
        username: d.username, role: d.role, displayName: d.displayName,
      }));
      window.location.href = "/admin";
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired OTP");
    } finally { setLoading(false); }
  };

  const startCooldown = () => {
    setCooldown(30);
    const t = setInterval(() =>
      setCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  return (
    /* Full-screen grid — NO AdminLayout wrapper, so NO sidebar or logout button */
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>

      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div style={{
        background: "radial-gradient(ellipse at 30% 60%, rgba(255,107,53,0.15), transparent 60%), var(--charcoal)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 48px", borderRight: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <span style={{ fontSize: "2.4rem" }}>🔥</span>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>
            Flamehaus
          </span>
        </div>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "2.2rem", lineHeight: 1.2, marginBottom: 20 }}>
          Admin<br /><span style={{ color: "var(--flame)" }}>Control Panel</span>
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 340, marginBottom: 48 }}>
          Manage your menu, orders, ratings and team from one dashboard.
          Secure JWT + OTP authentication.
        </p>
        {[
          { icon: "📦", label: "Real-time order management" },
          { icon: "🍽", label: "Full menu CRUD" },
          { icon: "⭐", label: "Customer ratings overview" },
          { icon: "📱", label: "OTP + Password login" },
        ].map(({ icon, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: "1.1rem" }}>{icon}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 48px", background: "var(--dark)",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.7rem", marginBottom: 6 }}>
            Sign in
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 28 }}>
            Choose your preferred login method
          </p>

          {/* Tab switcher */}
          <div style={{
            display: "flex", background: "var(--charcoal)",
            borderRadius: 10, padding: 4, marginBottom: 28,
          }}>
            {[["password", "🔑 Password"], ["otp", "📱 OTP"]].map(([key, label]) => (
              <button key={key} onClick={() => switchTab(key)} style={{
                flex: 1, padding: "9px 0", borderRadius: 8,
                fontWeight: 600, fontSize: "0.88rem", transition: "all 0.2s",
                background: tab === key ? "var(--flame)" : "transparent",
                color:      tab === key ? "#fff"         : "var(--muted)",
              }}>{label}</button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)",
              borderRadius: 10, padding: "11px 14px", marginBottom: 18,
              color: "#E63946", fontSize: "0.87rem",
            }}>{error}</div>
          )}

          {/* ── Password tab ───────────────────────────────────────────── */}
          {tab === "password" && (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                  Username
                </label>
                <input type="text" value={form.username}
                  onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="admin" style={{ width: "100%" }} autoFocus required />
              </div>
              <div style={{ marginBottom: 26 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                  Password
                </label>
                <input type="password" value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" style={{ width: "100%" }} required />
              </div>
              <button type="submit" className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
                disabled={loading}>
                {loading ? "Signing in…" : "Sign In →"}
              </button>
              <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.78rem", marginTop: 14 }}>
                Default: <span style={{ color: "var(--flame)" }}>admin / admin123</span>
              </p>
            </form>
          )}

          {/* ── OTP tab: step 1 — enter username ─────────────────────── */}
          {tab === "otp" && !otpSent && (
            <form onSubmit={handleSendOtp}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                  Admin Username
                </label>
                <input type="text" value={otpUsername}
                  onChange={(e) => setOtpUsername(e.target.value)}
                  placeholder="admin" style={{ width: "100%" }} autoFocus required />
                <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>
                  OTP is sent to the phone linked to your admin account.
                  If no phone is set, the OTP prints to the server console.
                </p>
              </div>
              <button type="submit" className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
                disabled={loading}>
                {loading ? "Sending OTP…" : "Send OTP →"}
              </button>
            </form>
          )}

          {/* ── OTP tab: step 2 — enter code ─────────────────────────── */}
          {tab === "otp" && otpSent && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{
                background: hasSmsPhone ? "rgba(87,204,153,0.08)" : "rgba(244,200,66,0.08)",
                border: `1px solid ${hasSmsPhone ? "rgba(87,204,153,0.2)" : "rgba(244,200,66,0.2)"}`,
                borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: "0.85rem",
              }}>
                {hasSmsPhone
                  ? `✅ OTP sent to phone linked to "${otpUsername}"`
                  : `⚠️ No phone set for "${otpUsername}". Check server console for OTP.`}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                  Enter 6-digit OTP
                </label>
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="_ _ _ _ _ _"
                  style={{ width: "100%", fontSize: "1.4rem", letterSpacing: 8, textAlign: "center" }}
                  autoFocus required
                />
                <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>
                  Valid 5 minutes · Max 3 attempts
                </p>
              </div>
              <button type="submit" className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
                disabled={loading}>
                {loading ? "Verifying…" : "Verify & Sign In →"}
              </button>
              <div style={{ textAlign: "center", marginTop: 14 }}>
                <button type="button"
                  onClick={cooldown > 0 ? undefined : handleSendOtp}
                  disabled={cooldown > 0}
                  style={{
                    background: "transparent", fontSize: "0.83rem", fontWeight: 500,
                    color: cooldown > 0 ? "var(--muted)" : "var(--flame)",
                  }}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
