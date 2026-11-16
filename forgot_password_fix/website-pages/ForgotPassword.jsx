import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

/**
 * Customer forgot password.
 * Step 1 — enter registered email
 * Step 2 — enter OTP (sent to registered phone) + new password
 */
export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step,        setStep]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  // Step 1
  const [email,       setEmail]       = useState("");

  // Step 2
  const [otp,         setOtp]         = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [cooldown,    setCooldown]    = useState(0);

  const startCooldown = () => {
    setCooldown(30);
    const t = setInterval(() =>
      setCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  // ── Step 1: send OTP to phone ─────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email.trim()) { setError("Enter your registered email"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/customer/auth/forgot-password/send", { email: email.trim() });
      setStep(2);
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Check your email address.");
    } finally { setLoading(false); }
  };

  // ── Step 2: verify OTP + set new password ────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPassword.length < 6)   { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/customer/auth/forgot-password/reset", {
        email, otp: otp.trim(), newPassword,
      });
      setSuccess("Password reset! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired OTP. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "80vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "60px 5%",
      background: "radial-gradient(ellipse at center, rgba(255,107,53,0.06), transparent 60%)",
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 420, padding: "44px 40px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: "2rem" }}>🔐</span>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.7rem", marginTop: 10, marginBottom: 6 }}>
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.87rem" }}>
            {step === 1
              ? "Enter your registered email — we'll send an OTP to your phone"
              : `OTP sent to your registered phone. Enter it below.`}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 3,
              background: step >= s ? "var(--flame)" : "var(--border)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Banners */}
        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, color: "#E63946", fontSize: "0.87rem" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(87,204,153,0.1)", border: "1px solid rgba(87,204,153,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, color: "#57CC99", fontSize: "0.87rem" }}>
            ✅ {success}
          </div>
        )}

        {/* ── Step 1 ──────────────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Registered Email
              </label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: "100%" }} autoFocus required
              />
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Sending OTP…" : "Send OTP →"}
            </button>
          </form>
        )}

        {/* ── Step 2 ──────────────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                OTP (sent to your phone)
              </label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="_ _ _ _ _ _"
                style={{ width: "100%", fontSize: "1.4rem", letterSpacing: 8, textAlign: "center" }}
                autoFocus required
              />
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>
                Valid for 5 minutes
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ width: "100%", paddingRight: 44 }} required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", color: "var(--muted)", fontSize: "1rem",
                }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type={showPw ? "text" : "password"} value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                style={{ width: "100%" }} required
              />
            </div>

            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading || !!success}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>

            {/* Resend OTP */}
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button"
                onClick={cooldown > 0 ? undefined : handleSendOtp}
                disabled={cooldown > 0}
                style={{
                  background: "transparent", fontSize: "0.83rem", fontWeight: 500,
                  color: cooldown > 0 ? "var(--muted)" : "var(--flame)",
                }}>
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>

            <button type="button"
              onClick={() => { setStep(1); setError(""); setOtp(""); }}
              style={{ width: "100%", marginTop: 8, background: "transparent", color: "var(--muted)", fontSize: "0.84rem", padding: "8px 0" }}>
              ← Change email
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.84rem", marginTop: 24 }}>
          Remember it?{" "}
          <Link to="/login" style={{ color: "var(--flame)", fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
