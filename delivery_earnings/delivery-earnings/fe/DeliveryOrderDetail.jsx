import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/apiClient";

function dApi(path) {
  const token = localStorage.getItem("fh_delivery_token");
  return api.get(path, { headers: { Authorization: `Bearer ${token}` } });
}

const STATUS_COLORS = {
  ASSIGNED:  { bg:"rgba(76,201,240,0.12)",  color:"#4CC9F0",  label:"Assigned"  },
  ACCEPTED:  { bg:"rgba(199,125,255,0.12)", color:"#C77DFF",  label:"Accepted"  },
  PICKED_UP: { bg:"rgba(244,200,66,0.12)",  color:"#F4C842",  label:"Picked Up" },
  DELIVERED: { bg:"rgba(87,204,153,0.12)",  color:"#57CC99",  label:"Delivered" },
  REJECTED:  { bg:"rgba(230,57,70,0.12)",   color:"#E63946",  label:"Rejected"  },
  FAILED:    { bg:"rgba(136,136,136,0.12)", color:"#888",     label:"Failed"    },
};

const RATE_PER_DELIVERY = 50;

export default function DeliveryOrderDetail() {
  const { assignmentId }      = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => {
    dApi("/delivery/partner/assignments")
      .then(r => {
        const a = r.data.find(x => String(x.id) === String(assignmentId));
        setAssignment(a || null);
        if (!a) setError("Assignment not found");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--dark)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)" }}>Loading…</div>
  );
  if (error || !assignment) return (
    <div style={{ minHeight:"100vh", background:"var(--dark)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <p style={{ color:"#E63946" }}>{error || "Not found"}</p>
      <Link to="/delivery/dashboard" className="btn-primary">Back to Dashboard</Link>
    </div>
  );

  const order  = assignment.order || {};
  const sc     = STATUS_COLORS[assignment.status] || STATUS_COLORS.FAILED;
  const amtInr = Math.round((order.total || 0) * 84);

  const formatDt = (dt) => dt ? new Date(dt).toLocaleString("en-IN", {
    day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit",
  }) : "—";

  const duration = () => {
    if (!assignment.assignedAt || !assignment.deliveredAt) return null;
    const mins = Math.round((new Date(assignment.deliveredAt) - new Date(assignment.assignedAt)) / 60000);
    return mins < 60 ? `${mins} minutes` : `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  const fullAddress = [
    order.addressLine1, order.addressLine2, order.landmark,
    order.city, order.state, order.pincode,
  ].filter(Boolean).join(", ") || order.deliveryAddress || "—";

  return (
    <div style={{ minHeight:"100vh", background:"var(--dark)" }}>
      {/* Top bar */}
      <div style={{ background:"var(--charcoal)", borderBottom:"1px solid var(--border)", padding:"14px 18px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:50 }}>
        <Link to="/delivery/dashboard" style={{ color:"var(--muted)", fontSize:"1.2rem" }}>←</Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.05rem", fontWeight:700 }}>Order #{order.id}</h1>
          <p style={{ color:"var(--muted)", fontSize:"0.73rem" }}>Assignment #{assignment.id}</p>
        </div>
        <span style={{ padding:"5px 14px", borderRadius:20, fontSize:"0.78rem", fontWeight:700, ...sc }}>
          {sc.label}
        </span>
      </div>

      <div style={{ padding:"18px 16px", maxWidth:560, margin:"0 auto" }}>

        {/* Earnings card — shown only for delivered */}
        {assignment.status === "DELIVERED" && (
          <div className="card fade-in" style={{ padding:"20px 22px", marginBottom:16, background:"linear-gradient(135deg,rgba(87,204,153,0.1),rgba(87,204,153,0.03))", borderColor:"rgba(87,204,153,0.3)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ color:"var(--muted)", fontSize:"0.78rem", marginBottom:4 }}>YOUR EARNINGS</p>
                <p style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"2rem", color:"#57CC99" }}>₹{RATE_PER_DELIVERY}</p>
                <p style={{ color:"var(--muted)", fontSize:"0.75rem" }}>for this delivery</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:"var(--muted)", fontSize:"0.78rem", marginBottom:4 }}>ORDER VALUE</p>
                <p style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:"1.3rem" }}>₹{amtInr}</p>
                {duration() && <p style={{ color:"var(--muted)", fontSize:"0.75rem" }}>⏱ {duration()}</p>}
              </div>
            </div>
            {assignment.partnerRating && (
              <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(244,200,66,0.08)", borderRadius:8, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ color:"#F4C842", fontSize:"1rem" }}>{"★".repeat(assignment.partnerRating)}</span>
                <span style={{ color:"var(--muted)", fontSize:"0.8rem" }}>Customer rated your delivery</span>
              </div>
            )}
          </div>
        )}

        {/* Order details */}
        <div className="card" style={{ padding:"18px 20px", marginBottom:12 }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:12 }}>Order Details</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              ["Customer",    order.customerName  || "—"],
              ["Phone",       order.customerPhone || "—"],
              ["Order Total", `₹${amtInr}`],
              ["Items",       order.itemsSummary  || "—"],
            ].map(([k,v]) => (
              <div key={k}>
                <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, marginBottom:3 }}>{k.toUpperCase()}</p>
                <p style={{ fontSize:"0.88rem", fontWeight:500 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery address */}
        <div className="card" style={{ padding:"18px 20px", marginBottom:12 }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>📍 Delivery Address</p>
          <p style={{ fontSize:"0.88rem", lineHeight:1.7 }}>{fullAddress}</p>
          {order.deliveryLat && (
            <p style={{ fontSize:"0.72rem", color:"#4CC9F0", marginTop:6 }}>📡 GPS available</p>
          )}
        </div>

        {/* Timeline */}
        <div className="card" style={{ padding:"18px 20px", marginBottom:12 }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:12 }}>Timeline</p>
          {[
            { label:"Assigned",   time:assignment.assignedAt,  icon:"📦", show:true },
            { label:"Accepted",   time:assignment.acceptedAt,  icon:"✅", show:!!assignment.acceptedAt },
            { label:"Picked Up",  time:assignment.pickedUpAt,  icon:"🛵", show:!!assignment.pickedUpAt },
            { label:"Delivered",  time:assignment.deliveredAt, icon:"🎉", show:!!assignment.deliveredAt },
            { label:"Rejected",   time:assignment.rejectedAt,  icon:"❌", show:!!assignment.rejectedAt },
          ].filter(e => e.show).map(e => (
            <div key={e.label} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10 }}>
              <span style={{ fontSize:"1.1rem", marginTop:1, flexShrink:0 }}>{e.icon}</span>
              <div>
                <p style={{ fontWeight:600, fontSize:"0.85rem" }}>{e.label}</p>
                <p style={{ color:"var(--muted)", fontSize:"0.75rem" }}>{formatDt(e.time)}</p>
              </div>
            </div>
          ))}
          {assignment.rejectionReason && (
            <p style={{ fontSize:"0.8rem", color:"#E63946", marginTop:4 }}>Reason: {assignment.rejectionReason}</p>
          )}
        </div>

        {/* Your rating of the order */}
        {assignment.partnerOrderRating && (
          <div className="card" style={{ padding:"16px 20px", marginBottom:12 }}>
            <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Your Rating of this Delivery</p>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"#F4C842", fontSize:"1.2rem" }}>{"★".repeat(assignment.partnerOrderRating)}</span>
              {assignment.partnerOrderComment && <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>{assignment.partnerOrderComment}</p>}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <Link to="/delivery/earnings" className="btn-outline" style={{ flex:1, justifyContent:"center", padding:"12px 0", textAlign:"center" }}>
            💰 My Earnings
          </Link>
          <Link to="/delivery/dashboard" className="btn-primary" style={{ flex:1, justifyContent:"center", padding:"12px 0", textAlign:"center" }}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}