import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

const STATUS_CONFIG = {
  "Pending":    { color:"#4CC9F0", bg:"rgba(76,201,240,0.12)",   icon:"⏳" },
  "Confirmed":  { color:"#C77DFF", bg:"rgba(199,125,255,0.12)",  icon:"✅" },
  "Preparing":  { color:"#F4C842", bg:"rgba(244,200,66,0.12)",   icon:"👨‍🍳" },
  "On the Way": { color:"#FF6B35", bg:"rgba(255,107,53,0.12)",   icon:"🛵" },
  "Delivered":  { color:"#57CC99", bg:"rgba(87,204,153,0.12)",   icon:"🎉" },
  "Cancelled":  { color:"#E63946", bg:"rgba(230,57,70,0.12)",    icon:"✕"  },
  "Refunded":   { color:"#888",    bg:"rgba(136,136,136,0.12)",  icon:"💰" },
  "Failed":     { color:"#E63946", bg:"rgba(230,57,70,0.08)",    icon:"⚠️" },
};

export default function MyOrders() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("fh_customer_token");
    if (!token) { setError("Please log in to view orders"); setLoading(false); return; }
    api.get("/customer/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setOrders(r.data))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? orders
    : filter === "active" ? orders.filter(o => ["Pending","Confirmed","Preparing","On the Way"].includes(o.status))
    : orders.filter(o => o.status === filter);

  const activeCount = orders.filter(o =>
    ["Pending","Confirmed","Preparing","On the Way"].includes(o.status)).length;

  return (
    <div style={{ padding:"60px 5%", maxWidth:740, margin:"0 auto" }}>
      <div className="section-label" style={{ marginBottom:8 }}>Account</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"2rem" }}>
          My Orders
          {activeCount > 0 && (
            <span style={{ marginLeft:12, fontSize:"0.9rem", padding:"4px 12px", borderRadius:20,
              background:"rgba(255,107,53,0.15)", color:"var(--flame)", fontFamily:"Inter,sans-serif", fontWeight:700 }}>
              {activeCount} active
            </span>
          )}
        </h1>
        <Link to="/menu" className="btn-primary" style={{ padding:"10px 20px" }}>Order Again</Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {[["all","All"],["active","Active"],["Delivered","Delivered"],["Cancelled","Cancelled"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding:"7px 16px", borderRadius:50, fontWeight:600, fontSize:"0.83rem",
            background: filter===k ? "var(--flame)" : "var(--charcoal)",
            color:      filter===k ? "#fff"         : "var(--muted)",
            border:     `1px solid ${filter===k ? "var(--flame)" : "var(--border)"}`,
          }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--muted)" }}>Loading orders…</div>
      ) : error ? (
        <div style={{ textAlign:"center", padding:60, color:"#E63946" }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:"48px 28px", textAlign:"center" }}>
          <div style={{ fontSize:"3rem", marginBottom:16 }}>📦</div>
          <h3 style={{ fontFamily:"Syne,sans-serif", marginBottom:8 }}>
            {filter === "all" ? "No orders yet" : `No ${filter} orders`}
          </h3>
          <p style={{ color:"var(--muted)", marginBottom:20 }}>Explore our menu and place your first order!</p>
          <Link to="/menu" className="btn-primary">Browse Menu</Link>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.map(order => {
            const sc    = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pending"];
            const amtInr= Math.round((order.total||0)*84);
            const addr  = [order.addressLine1, order.city].filter(Boolean).join(", ")
                          || order.deliveryAddress || "—";
            return (
              <Link key={order.id} to={`/orders/${order.id}`} style={{ textDecoration:"none" }}>
                <div className="card" style={{ padding:"16px 20px", transition:"border-color 0.2s",
                  borderColor: ["Pending","Confirmed","Preparing","On the Way"].includes(order.status)
                    ? "rgba(255,107,53,0.25)" : "var(--border)" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--flame)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor =
                    ["Pending","Confirmed","Preparing","On the Way"].includes(order.status)
                      ? "rgba(255,107,53,0.25)" : "var(--border)"}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700 }}>Order #{order.id}</span>
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:700,
                          background:sc.bg, color:sc.color }}>
                          {sc.icon} {order.status}
                        </span>
                      </div>
                      <p style={{ color:"var(--muted)", fontSize:"0.82rem" }}>{order.itemsSummary}</p>
                      <p style={{ color:"var(--muted)", fontSize:"0.75rem", marginTop:3 }}>📍 {addr}</p>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                      <p style={{ fontFamily:"Syne,sans-serif", fontWeight:800, color:"var(--flame)" }}>₹{amtInr}</p>
                      {order.discountAmountInr > 0 && (
                        <p style={{ fontSize:"0.72rem", color:"#57CC99" }}>Saved ₹{Math.round(order.discountAmountInr)}</p>
                      )}
                      <p style={{ color:"var(--muted)", fontSize:"0.72rem", marginTop:4 }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN",
                          { day:"2-digit", month:"short", year:"numeric" }) : ""}
                      </p>
                    </div>
                  </div>
                  {order.trackingNote && (
                    <p style={{ fontSize:"0.78rem", color:sc.color, fontStyle:"italic", marginTop:4 }}>
                      {sc.icon} {order.trackingNote}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}