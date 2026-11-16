/**
 * AddressDisplay — shows full structured address for an order in admin/delivery.
 * Props: order (the order object from API)
 */
export default function AddressDisplay({ order, compact = false }) {
  if (!order) return null;

  const parts = [
    order.addressLine1,
    order.addressLine2,
    order.landmark && `Near ${order.landmark}`,
    order.city,
    order.state,
    order.pincode,
  ].filter(Boolean);

  const hasStructured = parts.length > 0;
  const fallback      = order.deliveryAddress || "—";

  if (compact) return (
    <span style={{ color:"var(--muted)", fontSize:"0.85rem" }}>
      📍 {hasStructured ? parts.join(", ") : fallback}
    </span>
  );

  return (
    <div style={{ background:"var(--charcoal)", borderRadius:10, padding:"14px 16px" }}>
      <p style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>
        📍 Delivery Address
      </p>
      {hasStructured ? (
        <div style={{ fontSize:"0.88rem", lineHeight:1.8 }}>
          {order.addressLine1 && <p style={{ fontWeight:600 }}>{order.addressLine1}</p>}
          {order.addressLine2 && <p style={{ color:"var(--muted)" }}>{order.addressLine2}</p>}
          {order.landmark    && <p style={{ color:"var(--muted)" }}>Near {order.landmark}</p>}
          <p>{[order.city, order.state].filter(Boolean).join(", ")}
            {order.pincode && <span style={{ color:"var(--muted)" }}> — {order.pincode}</span>}
          </p>
        </div>
      ) : (
        <p style={{ fontSize:"0.88rem" }}>{fallback}</p>
      )}
      {order.deliveryLat && (
        <p style={{ fontSize:"0.72rem", color:"#4CC9F0", marginTop:6 }}>
          📡 GPS: {Number(order.deliveryLat).toFixed(5)}, {Number(order.deliveryLng).toFixed(5)}
        </p>
      )}
    </div>
  );
}