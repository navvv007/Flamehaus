import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { customerRegisterFn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]     = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await customerRegisterFn({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  const fields = [
    { label: "Full Name",        key: "name",    type: "text",     placeholder: "Ravi Sharma",        required: true },
    { label: "Email Address",    key: "email",   type: "email",    placeholder: "ravi@example.com",   required: true },
    { label: "Phone (optional)", key: "phone",   type: "tel",      placeholder: "+91 98765 43210",    required: false },
    { label: "Password",         key: "password",type: "password", placeholder: "Min. 6 characters",  required: true, pw: true },
    { label: "Confirm Password", key: "confirm", type: "password", placeholder: "Re-enter password",  required: true },
  ];

  return (
    <div style={{
      minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "60px 5%",
      background: "radial-gradient(ellipse at center, rgba(255,107,53,0.06), transparent 60%)"
    }}>
      <div style={{ width: "100%", maxWidth: 480 }} className="fade-in">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <span style={{ fontSize: "1.8rem" }}>🔥</span>
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.4rem" }}>Flamehaus</span>
          </Link>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", marginBottom: 8 }}>Create account</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Track your orders, save favourites, reorder in one tap</p>
        </div>

        <div className="card" style={{ padding: "36px 32px" }}>
          {error && (
            <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#E63946", fontSize: "0.87rem", textAlign: "center" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {fields.map(({ label, key, type, placeholder, required, pw }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, marginBottom: 6 }}>
                    {label}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={pw && !showPw ? "password" : type}
                      value={form[key]}
                      placeholder={placeholder}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", paddingRight: pw ? 44 : undefined }}
                      required={required}
                    />
                    {pw && (
                      <button type="button" onClick={() => setShowPw(!showPw)} style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "transparent", color: "var(--muted)", fontSize: "1rem"
                      }}>{showPw ? "🙈" : "👁"}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", fontSize: "0.97rem", opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? "Creating account…" : "Create Account 🔥"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.87rem", color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--flame)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
