import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminForgotPassword, adminResetPassword } from "../../api/apiClient";

/**
 * Standalone admin forgot-password page.
 * Step 1 — enter username → backend sends OTP/token
 * Step 2 — enter reset token + new password
 * Rendered outside AdminLayout so there's no sidebar or logout button.
 */
export default function AdminForgotPassword() {
  const navigate = useNavigate();

  const [step,        setStep]        = useState(1); // 1 = request, 2 = reset
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  // Step 1
  const [username,    setUsername]    = useState("");
  const [devToken,    setDevToken]    = useState(""); // shown in dev mode only

  // Step 2
  const [token,       setToken]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);

  // ── Step 1: request reset token ──────────────────────────────────────────
  const handleRequest = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError("Enter your admin username"); return; }
    setError(""); setLoading(true);
    try {
      const res = await adminForgotPassword(username.trim());
      // In dev mode the token is returned in the response body
      if (res.data.resetToken) setDevToken(res.data.resetToken);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset token. Check the username.");
    } finally { setLoading(false); }
  };

  // ── Step 2: submit new password ──────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPassword.length < 6)   { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      await adminResetPassword({
        username,
        token:       token.trim(),
        newPassword,
      });
      setSuccess("Password reset successfully! Redirecting to login…");
      setTimeout(() => navigate("/admin/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired token. Request a new one.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "60px 5%",
      background: "radial-gradient(ellipse at center, rgba(255,107,53,0.06), transparent 60%), var(--dark)",
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 420, padding: "44px 40px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: "2rem" }}>🔐</span>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.7rem", marginTop: 10, marginBottom: 6 }}>
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.87rem" }}>
            {step === 1
              ? "Enter your admin username to receive a reset token"
              : `Enter the reset token sent to your phone / console for "${username}"`}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 3,
              background: step >= s ? "var(--flame)" : "var(--border)", transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Error / Success banners */}
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

        {/* ── Step 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleRequest}>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Admin Username
              </label>
              <input
                type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin" style={{ width: "100%" }}
                autoFocus required
              />
            </div>
            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Sending…" : "Send Reset Token →"}
            </button>
          </form>
        )}

        {/* ── Step 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleReset}>
            {/* Dev-mode token helper */}
            {devToken && (
              <div style={{
                background: "rgba(244,200,66,0.08)", border: "1px solid rgba(244,200,66,0.25)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: "0.83rem",
              }}>
                <p style={{ color: "#F4C842", fontWeight: 600, marginBottom: 6 }}>
                  ⚠️ Dev mode — token returned in response:
                </p>
                <code style={{
                  display: "block", background: "var(--charcoal)", padding: "8px 10px",
                  borderRadius: 6, fontSize: "1rem", letterSpacing: 1,
                  color: "var(--white)", wordBreak: "break-all",
                }}>
                  {devToken}
                </code>
                <button type="button" onClick={() => setToken(devToken)}
                  style={{ marginTop: 8, background: "transparent", color: "#F4C842", fontSize: "0.8rem", fontWeight: 600 }}>
                  Auto-fill →
                </button>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                Reset Token
              </label>
              <input
                type="text" value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from SMS or console"
                style={{ width: "100%", fontFamily: "monospace", letterSpacing: 1 }}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters" style={{ width: "100%", paddingRight: 44 }}
                  required
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
                placeholder="Repeat new password" style={{ width: "100%" }}
                required
              />
            </div>

            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
              disabled={loading || !!success}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>

            <button type="button" onClick={() => { setStep(1); setError(""); setDevToken(""); }}
              style={{ width: "100%", marginTop: 10, background: "transparent", color: "var(--muted)", fontSize: "0.85rem", padding: "10px 0" }}>
              ← Request new token
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.84rem", marginTop: 24 }}>
          Remember it?{" "}
          <Link to="/admin/login" style={{ color: "var(--flame)", fontWeight: 600 }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
