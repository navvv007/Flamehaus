import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { trackOrder, fetchCustomerOrder } from "../../api/apiClient";
import CombinedRatingModal from "../components/CombinedRatingModal";

/* ── SVG delivery map (restaurant → customer) ──────────────────────────── */
function DeliveryMap({ order }) {
  const W = 640, H = 260, PAD = 48;
  const restaurant = { lat: 17.4326, lng: 78.4071 };
  const delivery   = { lat: order?.deliveryLat || 17.4156, lng: order?.deliveryLng || 78.4347 };
  const pts = [restaurant, delivery];
  const lats = pts.map(p => p.lat);
  const lngs = pts.map(p => p.lng);
  const minLat = Math.min(...lats) - 0.018, maxLat = Math.max(...lats) + 0.018;
  const minLng = Math.min(...lngs) - 0.018, maxLng = Math.max(...lngs) + 0.018;
  const proj = (lat, lng) => ({
    x: PAD + ((lng - minLng) / ((maxLng - minLng) || 0.001)) * (W - PAD * 2),
    y: PAD + ((maxLat - lat) / ((maxLat - minLat) || 0.001)) * (H - PAD * 2),
  });
  const rPt = proj(restaurant.lat, restaurant.lng);
  const dPt = proj(delivery.lat, delivery.lng);
  const cx = (rPt.x + dPt.x) / 2, cy = Math.min(rPt.y, dPt.y) - 40;
  const delivered = order?.status === "Delivered";
  const progress  = { "Pending": 0, "Preparing": 0, "On the Way": 0.55, "Delivered": 1 }[order?.status] || 0;

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", background: "#0d1520", marginBottom: 24 }}>
      <div style={{ padding: "10px 18px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>🗺 Live Delivery Map</span>
        <span style={{ fontSize: "0.75rem", color: delivered ? "#57CC99" : "#4CC9F0", fontWeight: 600 }}>
          {delivered ? "✓ Delivered" : "● Tracking"}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {[...Array(6)].map((_, i) => <line key={`h${i}`} x1={0} y1={(H/6)*i} x2={W} y2={(H/6)*i} stroke="#151f2e" strokeWidth={1}/>)}
        {[...Array(9)].map((_, i) => <line key={`v${i}`} x1={(W/9)*i} y1={0} x2={(W/9)*i} y2={H} stroke="#151f2e" strokeWidth={1}/>)}
        <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#1e2d42" strokeWidth={12} strokeLinecap="round"/>
        <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#263548" strokeWidth={6} strokeLinecap="round"/>
        <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#3a506b" strokeWidth={2} strokeDasharray="10 8"/>
        {progress > 0 && <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#4CC9F0" strokeWidth={3} opacity={0.5} strokeDasharray={`${progress * 900} 1000`}/>}
        {/* Restaurant */}
        <circle cx={rPt.x} cy={rPt.y} r={20} fill="#FF6B35"/>
        <text x={rPt.x} y={rPt.y+6} textAnchor="middle" fontSize={16}>🔥</text>
        <text x={rPt.x} y={rPt.y+36} textAnchor="middle" fontSize={9} fill="#FF6B35" fontWeight="700" fontFamily="Inter,sans-serif">KITCHEN</text>
        {/* Destination */}
        <circle cx={dPt.x} cy={dPt.y} r={20} fill={delivered ? "#57CC99" : "#4CC9F0"}/>
        <text x={dPt.x} y={dPt.y+6} textAnchor="middle" fontSize={16}>{delivered ? "✓" : "🏠"}</text>
        <text x={dPt.x} y={dPt.y+36} textAnchor="middle" fontSize={9} fill={delivered ? "#57CC99" : "#4CC9F0"} fontWeight="700" fontFamily="Inter,sans-serif">YOUR DOOR</text>
        {/* Rider — only on the way */}
        {order?.status === "On the Way" && (() => {
          const t = 0.55;
          const rx = rPt.x + (dPt.x - rPt.x) * t;
          const ry = rPt.y + (dPt.y - rPt.y) * t - 15;
          return (
            <g>
              <circle cx={rx} cy={ry} r={16} fill="#0f172a" stroke="#4CC9F0" strokeWidth={2}>
                <animate attributeName="r" values="13;18;13" dur="2s" repeatCount="indefinite"/>
              </circle>
              <text x={rx} y={ry+5} textAnchor="middle" fontSize={13}>🛵</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ── Status timeline ─────────────────────────────────────────────────────── */
function OrderTimeline({ order }) {
  const steps = [
    { key: "Pending",    label: "Order Placed",   icon: "📦", note: "We received your order" },
    { key: "Preparing",  label: "Preparing",       icon: "👨‍🍳", note: "Kitchen is working on it" },
    { key: "On the Way", label: "On the Way",      icon: "🛵", note: "Rider has picked up your order" },
    { key: "Delivered",  label: "Delivered",       icon: "✅", note: "Enjoy your meal!" },
  ];
  const idx = steps.findIndex(s => s.key === order?.status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((s, i) => {
        const done    = i <= idx;
        const current = i === idx;
        return (
          <div key={s.key} style={{ display: "flex", gap: 16, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem",
                background: done ? (current ? "var(--flame)" : "rgba(255,107,53,0.15)") : "var(--charcoal)",
                border: `2px solid ${done ? "var(--flame)" : "var(--border)"}`,
              }}>{s.icon}</div>
              {i < steps.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 24, background: i < idx ? "var(--flame)" : "var(--border)", margin: "3px 0" }}/>
              )}
            </div>
            <div style={{ paddingTop: 8, paddingBottom: 20 }}>
              <p style={{ fontWeight: current ? 700 : 500, fontSize: "0.92rem", color: done ? "var(--white)" : "var(--muted)", marginBottom: 2 }}>
                {s.label}
                {current && <span style={{ marginLeft: 8, fontSize: "0.7rem", background: "var(--flame)", color: "#fff", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>CURRENT</span>}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{s.note}</p>
              {current && order?.trackingNote && order.trackingNote !== s.note && (
                <p style={{ color: "var(--flame)", fontSize: "0.78rem", marginTop: 4 }}>{order.trackingNote}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function OrderDetail() {
  const { id }          = useParams();
  const { isCustomer }  = useAuth();

  const [order,         setOrder]         = useState(null);
  const [assignment,    setAssignment]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [showRating,    setShowRating]    = useState(false);
  const [alreadyRated,  setAlreadyRated]  = useState(false);

  const load = useCallback(async () => {
    try {
      let res;
      if (isCustomer) {
        try { res = await fetchCustomerOrder(id); }
        catch { res = await trackOrder(id); }
      } else {
        res = await trackOrder(id);
      }
      setOrder(res.data);

      // Check for delivery assignment
      const token = localStorage.getItem("fh_customer_token");
      if (token && res.data.status === "Delivered") {
        try {
          const { default: api } = await import("../../api/apiClient");
          const aRes = await api.get(`/delivery/admin/assignment/order/${id}`);
          setAssignment(aRes.data);
        } catch { /* no assignment or not accessible */ }

        // Check if already rated
        try {
          const { default: api } = await import("../../api/apiClient");
          const rRes = await api.get(`/customer/ratings/check/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAlreadyRated(rRes.data.rated);
        } catch { /* ignore */ }
      }
    } catch { setError("Order not found"); }
    finally { setLoading(false)); }
  }, [id, isCustomer]);

  useEffect(() => { load(); }, [load]);

  // Poll every 15 seconds until delivered
  useEffect(() => {
    if (!order || order.status === "Delivered") return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [order, load]);

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div><p>Loading order…</p>
      </div>
    </div>
  );

  if (error || !order) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>❌</div>
        <p style={{ color: "var(--muted)", marginBottom: 20 }}>{error || "Order not found"}</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  );

  const isDelivered = order.status === "Delivered";
  const canRate     = isDelivered && isCustomer && !alreadyRated;

  return (
    <div style={{ padding: "48px 5%" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div className="section-label">Order Tracking</div>
            <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "2rem" }}>Order <span style={{ color: "var(--flame)" }}>#{order.id}</span></h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{
              padding: "6px 16px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 700,
              background: isDelivered ? "rgba(87,204,153,0.15)" : "rgba(255,107,53,0.15)",
              color: isDelivered ? "#57CC99" : "var(--flame)",
            }}>{order.status}</span>
            {order.estimatedDelivery && !isDelivered && (
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 6 }}>
                ETA: {new Date(order.estimatedDelivery).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>

        {/* Map */}
        <DeliveryMap order={order} />

        {/* Timeline + Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div className="card" style={{ padding: "22px 20px" }}>
            <h3 style={{ fontFamily: "Syne,sans-serif", marginBottom: 18, fontSize: "1rem" }}>Delivery Status</h3>
            <OrderTimeline order={order} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Order info */}
            <div className="card" style={{ padding: "18px 20px" }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: "0.95rem", marginBottom: 12 }}>Order Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Customer</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{order.customerName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Total</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--flame)" }}>₹{(order.total * 84).toFixed(0)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Payment</span>
                  <span style={{ fontSize: "0.82rem", color: order.paymentStatus === "PAID" ? "#57CC99" : "#F4C842" }}>
                    {order.paymentStatus || "PENDING"}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery info */}
            <div className="card" style={{ padding: "18px 20px" }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: "0.95rem", marginBottom: 12 }}>Delivery Info</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 4 }}>Address</p>
              <p style={{ fontSize: "0.85rem", marginBottom: 10 }}>{order.deliveryAddress || "—"}</p>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 4 }}>Items</p>
              <p style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>{order.itemsSummary || "—"}</p>
            </div>

            {/* Delivery partner card */}
            {assignment && (
              <div className="card" style={{ padding: "18px 20px", borderColor: "rgba(76,201,240,0.3)" }}>
                <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: "0.95rem", marginBottom: 12 }}>🛵 Delivery Partner</h3>
                <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{assignment.partner?.name}</p>
                <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>📞 {assignment.partner?.phone}</p>
                {assignment.partnerRating && (
                  <p style={{ color: "#F4C842", marginTop: 6, fontSize: "0.82rem" }}>
                    You rated: {"★".repeat(assignment.partnerRating)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rate Now button */}
        {canRate && (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <button className="btn-primary" onClick={() => setShowRating(true)} style={{ padding: "13px 36px", fontSize: "1rem" }}>
              ⭐ Rate Your Order & Delivery
            </button>
          </div>
        )}

        {alreadyRated && isDelivered && (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ color: "#57CC99", fontSize: "0.88rem" }}>✓ You've rated this order — thank you!</span>
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <Link to="/my-orders" style={{ color: "var(--muted)", fontSize: "0.88rem" }}>← Back to My Orders</Link>
        </div>
      </div>

      {/* Combined rating modal */}
      {showRating && (
        <CombinedRatingModal
          orderId={order.id}
          assignment={assignment}
          onClose={() => setShowRating(false)}
          onDone={() => { setShowRating(false); setAlreadyRated(true); }}
        />
      )}
    </div>
  );
}
