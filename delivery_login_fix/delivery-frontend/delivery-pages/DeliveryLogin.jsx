import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

export default function DeliveryLogin() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await api.post("/delivery/auth/login", { email, password });
      const d   = res.data;

      // FIX: backend returns token + partner fields at TOP LEVEL (not nested under "partner")
      // Store token separately, and store the partner object from the flat fields
      localStorage.setItem("fh_delivery_token", d.token);
      localStorage.setItem("fh_delivery_partner", JSON.stringify({
        id:           d.id,
        name:         d.name,
        email:        d.email,
        phone:        d.phone,
        status:       d.status,
        availability: d.availability,
        rating:       d.rating,
        totalDeliveries: d.totalDeliveries,
      }));

      // Use window.location.href so the page fully reloads and reads localStorage fresh
      window.location.href = "/delivery/dashboard";
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20,
      background: "radial-gradient(ellipse at center, rgba(255,107,53,0.08), transparent 60%), var(--dark)",
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 400, padding: "44px 40px" }}>

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

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)",
            borderRadius: 10, padding: "11px 14px", marginBottom: 20,
            color: "#E63946", fontSize: "0.87rem",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: "100%" }} autoFocus required
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%" }} required
            />
          </div>

          <button
            type="submit" className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        {/* Status note */}
        <div style={{
          marginTop: 20, padding: "12px 14px",
          background: "rgba(244,200,66,0.07)", border: "1px solid rgba(244,200,66,0.2)",
          borderRadius: 10, fontSize: "0.8rem", color: "var(--muted)",
        }}>
          ⚠️ Your account must be <strong style={{ color: "#F4C842" }}>approved by admin</strong> before you can log in.
        </div>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", marginTop: 20 }}>
          New partner?{" "}
          <Link to="/delivery/register" style={{ color: "var(--flame)", fontWeight: 600 }}>
            Apply Now
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 10 }}>
          <Link to="/" style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
            ← Back to Flamehaus
          </Link>
        </p>
      </div>
    </div>
  );
}
