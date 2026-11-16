import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/apiClient";

const RATE_PER_DELIVERY = 50; // Rs earned per delivery - same value used on the Earnings page

const STATUS = {
  ASSIGNED:  { bg: "rgba(76,201,240,0.12)",  color: "#4CC9F0", label: "Assigned"  },
  ACCEPTED:  { bg: "rgba(199,125,255,0.12)", color: "#C77DFF", label: "Accepted"  },
  PICKED_UP: { bg: "rgba(244,200,66,0.12)",  color: "#F4C842", label: "Picked Up" },
  DELIVERED: { bg: "rgba(87,204,153,0.12)",  color: "#57CC99", label: "Delivered" },
  REJECTED:  { bg: "rgba(230,57,70,0.12)",   color: "#E63946", label: "Rejected"  },
  FAILED:    { bg: "rgba(136,136,136,0.12)", color: "#888",    label: "Failed"    },
};

const fmt = (dt) => dt
  ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

export default function DeliveryOrderDetail() {
  const { assignmentId } = useParams();
  const [a,       setA]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("fh_delivery_token");
      const r = await api.get(`/delivery/partner/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setA(r.data);
      setError("");
    } catch (e) {
      const status = e.response?.status;
      setError(status === 403 ? "This order belongs to another partner."
             : status === 404 ? "Assignment not found."
             : `Failed to load order${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  // Keep an active order fresh
  useEffect(() => {
    if (!a || !["ASSIGNED", "ACCEPTED", "PICKED_UP"].includes(a.status)) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [a, load]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      Loading order…
    </div>
  );

  if (error || !a) return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 20 }}>
      <p style={{ color: "#E63946" }}>{error || "Order not found"}</p>
      <Link to="/delivery/dashboard" className="btn-primary">Back to Dashboard</Link>
    </div>
  );

  const order  = a.order || {};
  const sc     = STATUS[a.status] || STATUS.FAILED;
  const amtInr = Math.round((order.total || 0) * 84);
  const isLive = ["ASSIGNED", "ACCEPTED", "PICKED_UP"].includes(a.status);

  const address = [order.addressLine1, order.addressLine2, order.landmark, order.city, order.state, order.pincode]
    .filter(Boolean).join(", ") || order.deliveryAddress || "—";

  const mapsUrl = order.deliveryLat && order.deliveryLng
    ? `https://www.google.com/maps/search/?api=1&query=${order.deliveryLat},${order.deliveryLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const duration = (a.assignedAt && a.deliveredAt)
    ? (() => { const m = Math.round((new Date(a.deliveredAt) - new Date(a.assignedAt)) / 60000);
               return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`; })()
    : null;

  const timeline = [
    { label: "Assigned",  time: a.assignedAt,  icon: "📦", show: true },
    { label: "Accepted",  time: a.acceptedAt,  icon: "✅", show: !!a.acceptedAt },
    { label: "Picked Up", time: a.pickedUpAt,  icon: "🛵", show: !!a.pickedUpAt },
    { label: "Delivered", time: a.deliveredAt, icon: "🎉", show: !!a.deliveredAt },
    { label: "Rejected",  time: a.rejectedAt,  icon: "❌", show: !!a.rejectedAt },
  ].filter(e => e.show);

  const section = { fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)" }}>
      {/* Top bar */}
      <div style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
        <Link to="/delivery/dashboard" style={{ color: "var(--muted)", fontSize: "1.2rem" }}>←</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.05rem", fontWeight: 700 }}>Order #{order.id}</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.73rem" }}>Assignment #{a.id}</p>
        </div>
        <span style={{ padding: "5px 14px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
      </div>

      <div style={{ padding: "18px 16px", maxWidth: 560, margin: "0 auto" }}>

        {/* Delivery OTP while the order is still with the customer handover ahead */}
        {["ASSIGNED", "ACCEPTED"].includes(a.status) && a.deliveryOtp && (
          <div style={{ marginBottom: 14, padding: "12px 14px", background: "rgba(255,107,53,0.08)", borderRadius: 10, textAlign: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: "0.7rem", marginBottom: 4 }}>Share with customer on arrival</p>
            <p style={{ fontFamily: "monospace", fontSize: "1.9rem", fontWeight: 900, color: "var(--flame)", letterSpacing: 10 }}>{a.deliveryOtp}</p>
          </div>
        )}

        {/* Earnings (delivered only) */}
        {a.status === "DELIVERED" && (
          <div className="card" style={{ padding: "20px 22px", marginBottom: 14, borderColor: "rgba(87,204,153,0.3)", background: "linear-gradient(135deg,rgba(87,204,153,0.1),rgba(87,204,153,0.03))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: 4 }}>YOUR EARNINGS</p>
                <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "2rem", color: "#57CC99" }}>₹{RATE_PER_DELIVERY}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: 4 }}>ORDER VALUE</p>
                <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.3rem" }}>₹{amtInr}</p>
                {duration && <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>⏱ {duration}</p>}
              </div>
            </div>
            {a.partnerRating && (
              <p style={{ marginTop: 12, color: "#F4C842" }}>{"★".repeat(a.partnerRating)} <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>customer rated your delivery</span></p>
            )}
          </div>
        )}

        {/* Customer */}
        <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
          <p style={section}>Customer</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ fontWeight: 700 }}>{order.customerName || "—"}</p>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>📞 {order.customerPhone || "—"}</p>
            </div>
            {order.customerPhone && isLive && (
              <a href={`tel:${order.customerPhone}`} className="btn-outline" style={{ padding: "9px 18px" }}>Call</a>
            )}
          </div>
        </div>

        {/* Address + navigate */}
        <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
          <p style={section}>📍 Delivery Address</p>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.7, marginBottom: 12 }}>{address}</p>
          {isLive && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-outline" style={{ padding: "9px 18px", display: "inline-block" }}>
              🗺 Open in Maps
            </a>
          )}
        </div>

        {/* Order */}
        <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
          <p style={section}>🍽 Order</p>
          <p style={{ fontSize: "0.9rem", marginBottom: 10 }}>{order.itemsSummary || "—"}</p>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <span style={{ color: "var(--muted)" }}>Order total</span>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, color: "var(--flame)" }}>₹{amtInr}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
          <p style={section}>Timeline</p>
          {timeline.map(e => (
            <div key={e.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{e.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.85rem" }}>{e.label}</p>
                <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{fmt(e.time)}</p>
              </div>
            </div>
          ))}
          {a.rejectionReason && <p style={{ color: "#E63946", fontSize: "0.8rem" }}>Reason: {a.rejectionReason}</p>}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Link to="/delivery/earnings" className="btn-outline" style={{ flex: 1, textAlign: "center", padding: "12px 0" }}>💰 Earnings</Link>
          <Link to="/delivery/dashboard" className="btn-primary" style={{ flex: 1, textAlign: "center", padding: "12px 0" }}>Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
