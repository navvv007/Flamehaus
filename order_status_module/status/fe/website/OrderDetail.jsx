import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/apiClient";

const STATUS_CONFIG = {
  "Pending":    { color:"#4CC9F0", bg:"rgba(76,201,240,0.1)",   icon:"⏳", label:"Pending",    desc:"Order placed — awaiting restaurant confirmation" },
  "Confirmed":  { color:"#C77DFF", bg:"rgba(199,125,255,0.1)",  icon:"✅", label:"Confirmed",   desc:"Restaurant confirmed your order" },
  "Preparing":  { color:"#F4C842", bg:"rgba(244,200,66,0.1)",   icon:"👨‍🍳", label:"Preparing",   desc:"Kitchen is preparing your food" },
  "On the Way": { color:"#FF6B35", bg:"rgba(255,107,53,0.1)",   icon:"🛵", label:"On the Way",  desc:"Your order is on the way!" },
  "Delivered":  { color:"#57CC99", bg:"rgba(87,204,153,0.1)",   icon:"🎉", label:"Delivered",   desc:"Order delivered. Enjoy your meal!" },
  "Cancelled":  { color:"#E63946", bg:"rgba(230,57,70,0.1)",    icon:"✕",  label:"Cancelled",   desc:"This order has been cancelled" },
  "Refunded":   { color:"#888",    bg:"rgba(136,136,136,0.1)",  icon:"💰", label:"Refunded",    desc:"Your payment has been refunded (5–7 business days)" },
  "Failed":     { color:"#E63946", bg:"rgba(230,57,70,0.08)",   icon:"⚠️", label:"Failed",      desc:"Delivery was unsuccessful" },
};

const STEPS = ["Pending","Confirmed","Preparing","On the Way","Delivered"];

function TimeoutBanner({ assignedAt }) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    if (!assignedAt) return;
    const calc = () => setMins(Math.floor((Date.now() - new Date(assignedAt).getTime()) / 60000));
    calc(); const t = setInterval(calc, 60000); return () => clearInterval(t);
  }, [assignedAt]);
  if (!assignedAt) return null;
  const left = 120 - mins;
  if (left > 30) return null;
  if (left <= 0) return (
    <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <span style={{ fontSize:"1.3rem" }}>🚨</span>
        <div>
          <p style={{ color:"#E63946", fontWeight:700, marginBottom:3 }}>Delivery overdue — auto-cancellation pending</p>
          <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>Full refund will be credited within 5–7 business days.</p>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ background:"rgba(244,200,66,0.08)", border:"1px solid rgba(244,200,66,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <span style={{ fontSize:"1.3rem" }}>⚠️</span>
        <div>
          <p style={{ color:"#F4C842", fontWeight:700, marginBottom:3 }}>Delivery running late — {left} min remaining</p>
          <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>Auto-cancel and full refund if not delivered in time.</p>
        </div>
      </div>
      <div style={{ marginTop:8, height:4, background:"var(--charcoal)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:2, background:"#F4C842", width:`${Math.round(mins/1.2)}%` }}/>
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { orderId }             = useParams();
  const [order,   setOrder]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("fh_customer_token");
    const cfg   = token ? { headers:{ Authorization:`Bearer ${token}` } } : {};
    api.get(`/orders/${orderId}/track`, cfg)
      .then(r => setOrder(r.data))
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCancel = async () => {
    setCancelling(true);
    const token = localStorage.getItem("fh_customer_token");
    try {
      await api.post(`/customer/orders/${orderId}/cancel`,
        { reason: cancelReason || "Customer requested cancellation" },
        { headers: { Authorization: `Bearer ${token}` } });
      setShowCancel(false);
      const r = await api.get(`/orders/${orderId}/track`,
        { headers: { Authorization: `Bearer ${token}` } });
      setOrder(r.data);
    } catch(e) { setError(e.response?.data?.error || "Failed to cancel"); }
    finally { setCancelling(false); }
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:"var(--muted)" }}>Loading your order…</div>;
  if (!order)  return (
    <div style={{ padding:60, textAlign:"center" }}>
      <p style={{ color:"#E63946", marginBottom:16 }}>{error || "Order not found"}</p>
      <Link to="/my-orders" className="btn-primary">My Orders</Link>
    </div>
  );

  const sc     = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pending"];
  const idx    = STEPS.indexOf(order.status);
  const amtInr = Math.round((order.total || 0) * 84);
  const canCancel = ["Pending","Confirmed","Preparing"].includes(order.status);

  return (
    <div style={{ padding:"60px 5%", maxWidth:680, margin:"0 auto" }}>
      <Link to="/my-orders" style={{ color:"var(--muted)", fontSize:"0.85rem", display:"inline-flex", alignItems:"center", gap:6, marginBottom:28 }}>
        ← My Orders
      </Link>

      {/* Status hero */}
      <div style={{ background:sc.bg, border:`1.5px solid ${sc.color}33`, borderRadius:16, padding:"24px 28px", marginBottom:28, textAlign:"center" }}>
        <div style={{ fontSize:"2.8rem", marginBottom:10 }}>{sc.icon}</div>
        <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.6rem", color:sc.color, marginBottom:6 }}>{sc.label}</h1>
        <p style={{ color:"var(--muted)", fontSize:"0.9rem" }}>{sc.desc}</p>
        {order.trackingNote && order.trackingNote !== sc.desc && (
          <p style={{ color:"var(--white)", fontSize:"0.85rem", marginTop:8, fontStyle:"italic" }}>{order.trackingNote}</p>
        )}
      </div>

      {/* Timeout banner */}
      {order.assignment && ["On the Way","Preparing"].includes(order.status) && (
        <TimeoutBanner assignedAt={order.assignment?.assignedAt} />
      )}

      {/* Refund notice */}
      {(order.status === "Cancelled" || order.status === "Refunded" || order.status === "Failed") && order.payment?.status && (
        <div style={{ background:"rgba(136,136,136,0.08)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
          <p style={{ fontWeight:600, marginBottom:4 }}>💰 Refund Status</p>
          {order.payment.status === "REFUNDED" && <p style={{ color:"#57CC99", fontSize:"0.87rem" }}>✓ Refund of ₹{amtInr} initiated — credit within 5–7 business days</p>}
          {order.payment.status === "REFUND_PENDING" && <p style={{ color:"#F4C842", fontSize:"0.87rem" }}>⏳ Refund being processed — our team will complete within 24 hours</p>}
          {order.payment.status === "PAID" && order.status === "Cancelled" && <p style={{ color:"#F4C842", fontSize:"0.87rem" }}>⏳ Refund will be initiated shortly</p>}
        </div>
      )}

      {/* Progress tracker — only for active statuses */}
      {idx >= 0 && !["Cancelled","Refunded","Failed"].includes(order.status) && (
        <div className="card" style={{ padding:"20px 22px", marginBottom:20 }}>
          <p style={{ fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:16 }}>Order Progress</p>
          <div style={{ display:"flex", alignItems:"center" }}>
            {STEPS.map((s, i) => {
              const done = i <= idx;
              const cur  = i === idx;
              const ss   = STATUS_CONFIG[s];
              return (
                <div key={s} style={{ display:"flex", alignItems:"center", flex: i<STEPS.length-1?1:"none" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{
                      width:36, height:36, borderRadius:"50%", margin:"0 auto 6px",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem",
                      background: done ? ss.bg : "var(--charcoal)",
                      border: `2px solid ${done ? ss.color : "var(--border)"}`,
                      boxShadow: cur ? `0 0 0 3px ${ss.color}33` : "none",
                    }}>{ss.icon}</div>
                    <p style={{ fontSize:"0.65rem", color:done?ss.color:"var(--muted)", fontWeight:cur?700:400, whiteSpace:"nowrap" }}>{ss.label}</p>
                  </div>
                  {i<STEPS.length-1 && <div style={{ flex:1, height:2, margin:"0 3px 18px", background:i<idx?"var(--flame)":"var(--border)" }}/>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery partner info */}
      {order.assignment && ["On the Way","Preparing","Confirmed"].includes(order.status) && (
        <div className="card" style={{ padding:"18px 20px", marginBottom:20 }}>
          <p style={{ fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>🛵 Your Delivery Partner</p>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--charcoal)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0 }}>🛵</div>
            <div>
              <p style={{ fontWeight:700 }}>{order.assignment.partner?.name || "—"}</p>
              <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>📞 {order.assignment.partner?.phone || "—"}</p>
            </div>
            {order.assignment.deliveryOtp && (
              <div style={{ marginLeft:"auto", textAlign:"center" }}>
                <p style={{ fontSize:"0.68rem", color:"var(--muted)", marginBottom:2 }}>Delivery OTP</p>
                <p style={{ fontFamily:"monospace", fontWeight:900, fontSize:"1.5rem", color:"var(--flame)", letterSpacing:6 }}>{order.assignment.deliveryOtp}</p>
                <p style={{ fontSize:"0.65rem", color:"var(--muted)" }}>Share on arrival</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="card" style={{ padding:"18px 20px", marginBottom:20 }}>
        <p style={{ fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:12 }}>Order Summary</p>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:"var(--muted)", fontSize:"0.87rem" }}>Order #</span>
          <span style={{ fontWeight:600 }}>{order.id}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:"var(--muted)", fontSize:"0.87rem" }}>Items</span>
          <span style={{ fontSize:"0.87rem", maxWidth:240, textAlign:"right" }}>{order.itemsSummary}</span>
        </div>
        <div style={{ borderTop:"1px solid var(--border)", paddingTop:10, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontWeight:700 }}>Total</span>
          <span style={{ fontFamily:"Syne,sans-serif", fontWeight:800, color:"var(--flame)", fontSize:"1.1rem" }}>₹{amtInr}</span>
        </div>
      </div>

      {/* Delivery address */}
      <div className="card" style={{ padding:"18px 20px", marginBottom:24 }}>
        <p style={{ fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>📍 Delivery Address</p>
        <p style={{ fontSize:"0.88rem", lineHeight:1.7 }}>
          {[order.addressLine1,order.addressLine2,order.landmark,order.city,order.state,order.pincode].filter(Boolean).join(", ") || order.deliveryAddress || "—"}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:10 }}>
        {canCancel && (
          <button onClick={()=>setShowCancel(true)} style={{
            flex:1, padding:"13px 0", borderRadius:50, fontWeight:700, fontSize:"0.9rem",
            background:"rgba(230,57,70,0.08)", border:"1.5px solid rgba(230,57,70,0.3)", color:"#E63946", cursor:"pointer",
          }}>✕ Cancel Order</button>
        )}
        {order.status === "Delivered" && (
          <Link to={`/rate/${orderId}`} className="btn-primary" style={{ flex:1, justifyContent:"center", padding:"13px 0", textAlign:"center" }}>
            ⭐ Rate Your Order
          </Link>
        )}
        <Link to="/menu" className="btn-outline" style={{ flex:1, justifyContent:"center", padding:"13px 0", textAlign:"center" }}>Order Again</Link>
      </div>

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
          <div className="card" style={{ maxWidth:380, width:"100%", padding:"32px 28px" }}>
            <h3 style={{ fontFamily:"Syne,sans-serif", marginBottom:12 }}>Cancel Order #{orderId}?</h3>
            <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginBottom:16 }}>
              {order.payment?.status === "PAID"
                ? "A full refund will be initiated to your original payment method (5–7 business days)."
                : "No payment was made — no refund needed."}
            </p>
            <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)}
              placeholder="Reason (optional)…" rows={2} style={{ width:"100%", marginBottom:16, resize:"none" }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowCancel(false)} className="btn-outline" style={{ flex:1, padding:"11px 0" }}>Keep Order</button>
              <button onClick={handleCancel} disabled={cancelling}
                style={{ flex:1, padding:"11px 0", borderRadius:50, background:"#E63946", color:"#fff", fontWeight:700, border:"none", cursor:"pointer", opacity:cancelling?0.7:1 }}>
                {cancelling?"Cancelling…":"Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}