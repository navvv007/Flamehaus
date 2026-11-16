import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function DeliveryRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    vehicleNumber: "", vehicleType: "Bike",
  });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/delivery/auth/register", {
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, vehicleNumber: form.vehicleNumber,
        vehicleType: form.vehicleType,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--dark)" }}>
      <div className="card fade-in" style={{ maxWidth: 440, width: "100%", padding: "44px 40px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.6rem", marginBottom: 12 }}>Registration Submitted!</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 28, fontSize: "0.9rem" }}>
          Your delivery partner application is under review. The admin team will approve it within 24 hours.
          You'll receive an SMS once approved.
        </p>
        <Link to="/delivery/login" className="btn-primary" style={{ justifyContent: "center", padding: "12px 32px" }}>
          Go to Login
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "var(--dark)" }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 520, padding: "44px 40px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: "2rem" }}>🛵</span>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.8rem", marginTop: 10, marginBottom: 6 }}>
            Join as Delivery Partner
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Deliver for Flamehaus and earn on every drop
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 20, color: "#E63946", fontSize: "0.87rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Full Name *</label>
              <input type="text" value={form.name} onChange={set("name")} placeholder="Your name" style={{ width: "100%" }} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Phone *</label>
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+91XXXXXXXXXX" style={{ width: "100%" }} required />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Email *</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" style={{ width: "100%" }} required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Vehicle Type *</label>
              <select value={form.vehicleType} onChange={set("vehicleType")} style={{ width: "100%" }}>
                <option>Bike</option>
                <option>Scooter</option>
                <option>Car</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Vehicle Number *</label>
              <input type="text" value={form.vehicleNumber} onChange={set("vehicleNumber")} placeholder="TS09AB1234" style={{ width: "100%" }} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Password *</label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="Min. 6 chars" style={{ width: "100%" }} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Confirm Password *</label>
              <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat" style={{ width: "100%" }} required />
            </div>
          </div>

          <button type="submit" className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: loading ? 0.7 : 1 }}
            disabled={loading}>
            {loading ? "Submitting…" : "Submit Application →"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", marginTop: 24 }}>
          Already approved?{" "}
          <Link to="/delivery/login" style={{ color: "var(--flame)", fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
