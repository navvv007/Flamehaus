import { useState, useEffect } from "react";
import api from "../../api/apiClient";

const STATUS_COLORS = {
  INITIATED:      { bg:"rgba(87,204,153,0.12)",  color:"#57CC99", border:"rgba(87,204,153,0.3)" },
  COMPLETED:      { bg:"rgba(87,204,153,0.18)",  color:"#57CC99", border:"rgba(87,204,153,0.4)" },
  FAILED:         { bg:"rgba(230,57,70,0.12)",   color:"#E63946", border:"rgba(230,57,70,0.3)"  },
  NOT_APPLICABLE: { bg:"rgba(136,136,136,0.1)",  color:"#888",    border:"var(--border)"         },
};

export default function AdminCancellations() {
  const [cancellations, setCancellations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [cancelModal,   setCancelModal]   = useState(null); // { orderId }
  const [cancelReason,  setCancelReason]  = useState("");
  const [cancelling,    setCancelling]    = useState(false);

  const token = localStorage.getItem("fh_admin_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const res = await api.get("/admin/cancellations", cfg);
      setCancellations(res.data);
    } catch { setError("Failed to load cancellations"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdminCancel = async () => {
    if (!cancelModal?.orderId) return;
    setCancelling(true);
    try {
      await api.post(`/admin/orders/${cancelModal.orderId}/cancel`,
        { reason: cancelReason || "Admin cancelled" }, cfg);
      setCancelModal(null);
      setCancelReason("");
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to cancel");
    } finally { setCancelling(false); }
  };

  const filtered = cancellations.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return String(c.order?.id).includes(s) ||
      (c.cancelledByName || "").toLowerCase().includes(s) ||
      (c.reason || "").toLowerCase().includes(s);
  });

  const fmt = (dt) => dt ? new Date(dt).toLocaleString("en-IN", {
    day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";

  return (
    <div style={{ padding:"36px 32px" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <div className="section-label" style={{ marginBottom:6 }}>Order Management</div>
          <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.8rem" }}>Cancellations & Refunds</h1>
          <p style={{ color:"var(--muted)", fontSize:"0.88rem", marginTop:4 }}>{cancellations.length} total cancellation{cancellations.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn-primary" onClick={() => { setCancelModal({ orderId: "" }); setCancelReason(""); }}
          style={{ padding:"10px 22px", fontSize:"0.9rem" }}>
          + Cancel an Order
        </button>
      </div>

      {/* Search */}
      <input type="text" placeholder="🔍  Search by order ID, customer or reason…"
        value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ width:"100%", maxWidth:420, marginBottom:20 }} />

      {error && <div style={{ color:"#E63946", marginBottom:16, padding:"10px 14px", background:"rgba(230,57,70,0.1)", borderRadius:8 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🚫</div>
          <p style={{ color:"var(--muted)" }}>No cancellations yet</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.map((c) => {
            const sc = STATUS_COLORS[c.refundStatus] || STATUS_COLORS.NOT_APPLICABLE;
            return (
              <div key={c.id} className="card" style={{ padding:"20px 22px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:12 }}>
                  <div>
                    <p style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:"1rem", marginBottom:3 }}>
                      Order #{c.order?.id}
                    </p>
                    <p style={{ color:"var(--muted)", fontSize:"0.8rem" }}>
                      Cancelled {fmt(c.cancelledAt)} by{" "}
                      <span style={{ color: c.cancelledBy === "ADMIN" ? "var(--flame)" : "var(--white)" }}>
                        {c.cancelledBy === "ADMIN" ? `Admin (${c.cancelledByName})` : c.cancelledByName || "Customer"}
                      </span>
                    </p>
                    {c.reason && <p style={{ color:"var(--muted)", fontSize:"0.8rem", marginTop:2 }}>Reason: {c.reason}</p>}
                  </div>
                  <span style={{ padding:"5px 14px", borderRadius:20, fontSize:"0.75rem", fontWeight:700, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, whiteSpace:"nowrap" }}>
                    {c.refundStatus === "INITIATED"      ? "💳 Refund Initiated" :
                     c.refundStatus === "COMPLETED"      ? "✅ Refunded" :
                     c.refundStatus === "FAILED"         ? "❌ Refund Failed" :
                     "No Refund"}
                  </span>
                </div>

                {/* Refund detail */}
                {c.refundStatus !== "NOT_APPLICABLE" && (
                  <div style={{ background:"var(--charcoal)", borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:12 }}>
                      {c.refundAmount && (
                        <div>
                          <p style={{ fontSize:"0.68rem", color:"var(--muted)", marginBottom:3 }}>Amount</p>
                          <p style={{ fontWeight:700, color:"#57CC99" }}>₹{Math.round(c.refundAmount)}</p>
                        </div>
                      )}
                      {c.refundGateway && (
                        <div>
                          <p style={{ fontSize:"0.68rem", color:"var(--muted)", marginBottom:3 }}>Gateway</p>
                          <p style={{ fontWeight:600 }}>{c.refundGateway}</p>
                        </div>
                      )}
                      {c.refundId && (
                        <div>
                          <p style={{ fontSize:"0.68rem", color:"var(--muted)", marginBottom:3 }}>Refund ID</p>
                          <p style={{ fontSize:"0.78rem", fontFamily:"monospace", color:"var(--muted)" }}>{c.refundId}</p>
                        </div>
                      )}
                      {c.refundInitiatedAt && (
                        <div>
                          <p style={{ fontSize:"0.68rem", color:"var(--muted)", marginBottom:3 }}>Initiated</p>
                          <p style={{ fontSize:"0.8rem" }}>{fmt(c.refundInitiatedAt)}</p>
                        </div>
                      )}
                    </div>
                    {c.refundNote && (
                      <p style={{ color:"var(--muted)", fontSize:"0.78rem", marginTop:10, lineHeight:1.5 }}>{c.refundNote}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin cancel modal */}
      {cancelModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
          <div className="card" style={{ width:"100%", maxWidth:400, padding:"32px 28px" }}>
            <h3 style={{ fontFamily:"Syne,sans-serif", marginBottom:20 }}>Cancel an Order</h3>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:"0.8rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>Order ID</label>
              <input type="number" value={cancelModal.orderId}
                onChange={(e) => setCancelModal((p) => ({ ...p, orderId: e.target.value }))}
                placeholder="Enter order number" style={{ width:"100%" }} autoFocus />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:"block", fontSize:"0.8rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>Reason (optional)</label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Kitchen issue, Out of stock…" rows={3} style={{ width:"100%", resize:"none" }} />
            </div>
            <div style={{ background:"rgba(244,200,66,0.07)", border:"1px solid rgba(244,200,66,0.2)", borderRadius:8, padding:"10px 12px", marginBottom:20, fontSize:"0.82rem", color:"var(--muted)" }}>
              ⚠️ If the order was paid, a refund will be initiated automatically via Razorpay or Stripe.
            </div>
            {error && <div style={{ color:"#E63946", fontSize:"0.85rem", marginBottom:14 }}>{error}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setCancelModal(null); setError(""); }} style={{ flex:1, padding:"12px 0", borderRadius:50, border:"1.5px solid var(--border)", background:"transparent", color:"var(--muted)", fontWeight:600 }}>
                Discard
              </button>
              <button onClick={handleAdminCancel} disabled={cancelling || !cancelModal.orderId}
                style={{ flex:1, padding:"12px 0", borderRadius:50, fontWeight:700, background:"#E63946", color:"#fff", border:"none", opacity: cancelling || !cancelModal.orderId ? 0.6 : 1 }}>
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
