import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

function saveAndRedirect(d) {
  localStorage.setItem("fh_delivery_token", d.token);
  localStorage.setItem("fh_delivery_partner", JSON.stringify({
    id: d.id, name: d.name, email: d.email, phone: d.phone,
    status: d.status, availability: d.availability,
    rating: d.rating, totalDeliveries: d.totalDeliveries, totalRatings: d.totalRatings,
    vehicleType: d.vehicleType, vehicleNumber: d.vehicleNumber,
  }));
  // Always redirect to active orders page after login
  window.location.href = "/delivery/orders";
}

export default function DeliveryLogin() {
  const [tab,     setTab]     = useState("password");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Password state
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  // OTP state
  const [otpPhone,    setOtpPhone]    = useState("");
  const [otp,         setOtp]         = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [maskedPhone, setMasked]      = useState("");
  const [cooldown,    setCooldown]    = useState(0);

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
      const res = await api.post("/delivery/auth/login", { email, password });
      saveAndRedirect(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally { setLoading(false); }
  };

  // ── OTP: send ──────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!otpPhone.trim()) { setError("Enter your registered phone number"); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.post("/delivery/auth/otp/send", { identifier: otpPhone.trim() });
      setMasked(res.data.maskedPhone || otpPhone);
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
      const res = await api.post("/delivery/auth/otp/verify", {
        identifier: otpPhone.trim(), otp: otp.trim(),
      });
      saveAndRedirect(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired OTP");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20,
      background: "radial-gradient(ellipse at center, rgba(255,107,53,0.08), transparent 60%), var(--dark)",
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 420, padding: "44px 40px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: "2.4rem" }}>🛵</span>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.8rem", marginTop: 10, marginBottom: 6 }}>
            Delivery Portal
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Sign in to manage your deliveries
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "var(--charcoal)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {[["password", "🔑 Password"], ["otp", "📱 OTP"]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError(""); setOtpSent(false); setOtp(""); }} style={{
              flexShrink: 0, flex: "0 0 50%", padding: "9px 0", borderRadius: 8,
              fontWeight: 600, fontSize: "0.88rem", transition: "all 0.2s",
              background: tab === key ? "var(--flame)" : "transparent",
              color:      tab === key ? "#fff"         : "var(--muted)",
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
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" style={{ width: "100%" }} autoFocus required />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" style={{ width: "100%" }} required />
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        )}

        {/* ── OTP tab: enter phone ───────────────────────────────────────── */}
        {tab === "otp" && !otpSent && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Registered Phone Number
              </label>
              <input type="tel" value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX or 10-digit" style={{ width: "100%" }} autoFocus required />
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>
                Use the phone number linked to your delivery account
              </p>
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", marginTop: 8, opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Sending OTP…" : "Send OTP →"}
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
              <input type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="_ _ _ _ _ _"
                style={{ width: "100%", fontSize: "1.4rem", letterSpacing: 8, textAlign: "center" }}
                autoFocus required />
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>Valid 5 minutes</p>
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Verifying…" : "Verify & Sign In"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button" onClick={cooldown > 0 ? undefined : handleSendOtp} disabled={cooldown > 0}
                style={{ background: "transparent", fontSize: "0.83rem", fontWeight: 500, color: cooldown > 0 ? "var(--muted)" : "var(--flame)" }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        {/* Approval warning */}
        <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(244,200,66,0.07)", border: "1px solid rgba(244,200,66,0.2)", borderRadius: 10, fontSize: "0.8rem", color: "var(--muted)" }}>
          ⚠️ Account must be <strong style={{ color: "#F4C842" }}>approved by admin</strong> before login
        </div>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", marginTop: 20 }}>
          New partner?{" "}
          <Link to="/delivery/register" style={{ color: "var(--flame)", fontWeight: 600 }}>Apply Now</Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 10 }}>
          <Link to="/" style={{ color: "var(--muted)", fontSize: "0.78rem" }}>← Back to Flamehaus</Link>
        </p>
      </div>
    </div>
  );
}
