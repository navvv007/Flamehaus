import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

/* ── Auth hook shared across delivery pages ─────────────────────────── */
function useDeliveryAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("fh_delivery_token");
  const partner = (() => {
    try {
      const raw = localStorage.getItem("fh_delivery_partner");
      if (!raw || raw === "undefined" || raw === "null") return null;
      return JSON.parse(raw);
    } catch { return null; }
  })();
  useEffect(() => {
    if (!token || !partner) {
      localStorage.removeItem("fh_delivery_token");
      localStorage.removeItem("fh_delivery_partner");
      navigate("/delivery/login");
    }
  }, [token, partner, navigate]);
  return { token, partner };
}

function dApi(path, method = "get", data = null) {
  const token = localStorage.getItem("fh_delivery_token");
  const base  = "http://localhost:8080";
  const opts  = {
    method: method.toUpperCase(),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: data ? JSON.stringify(data) : undefined,
  };
  return fetch(`${base}${path}`, opts).then(async (r) => {
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw { response: { data: json, status: r.status } };
    return { data: json };
  });
}

function StarPicker({ value, onChange, size = "2.2rem" }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
          style={{ fontSize: size, cursor: "pointer", transition: "transform 0.12s",
            transform: s <= (hovered || value) ? "scale(1.2)" : "scale(1)",
            color: s <= (hovered || value) ? "#F4C842" : "#333" }}>★</span>
      ))}
    </div>
  );
}

const LABELS = ["", "Terrible", "Bad", "Okay", "Good", "Excellent!"];

export default function DeliveryRating() {
  const { assignmentId } = useParams();
  const navigate         = useNavigate();
  const { partner }      = useDeliveryAuth();

  const [assignment, setAssignment] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");
  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState("");

  useEffect(() => {
    dApi("/api/delivery/partner/assignments")
      .then((r) => setAssignment(r.data.find((a) => String(a.id) === String(assignmentId)) || null))
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError("Please select a rating"); return; }
    setSubmitting(true); setError("");
    try {
      await dApi(`/api/delivery/partner/rate-order/${assignmentId}`, "post", { rating, comment });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading…</div>
  );

  if (submitted || assignment?.partnerOrderRating) return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card fade-in" style={{ maxWidth: 400, width: "100%", padding: "44px 36px", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🙏</div>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.5rem", marginBottom: 10 }}>Thanks for the feedback!</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 28 }}>
          {submitted ? "Your rating has been submitted." : `You already rated this delivery: ${"★".repeat(assignment.partnerOrderRating)}`}
        </p>
        <Link to="/delivery/orders" className="btn-primary" style={{ padding: "12px 32px" }}>Back to Orders</Link>
      </div>
    </div>
  );

  const order = assignment?.order || {};

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card fade-in" style={{ maxWidth: 440, width: "100%", padding: "40px 36px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: "2.5rem" }}>🚀</span>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.5rem", marginTop: 10, marginBottom: 6 }}>Rate This Delivery</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.84rem" }}>
            How was your experience delivering order <strong style={{ color: "var(--flame)" }}>#{order.id}</strong>?
          </p>
        </div>

        {/* Order summary */}
        <div style={{ background: "var(--charcoal)", borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Customer</span>
            <span style={{ fontSize: "0.86rem", fontWeight: 600 }}>{order.customerName || "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Address</span>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", maxWidth: 220, textAlign: "right" }}>{order.deliveryAddress || "—"}</span>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, color: "#E63946", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Stars */}
          <div style={{ marginBottom: 12, textAlign: "center" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 12 }}>
              RATE YOUR EXPERIENCE
            </label>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p style={{ marginTop: 10, fontFamily: "Syne,sans-serif", fontWeight: 700, color: "#F4C842" }}>
                {LABELS[rating]}
              </p>
            )}
          </div>

          {/* Quick tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", margin: "18px 0" }}>
            {["Clear address", "Easy to find", "Safe area", "Quick handoff", "Friendly customer"].map((tag) => (
              <button key={tag} type="button"
                onClick={() => setComment((c) => c ? `${c}, ${tag}` : tag)}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: "0.76rem", background: "var(--charcoal)", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}>
                {tag}
              </button>
            ))}
          </div>

          {/* Comment */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
              COMMENTS (OPTIONAL)
            </label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Any notes about this delivery…" rows={3}
              style={{ width: "100%", resize: "vertical" }} />
          </div>

          <button type="submit" className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: submitting || !rating ? 0.7 : 1 }}
            disabled={submitting || !rating}>
            {submitting ? "Submitting…" : "Submit Rating"}
          </button>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Link to="/delivery/orders" style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Skip for now</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
