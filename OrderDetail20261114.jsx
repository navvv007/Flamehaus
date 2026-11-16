import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { trackOrder, fetchCustomerOrder, getOrderPayment, checkRating } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import DeliveryMap from "../components/DeliveryMap";
import OrderTimeline from "../components/OrderTimeline";
import RatingModal from "../components/RatingModal";

const STATUS_COLOR = {
  Delivered:    { bg: "rgba(87,204,153,0.15)", color: "#57CC99", border: "rgba(87,204,153,0.3)" },
  Preparing:    { bg: "rgba(244,200,66,0.15)", color: "#F4C842", border: "rgba(244,200,66,0.3)" },
  "On the Way": { bg: "rgba(76,201,240,0.15)", color: "#4CC9F0", border: "rgba(76,201,240,0.3)" },
  Pending:      { bg: "rgba(255,107,53,0.15)", color: "#FF6B35", border: "rgba(255,107,53,0.3)" },
};

const PAYMENT_COLOR = {
  PAID:    { bg: "rgba(87,204,153,0.15)", color: "#57CC99", label: "✓ Paid" },
  CREATED: { bg: "rgba(244,200,66,0.15)", color: "#F4C842", label: "⏳ Payment Pending" },
  FAILED:  { bg: "rgba(230,57,70,0.1)",  color: "#E63946", label: "✕ Payment Failed" },
  NONE:    { bg: "rgba(255,107,53,0.15)", color: "#FF6B35", label: "💳 Pay Now" },
};

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Parse itemsSummary into [{name, qty}] and try to extract menuItemId from cart context
function parseItems(itemsSummary) {
  if (!itemsSummary) return [];
  return itemsSummary.split(",").map((s, i) => {
    const trimmed = s.trim();
    const match   = trimmed.match(/^(.+?)\s*x(\d+)$/i);
    return { name: match ? match[1].trim() : trimmed, qty: match ? parseInt(match[2]) : 1, menuItemId: null, idx: i };
  });
}

export default function OrderDetail() {
  const { id }                   = useParams();
  const { isCustomer }           = useAuth();
  const [order, setOrder]        = useState(null);
  const [payment, setPayment]    = useState(null);
  const [hasRated, setHasRated]  = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [loading, setLoading]    = useState(true);
  const [error,   setError]      = useState("");
  const pollRef                  = useRef(null);

  const load = async () => {
    try {
      const res = isCustomer ? await fetchCustomerOrder(id) : await trackOrder(id);
      setOrder(res.data);
      setError("");

      // Load payment + rating status in parallel
      const [payRes] = await Promise.allSettled([getOrderPayment(id)]);
      if (payRes.status === "fulfilled") setPayment(payRes.value.data);

      if (isCustomer && res.data.status === "Delivered") {
        const ratingRes = await checkRating(id).catch(() => null);
        if (ratingRes) setHasRated(ratingRes.data.hasRated);
      }
    } catch (e) {
      setError(e.response?.status === 404 ? "Order not found." : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => {
      setOrder((prev) => {
        if (prev?.status === "Delivered") { clearInterval(pollRef.current); return prev; }
        load();
        return prev;
      });
    }, 15000);
    return () => clearInterval(pollRef.current);
  }, [id]); // eslint-disable-line

  const onRatingSubmitted = () => {
    setShowRating(false);
    setRatingDone(true);
    setHasRated(true);
  };

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div><p>Loading order…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>📦</div>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>{error}</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  );

  const sc      = STATUS_COLOR[order.status] || { bg: "#222", color: "#888", border: "#333" };
  const payInfo = PAYMENT_COLOR[payment?.status || "NONE"];
  const items   = parseItems(order.itemsSummary);
  const isActive = ["Pending", "Preparing", "On the Way"].includes(order.status);
  const isDelivered = order.status === "Delivered";
  const payStatus = payment?.status || "NONE";

  // Build orderedItems with placeholder menuItemIds for RatingModal
  const orderedItems = items.map((item, i) => ({ menuItemId: i + 1, name: item.name }));

  return (
    <div style={{ padding: "48px 5% 80px", maxWidth: 1100, margin: "0 auto" }}>
      <Link to={isCustomer ? "/my-orders" : "/"} style={{ color: "var(--muted)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
        ← {isCustomer ? "My Orders" : "Home"}
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Order Detail</div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "2.2rem", marginBottom: 8 }}>
            Order <span style={{ color: "var(--flame)" }}>#{order.id}</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Placed {fmt(order.createdAt)}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <span style={{ padding: "7px 18px", borderRadius: 30, fontSize: "0.85rem", fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
            {order.status}
          </span>
          {/* Payment badge */}
          <span style={{ padding: "5px 14px", borderRadius: 30, fontSize: "0.8rem", fontWeight: 600, background: payInfo.bg, color: payInfo.color }}>
            {payInfo.label}
          </span>
          {isActive && (
            <span style={{ fontSize: "0.75rem", color: "#57CC99", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#57CC99", animation: "livePulse 1.5s infinite", display: "inline-block" }} />
              Auto-refreshing
            </span>
          )}
        </div>
      </div>

      {/* Pay Now banner — if payment pending */}
      {(payStatus === "NONE" || payStatus === "CREATED") && (
        <div style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.25)", borderRadius: 14, padding: "18px 22px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4, fontFamily: "Syne, sans-serif" }}>Payment Required</p>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Complete your payment to confirm this order.</p>
          </div>
          <Link to={`/payment/${order.id}`} className="btn-primary" style={{ whiteSpace: "nowrap" }}>
            💳 Pay Now
          </Link>
        </div>
      )}

      {/* Rating success banner */}
      {ratingDone && (
        <div style={{ background: "rgba(87,204,153,0.1)", border: "1px solid rgba(87,204,153,0.3)", borderRadius: 14, padding: "14px 22px", marginBottom: 24, color: "#57CC99", fontSize: "0.9rem" }}>
          ⭐ Thank you for your rating! Your feedback helps us improve.
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <DeliveryMap order={order} />

          {order.estimatedDelivery && !isDelivered && (
            <div className="card" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, borderColor: "rgba(76,201,240,0.25)" }}>
              <span style={{ fontSize: "1.6rem" }}>⏱</span>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Estimated Delivery</p>
                <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#4CC9F0" }}>{fmt(order.estimatedDelivery)}</p>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: "28px" }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem", marginBottom: 28 }}>Tracking</h3>
            <OrderTimeline status={order.status} trackingNote={order.trackingNote} />
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Items */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1rem", marginBottom: 18 }}>🧾 Items Ordered</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>—</p> : items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "var(--charcoal)", borderRadius: 8 }}>
                  <span style={{ fontSize: "0.87rem" }}>🍽 {item.name}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>x{item.qty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1rem", marginBottom: 18 }}>💳 Payment</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Subtotal", `₹${(order.total * 84 * 0.94).toFixed(0)}`], ["Delivery", "₹49"], ["GST (5%)", `₹${(order.total * 84 * 0.05).toFixed(0)}`]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.87rem" }}>
                  <span style={{ color: "var(--muted)" }}>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "var(--flame)" }}>₹{(order.total * 84).toFixed(0)}</span>
              </div>
              {payment?.gateway && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--charcoal)", borderRadius: 8, fontSize: "0.8rem", color: "var(--muted)" }}>
                  Paid via {payment.gateway} · {payment.gatewayPaymentId || "—"}
                </div>
              )}
            </div>
          </div>

          {/* Delivery info */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1rem", marginBottom: 18 }}>📍 Delivery Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Customer", order.customerName || "—"], ["Phone", order.customerPhone || "—"], ["Address", order.deliveryAddress || "—"], ["Placed", fmt(order.createdAt)], ["Updated", fmt(order.updatedAt)]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" }}>{l}</span>
                  <span style={{ fontSize: "0.87rem", lineHeight: 1.4 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {isDelivered && isCustomer && !hasRated && !ratingDone && (
              <button className="btn-primary" style={{ justifyContent: "center", padding: "13px 0" }} onClick={() => setShowRating(true)}>
                ⭐ Rate Your Order
              </button>
            )}
            {isDelivered && (hasRated || ratingDone) && (
              <div style={{ padding: "12px 16px", background: "rgba(87,204,153,0.08)", border: "1px solid rgba(87,204,153,0.25)", borderRadius: 10, textAlign: "center", fontSize: "0.87rem", color: "#57CC99" }}>
                ✓ You've rated this order
              </div>
            )}
            {isDelivered && (
              <Link to="/menu" className="btn-outline" style={{ textAlign: "center", padding: "12px 0" }}>
                🔥 Order Again
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Rating modal */}
      {showRating && (
        <RatingModal
          order={{ ...order, orderedItems }}
          onClose={() => setShowRating(false)}
          onSubmitted={onRatingSubmitted}
        />
      )}

      <style>{`
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
