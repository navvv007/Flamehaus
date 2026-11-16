import { useState } from "react";
import api from "../../api/apiClient";

const REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better option",
  "Taking too long",
  "Other",
];

export default function CancelOrderModal({ order, onClose, onCancelled }) {
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  const isPaid    = order.paymentStatus === "PAID";
  const amountInr = Math.round((order.total || 0) * 84);

  const handleCancel = async () => {
    if (!reason) { setError("Please select a reason"); return; }
    setSubmitting(true); setError("");
    try {
      const token = localStorage.getItem("fh_customer_token");
      const res   = await api.post(
        `/customer/orders/${order.id}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCancelled(res.data);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to cancel. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
      <div className="card fade-in" style={{ width:"100%", maxWidth:440, padding:"36px 32px" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <span style={{ fontSize:"2.2rem" }}>🚫</span>
          <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.4rem", marginTop:10, marginBottom:6 }}>Cancel Order #{order.id}?</h2>
          <p style={{ color:"var(--muted)", fontSize:"0.85rem" }}>This action cannot be undone.</p>
        </div>

        <div style={{
          borderRadius:10, padding:"14px 16px", marginBottom:20,
          background: isPaid ? "rgba(87,204,153,0.08)" : "rgba(136,136,136,0.08)",
          border:`1px solid ${isPaid ? "rgba(87,204,153,0.25)" : "var(--border)"}`,
        }}>
          {isPaid ? (
            <>
              <p style={{ fontWeight:700, fontSize:"0.88rem", color:"#57CC99", marginBottom:4 }}>💳 Refund: ₹{amountInr}</p>
              <p style={{ color:"var(--muted)", fontSize:"0.8rem", lineHeight:1.6 }}>
                Your payment will be refunded to your original payment method within{" "}
                <strong style={{ color:"var(--white)" }}>5-7 business days</strong>. You'll get an SMS once initiated.
              </p>
            </>
          ) : (
            <p style={{ color:"var(--muted)", fontSize:"0.85rem" }}>ℹ️ No payment was made — no refund needed.</p>
          )}
        </div>

        {error && (
          <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.3)", borderRadius:8, padding:"10px 14px", marginBottom:16, color:"#E63946", fontSize:"0.85rem" }}>
            {error}
          </div>
        )}

        <p style={{ fontSize:"0.75rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>Reason for cancellation</p>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:24 }}>
          {REASONS.map((r) => (
            <button key={r} onClick={() => setReason(r)} style={{
              padding:"10px 14px", borderRadius:8, textAlign:"left", fontSize:"0.87rem",
              background: reason===r ? "rgba(230,57,70,0.1)" : "var(--charcoal)",
              border:`1.5px solid ${reason===r ? "#E63946" : "var(--border)"}`,
              color: reason===r ? "#E63946" : "var(--muted)", transition:"all 0.15s",
            }}>{r}</button>
          ))}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:50, border:"1.5px solid var(--border)", background:"transparent", color:"var(--muted)", fontWeight:600 }}>
            Keep Order
          </button>
          <button onClick={handleCancel} disabled={submitting || !reason} style={{
            flex:1, padding:"12px 0", borderRadius:50, fontWeight:700, fontSize:"0.9rem",
            background: reason ? "#E63946" : "var(--border)", color:"#fff", border:"none",
            cursor: reason && !submitting ? "pointer" : "not-allowed",
            opacity: !reason || submitting ? 0.6 : 1,
          }}>
            {submitting ? "Cancelling…" : "Cancel Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
