import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/apiClient";

const token = () => localStorage.getItem("fh_admin_token");
const cfg   = () => ({ headers: { Authorization: `Bearer ${token()}` } });

// All possible order statuses with display config
const STATUS_CONFIG = {
  "Pending":    { color:"#4CC9F0", bg:"rgba(76,201,240,0.12)",   icon:"⏳", label:"Pending",    desc:"Order placed, awaiting confirmation" },
  "Confirmed":  { color:"#C77DFF", bg:"rgba(199,125,255,0.12)",  icon:"✅", label:"Confirmed",   desc:"Order confirmed by restaurant" },
  "Preparing":  { color:"#F4C842", bg:"rgba(244,200,66,0.12)",   icon:"👨‍🍳", label:"Preparing",   desc:"Kitchen is preparing your order" },
  "On the Way": { color:"#FF6B35", bg:"rgba(255,107,53,0.12)",   icon:"🛵", label:"On the Way",  desc:"Delivery partner is on the way" },
  "Delivered":  { color:"#57CC99", bg:"rgba(87,204,153,0.12)",   icon:"🎉", label:"Delivered",   desc:"Order delivered successfully" },
  "Cancelled":  { color:"#E63946", bg:"rgba(230,57,70,0.12)",    icon:"✕",  label:"Cancelled",   desc:"Order has been cancelled" },
  "Refunded":   { color:"#888",    bg:"rgba(136,136,136,0.12)",  icon:"💰", label:"Refunded",    desc:"Payment refunded to customer" },
  "Failed":     { color:"#E63946", bg:"rgba(230,57,70,0.08)",    icon:"⚠️", label:"Failed",      desc:"Delivery failed" },
};

// Status flow — which statuses can admin advance to
const NEXT_STATUS = {
  "Pending":    ["Confirmed","Cancelled"],
  "Confirmed":  ["Preparing","Cancelled"],
  "Preparing":  ["On the Way","Cancelled"],
  "On the Way": ["Delivered","Failed","Cancelled"],
  "Delivered":  [],
  "Cancelled":  ["Refunded"],
  "Failed":     ["Refunded","Preparing"],
  "Refunded":   [],
};

const PAYMENT_CONFIG = {
  "PAID":            { color:"#57CC99", label:"Paid" },
  "PENDING":         { color:"#F4C842", label:"Pending" },
  "REFUNDED":        { color:"#888",    label:"Refunded" },
  "REFUND_PENDING":  { color:"#F4C842", label:"Refund Pending" },
  "FAILED":          { color:"#E63946", label:"Failed" },
};

const STEPS = ["Pending","Confirmed","Preparing","On the Way","Delivered"];

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || { color:"#888", bg:"rgba(136,136,136,0.1)", icon:"●", label:status };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 14px", borderRadius:20, fontSize:"0.82rem", fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.color}33` }}>
      {s.icon} {s.label}
    </span>
  );
}

function ProgressBar({ status }) {
  const idx = STEPS.indexOf(status);
  if (idx < 0) return null;
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center" }}>
        {STEPS.map((s, i) => {
          const done    = i <= idx;
          const current = i === idx;
          const sc      = STATUS_CONFIG[s];
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : "none" }}>
              <div style={{ textAlign:"center", minWidth:64 }}>
                <div style={{
                  width:38, height:38, borderRadius:"50%", margin:"0 auto 6px",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"1.1rem",
                  background: done ? sc.bg : "var(--charcoal)",
                  border: `2px solid ${done ? sc.color : "var(--border)"}`,
                  boxShadow: current ? `0 0 0 3px ${sc.color}33` : "none",
                }}>
                  {sc.icon}
                </div>
                <p style={{ fontSize:"0.68rem", fontWeight: current ? 700 : 400, color: done ? sc.color : "var(--muted)", whiteSpace:"nowrap" }}>
                  {sc.label}
                </p>
              </div>
              {i < STEPS.length-1 && (
                <div style={{ flex:1, height:2, margin:"0 4px 20px", background: i < idx ? "var(--flame)" : "var(--border)", transition:"background 0.3s" }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const params = useParams();
  const orderId = params.orderId ?? params.id;
  const [order,     setOrder]   = useState(null);
  const [payment,   setPayment] = useState(null);
  const [loading,   setLoading] = useState(true);
  const [error,     setError]   = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const load = async () => {
    try {
      const r = await api.get(`/admin/orders/${orderId}`, cfg());
      setOrder(r.data);
      if (r.data.payment) setPayment(r.data.payment);
    } catch { setError("Failed to load order"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [orderId]);

  const handleAdvance = async () => {
    setAdvancing(true); setError("");
    try { await api.patch(`/admin/orders/${orderId}/advance`, {}, cfg()); await load(); }
    catch(e) { setError(e.response?.data?.error || "Failed to advance"); }
    finally { setAdvancing(false); }
  };

  const handleSetStatus = async (newStatus) => {
    setAdvancing(true); setError("");
    try {
      if (newStatus === "Cancelled") {
        await api.post(`/admin/orders/${orderId}/cancel`,
          { reason: cancelReason || "Cancelled by admin" }, cfg());
        setShowCancel(false);
      } else {
        await api.patch(`/admin/orders/${orderId}/status`,
          { status: newStatus }, cfg());
      }
      await load();
    } catch(e) { setError(e.response?.data?.error || `Failed to set ${newStatus}`); }
    finally { setAdvancing(false); }
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:"var(--muted)" }}>Loading…</div>;
  if (!order)  return <div style={{ padding:60, textAlign:"center", color:"#E63946" }}>{error || "Order not found"}</div>;

  const sc      = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pending"];
  const nextOpts= NEXT_STATUS[order.status] || [];
  const amtInr  = Math.round((order.total || 0) * 84);
  const pc      = PAYMENT_CONFIG[payment?.status || "PENDING"];

  return (
    <div style={{ padding:"40px 36px", maxWidth:800 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <Link to="/admin/orders" style={{ color:"var(--muted)", fontSize:"0.85rem" }}>← All Orders</Link>
          <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.8rem", marginTop:6, marginBottom:8 }}>Order #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"1.6rem", color:"var(--flame)" }}>₹{amtInr}</p>
          {payment && (
            <span style={{ fontSize:"0.78rem", fontWeight:700, color:pc.color }}>💳 {pc.label}</span>
          )}
        </div>
      </div>

      {error && <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", borderRadius:10, padding:"11px 14px", marginBottom:20, color:"#E63946", fontSize:"0.87rem" }}>{error}</div>}

      {/* Progress bar */}
      <ProgressBar status={order.status} />

      {/* Tracking note */}
      {order.trackingNote && (
        <div style={{ background:`${sc.bg}`, border:`1px solid ${sc.color}33`, borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:"1.2rem" }}>{sc.icon}</span>
          <p style={{ color:sc.color, fontSize:"0.88rem", fontWeight:500 }}>{order.trackingNote}</p>
        </div>
      )}

      {/* Status actions */}
      {nextOpts.length > 0 && (
        <div className="card" style={{ padding:"18px 20px", marginBottom:20 }}>
          <p style={{ fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:12 }}>Update Status</p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {nextOpts.map(s => {
              const ns = STATUS_CONFIG[s];
              const isCancelOrRefund = s === "Cancelled" || s === "Refunded";
              return (
                <button key={s} onClick={() => s === "Cancelled" ? setShowCancel(true) : handleSetStatus(s)}
                  disabled={advancing}
                  style={{
                    padding:"10px 20px", borderRadius:50, fontWeight:700, fontSize:"0.88rem",
                    background: isCancelOrRefund ? "rgba(230,57,70,0.1)" : "var(--flame)",
                    color:      isCancelOrRefund ? "#E63946" : "#fff",
                    border:     isCancelOrRefund ? "1.5px solid rgba(230,57,70,0.35)" : "none",
                    cursor:     advancing ? "not-allowed" : "pointer", opacity: advancing ? 0.7 : 1,
                  }}>
                  {ns?.icon} {ns?.label || s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
          <div className="card" style={{ maxWidth:400, width:"100%", padding:"32px 28px" }}>
            <h3 style={{ fontFamily:"Syne,sans-serif", marginBottom:16 }}>Cancel Order #{order.id}?</h3>
            <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginBottom:16 }}>This will cancel the order and initiate a refund if payment was made.</p>
            <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)}
              placeholder="Reason for cancellation…" rows={3} style={{ width:"100%", marginBottom:16, resize:"none" }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowCancel(false)} className="btn-outline" style={{ flex:1, padding:"11px 0" }}>Keep Order</button>
              <button onClick={()=>handleSetStatus("Cancelled")} disabled={advancing}
                style={{ flex:1, padding:"11px 0", borderRadius:50, background:"#E63946", color:"#fff", fontWeight:700, border:"none", cursor:"pointer", opacity:advancing?0.7:1 }}>
                {advancing?"Cancelling…":"Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order info grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <div className="card" style={{ padding:"18px 20px" }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:12 }}>Customer</p>
          <p style={{ fontWeight:700, marginBottom:4 }}>{order.customerName}</p>
          <p style={{ color:"var(--muted)", fontSize:"0.85rem" }}>📞 {order.customerPhone}</p>
        </div>
        <div className="card" style={{ padding:"18px 20px" }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:12 }}>Payment</p>
          <p style={{ fontWeight:700, color:"var(--flame)", marginBottom:4 }}>₹{amtInr}</p>
          {payment && <p style={{ fontSize:"0.82rem", color:pc.color, fontWeight:600 }}>{pc.label} via {payment.gateway}</p>}
          {payment?.gatewayPaymentId && <p style={{ color:"var(--muted)", fontSize:"0.72rem", marginTop:4 }}>ID: {payment.gatewayPaymentId}</p>}
        </div>
      </div>

      {/* Delivery address */}
      <div className="card" style={{ padding:"18px 20px", marginBottom:20 }}>
        <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>📍 Delivery Address</p>
        <p style={{ fontSize:"0.9rem", lineHeight:1.7 }}>
          {[order.addressLine1, order.addressLine2, order.landmark, order.city, order.state, order.pincode].filter(Boolean).join(", ") || order.deliveryAddress || "—"}
        </p>
      </div>

      {/* Items */}
      <div className="card" style={{ padding:"18px 20px", marginBottom:20 }}>
        <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>🍽 Items</p>
        <p style={{ fontSize:"0.9rem" }}>{order.itemsSummary || "—"}</p>
      </div>

      {/* Delivery assignment */}
      {order.assignment && (
        <div className="card" style={{ padding:"18px 20px" }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:12 }}>🛵 Delivery Partner</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontWeight:700, marginBottom:4 }}>{order.assignment.partner?.name || "—"}</p>
              <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>📞 {order.assignment.partner?.phone || "—"}</p>
              <p style={{ color:"var(--muted)", fontSize:"0.78rem", marginTop:4 }}>
                Assigned: {order.assignment.assignedAt ? new Date(order.assignment.assignedAt).toLocaleString("en-IN") : "—"}
              </p>
            </div>
            <StatusBadge status={order.assignment.status} />
          </div>
          {order.assignment.status === "REJECTED" && order.assignment.rejectionReason && (
            <p style={{ color:"#E63946", fontSize:"0.8rem", marginTop:8 }}>Rejection reason: {order.assignment.rejectionReason}</p>
          )}
        </div>
      )}
    </div>
  );
}