import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { trackOrder } from "../../api/apiClient";
import CancelOrderModal from "../components/CancelOrderModal";

const STATUS_COLOR = {
  Pending:    { bg:"rgba(244,200,66,0.12)",  color:"#F4C842", border:"rgba(244,200,66,0.3)"  },
  Preparing:  { bg:"rgba(255,107,53,0.12)",  color:"#FF6B35", border:"rgba(255,107,53,0.3)"  },
  "On the Way":{ bg:"rgba(76,201,240,0.12)", color:"#4CC9F0", border:"rgba(76,201,240,0.3)"  },
  Delivered:  { bg:"rgba(87,204,153,0.12)",  color:"#57CC99", border:"rgba(87,204,153,0.3)"  },
  Cancelled:  { bg:"rgba(230,57,70,0.12)",   color:"#E63946", border:"rgba(230,57,70,0.3)"   },
};

const STEPS = ["Pending","Preparing","On the Way","Delivered"];

function StatusBar({ status }) {
  const idx = STEPS.indexOf(status);
  if (idx === -1) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:28 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : "none" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{
              width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem",
              background: i <= idx ? "var(--flame)" : "var(--charcoal)",
              border:`2px solid ${i <= idx ? "var(--flame)" : "var(--border)"}`,
            }}>
              {["📦","👨‍🍳","🛵","✅"][i]}
            </div>
            <div style={{ fontSize:"0.65rem", marginTop:4, color: i <= idx ? "var(--flame)" : "var(--muted)", fontWeight: i === idx ? 700 : 400 }}>{s}</div>
          </div>
          {i < STEPS.length-1 && <div style={{ flex:1, height:2, margin:"0 4px", marginBottom:22, background: i < idx ? "var(--flame)" : "var(--border)" }}/>}
        </div>
      ))}
    </div>
  );
}

function RefundBadge({ cancellation }) {
  if (!cancellation) return null;
  const { refundStatus, refundAmount, refundGateway, refundId, refundNote } = cancellation;
  const colors = {
    INITIATED:      { bg:"rgba(87,204,153,0.1)",  color:"#57CC99", border:"rgba(87,204,153,0.3)" },
    COMPLETED:      { bg:"rgba(87,204,153,0.15)", color:"#57CC99", border:"rgba(87,204,153,0.4)" },
    FAILED:         { bg:"rgba(230,57,70,0.1)",   color:"#E63946", border:"rgba(230,57,70,0.3)"  },
    NOT_APPLICABLE: { bg:"rgba(136,136,136,0.1)", color:"#888",    border:"var(--border)"         },
  };
  const c = colors[refundStatus] || colors.NOT_APPLICABLE;
  return (
    <div style={{ borderRadius:12, padding:"16px 20px", marginBottom:20, background:c.bg, border:`1px solid ${c.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:refundNote ? 8 : 0 }}>
        <span style={{ fontSize:"1.2rem" }}>
          {refundStatus === "INITIATED" ? "💳" : refundStatus === "COMPLETED" ? "✅" : refundStatus === "FAILED" ? "❌" : "ℹ️"}
        </span>
        <div>
          <p style={{ fontWeight:700, color:c.color, fontSize:"0.9rem" }}>
            {refundStatus === "INITIATED"      ? `Refund Initiated — ₹${Math.round(refundAmount || 0)}` :
             refundStatus === "COMPLETED"      ? `Refund Completed — ₹${Math.round(refundAmount || 0)}` :
             refundStatus === "FAILED"         ? "Refund Failed — Contact Support" :
             "No Refund Applicable"}
          </p>
          {refundGateway && <p style={{ fontSize:"0.75rem", color:c.color, opacity:0.7 }}>via {refundGateway}</p>}
        </div>
      </div>
      {refundNote && <p style={{ color:"var(--muted)", fontSize:"0.8rem", lineHeight:1.5 }}>{refundNote}</p>}
      {refundId   && <p style={{ color:"var(--muted)", fontSize:"0.72rem", marginTop:4, fontFamily:"monospace" }}>Ref: {refundId}</p>}
    </div>
  );
}

export default function OrderDetail() {
  const { id }                    = useParams();
  const [order,        setOrder]  = useState(null);
  const [cancellation, setCancel] = useState(null);
  const [loading,      setLoading]= useState(true);
  const [error,        setError]  = useState("");
  const [showCancel,   setShowCancel] = useState(false);

  const load = async () => {
    try {
      const res = await trackOrder(id);
      setOrder(res.data);
      // Check for cancellation
      const token = localStorage.getItem("fh_customer_token");
      if (token) {
        try {
          const { default: api } = await import("../../api/apiClient");
          const cr = await api.get(`/customer/orders/${id}/cancellation`,
            { headers: { Authorization: `Bearer ${token}` } });
          setCancel(cr.data);
        } catch(_) {}
      }
    } catch { setError("Order not found"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <div style={{ minHeight:"70vh", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:"2rem", marginBottom:12 }}>⏳</div><p>Loading order…</p></div>
    </div>
  );

  if (error || !order) return (
    <div style={{ minHeight:"70vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:12 }}>❌</div>
        <p style={{ color:"var(--muted)" }}>{error || "Order not found"}</p>
        <Link to="/menu" className="btn-primary" style={{ marginTop:20, display:"inline-flex" }}>Back to Menu</Link>
      </div>
    </div>
  );

  const sc       = STATUS_COLOR[order.status] || STATUS_COLOR.Pending;
  const isCancelled   = order.status === "Cancelled";
  const isDelivered   = order.status === "Delivered";
  const isPaid        = order.paymentStatus === "PAID";
  const amountInr     = Math.round((order.total || 0) * 84);
  const isLoggedIn    = !!localStorage.getItem("fh_customer_token");
  const isSameDay     = new Date(order.createdAt).toDateString() === new Date().toDateString();
  const isCancellable = isLoggedIn && isSameDay && ["Pending","Preparing"].includes(order.status) && !isCancelled;

  return (
    <div style={{ padding:"60px 5%", maxWidth:680, margin:"0 auto" }}>
      {/* Back */}
      <Link to="/my-orders" style={{ color:"var(--muted)", fontSize:"0.88rem", display:"inline-flex", alignItems:"center", gap:6, marginBottom:32 }}>
        ← My Orders
      </Link>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <div className="section-label" style={{ marginBottom:6 }}>Order Detail</div>
          <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"2rem" }}>Order <span style={{ color:"var(--flame)" }}>#{order.id}</span></h1>
          <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginTop:4 }}>
            {new Date(order.createdAt).toLocaleString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
          </p>
        </div>
        <span style={{
          padding:"8px 18px", borderRadius:20, fontSize:"0.82rem", fontWeight:700,
          background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`,
        }}>
          {order.status}
        </span>
      </div>

      {/* Refund badge (shown when cancelled with payment) */}
      {isCancelled && <RefundBadge cancellation={cancellation} />}

      {/* Status steps */}
      {!isCancelled && <StatusBar status={order.status} />}

      {/* Cancelled notice */}
      {isCancelled && (
        <div style={{ background:"rgba(230,57,70,0.08)", border:"1px solid rgba(230,57,70,0.2)", borderRadius:12, padding:"16px 20px", marginBottom:24 }}>
          <p style={{ fontWeight:700, color:"#E63946", marginBottom:4 }}>🚫 Order Cancelled</p>
          {cancellation?.reason && <p style={{ color:"var(--muted)", fontSize:"0.85rem" }}>Reason: {cancellation.reason}</p>}
          {cancellation?.cancelledByName && (
            <p style={{ color:"var(--muted)", fontSize:"0.8rem", marginTop:4 }}>
              Cancelled by: {cancellation.cancelledBy === "ADMIN" ? "Flamehaus Admin" : "You"}
            </p>
          )}
        </div>
      )}

      {/* Order summary card */}
      <div className="card" style={{ padding:"22px 24px", marginBottom:20 }}>
        <h3 style={{ fontFamily:"Syne,sans-serif", marginBottom:16, fontSize:"1rem" }}>Order Summary</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
          <div>
            <p style={{ fontSize:"0.72rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Customer</p>
            <p style={{ fontWeight:600 }}>{order.customerName}</p>
            <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>📞 {order.customerPhone}</p>
          </div>
          <div>
            <p style={{ fontSize:"0.72rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Amount</p>
            <p style={{ fontWeight:800, color:"var(--flame)", fontSize:"1.2rem" }}>₹{amountInr}</p>
            <p style={{ fontSize:"0.75rem", color: isPaid ? "#57CC99" : "var(--muted)" }}>
              {isPaid ? "✓ Paid" : order.paymentStatus || "Unpaid"}
            </p>
          </div>
        </div>
        <div style={{ borderTop:"1px solid var(--border)", paddingTop:14, marginBottom:14 }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", marginBottom:4 }}>Delivery Address</p>
          <p style={{ fontSize:"0.88rem" }}>{order.deliveryAddress || "—"}</p>
        </div>
        <div style={{ borderTop:"1px solid var(--border)", paddingTop:14 }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", marginBottom:4 }}>Items</p>
          <p style={{ fontSize:"0.88rem", lineHeight:1.6 }}>{order.itemsSummary || "—"}</p>
        </div>
      </div>

      {/* Tracking note */}
      {order.trackingNote && !isCancelled && (
        <div className="card" style={{ padding:"16px 20px", marginBottom:20, borderColor:"rgba(255,107,53,0.2)" }}>
          <p style={{ fontSize:"0.8rem", color:"var(--muted)", marginBottom:4 }}>📍 Status Update</p>
          <p style={{ fontSize:"0.9rem" }}>{order.trackingNote}</p>
        </div>
      )}

      {/* Pay button if unpaid and not cancelled */}
      {!isPaid && !isCancelled && !isDelivered && (
        <Link to={`/payment/${order.id}`} className="btn-primary" style={{ display:"flex", justifyContent:"center", padding:"14px 0", marginBottom:12 }}>
          💳 Complete Payment
        </Link>
      )}

      {/* ── Cancel Order button ────────────────────────────────────────────── */}
      {isCancellable && (
        <button
          onClick={() => setShowCancel(true)}
          style={{
            width:"100%", padding:"13px 0", borderRadius:50, fontWeight:700, fontSize:"0.9rem",
            background:"rgba(230,57,70,0.08)", color:"#E63946",
            border:"1.5px solid rgba(230,57,70,0.35)", transition:"all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(230,57,70,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(230,57,70,0.08)"; }}
        >
          🚫 Cancel Order{isPaid ? " & Get Refund" : ""}
        </button>
      )}

      {/* Why can't they cancel */}
      {!isCancellable && !isCancelled && isLoggedIn && (
        <p style={{ textAlign:"center", color:"var(--muted)", fontSize:"0.8rem", marginTop:8 }}>
          {!isSameDay ? "Orders can only be cancelled on the same day." :
           isDelivered ? "" :
           "Orders in this status cannot be cancelled."}
        </p>
      )}

      {/* Rate order button */}
      {isDelivered && !cancellation && (
        <div style={{ marginTop:16, padding:"16px 20px", background:"rgba(244,200,66,0.07)", border:"1px solid rgba(244,200,66,0.2)", borderRadius:12, textAlign:"center" }}>
          <p style={{ color:"#F4C842", fontWeight:600, marginBottom:8 }}>⭐ How was your order?</p>
          <button className="btn-primary" style={{ padding:"10px 28px" }}
            onClick={() => {/* Open rating modal */}}>
            Rate This Order
          </button>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <CancelOrderModal
          order={order}
          onClose={() => setShowCancel(false)}
          onCancelled={(c) => {
            setShowCancel(false);
            setCancel(c);
            setOrder((prev) => ({ ...prev, status: "Cancelled" }));
          }}
        />
      )}
    </div>
  );
}
