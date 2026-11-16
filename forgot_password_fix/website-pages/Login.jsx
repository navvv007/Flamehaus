import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { customerOtpSend, customerOtpVerify } from "../../api/apiClient";

export default function Login() {
  const { customerSignIn } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || "/";

  const [tab,     setTab]     = useState("password");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Password state
  const [form, setForm] = useState({ email: "", password: "" });

  // OTP state
  const [phone,       setPhone]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [maskedPhone, setMasked]      = useState("");
  const [cooldown,    setCooldown]    = useState(0);

  const afterLogin = () => navigate(from, { replace: true });

  const startCooldown = () => {
    setCooldown(30);
    const t = setInterval(() =>
      setCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  // ── Password login ──────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await customerSignIn(form.email, form.password);
      afterLogin();
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally { setLoading(false); }
  };

  // ── OTP: send ──────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!phone.trim()) { setError("Enter your registered phone number"); return; }
    setError(""); setLoading(true);
    try {
      const res = await customerOtpSend(phone.trim());
      setMasked(res.data.maskedPhone || phone);
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
      const res = await customerOtpVerify(phone.trim(), otp.trim());
      const d   = res.data;
      localStorage.setItem("fh_customer_token", d.token);
      localStorage.setItem("fh_customer", JSON.stringify({
        id: d.id, name: d.name, email: d.email, phone: d.phone,
      }));
      window.location.href = from;
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired OTP");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "88vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "60px 5%",
      background: "radial-gradient(ellipse at 60% 40%, rgba(255,107,53,0.07), transparent 60%)",
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 440, padding: "44px 40px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: "2rem" }}>🔥</span>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.8rem", marginBottom: 6, marginTop: 10 }}>
            Welcome back
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Sign in to your Flamehaus account
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "var(--charcoal)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {[["password", "🔑 Password"], ["otp", "📱 OTP"]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError(""); setOtpSent(false); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 600, fontSize: "0.88rem",
              background: tab === key ? "var(--flame)" : "transparent",
              color:      tab === key ? "#fff"         : "var(--muted)",
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, color: "#E63946", fontSize: "0.87rem" }}>
            {error}
          </div>
        )}

        {/* ── Password tab ───────────────────────────────────────────────── */}
        {tab === "password" && (
          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Email
              </label>
              <input type="email" value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" style={{ width: "100%" }} required />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Password
              </label>
              <input type="password" value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••" style={{ width: "100%" }} required />
            </div>
            {/* Forgot password link */}
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <Link to="/forgot-password" style={{ color: "var(--muted)", fontSize: "0.8rem", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--flame)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
                Forgot password?
              </Link>
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        {/* ── OTP tab: enter phone ───────────────────────────────────────── */}
        {tab === "otp" && !otpSent && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Registered Phone Number
              </label>
              <input type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX or 10-digit"
                style={{ width: "100%" }} required />
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>
                Enter the phone number linked to your account
              </p>
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", marginTop: 16, opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Sending…" : "Send OTP →"}
            </button>
          </form>
        )}

        {/* ── OTP tab: enter code ────────────────────────────────────────── */}
        {tab === "otp" && otpSent && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ background: "rgba(87,204,153,0.08)", border: "1px solid rgba(87,204,153,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: "0.85rem" }}>
              ✅ OTP sent to <strong>{maskedPhone}</strong>
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
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>Valid 5 minutes</p>
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Verifying…" : "Verify & Sign In"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button"
                onClick={cooldown > 0 ? undefined : handleSendOtp} disabled={cooldown > 0}
                style={{ background: "transparent", fontSize: "0.83rem", fontWeight: 500, color: cooldown > 0 ? "var(--muted)" : "var(--flame)" }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", marginTop: 24 }}>
          No account?{" "}
          <Link to="/register" style={{ color: "var(--flame)", fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
