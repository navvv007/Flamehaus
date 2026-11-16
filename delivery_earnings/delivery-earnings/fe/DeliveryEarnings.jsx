import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

function dApi(path, method = "get", data = null) {
  const token = localStorage.getItem("fh_delivery_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };
  if (method === "get")   return api.get(path, cfg);
  if (method === "patch") return api.patch(path, data, cfg);
  return api.post(path, data, cfg);
}

const RATE_PER_DELIVERY = 50; // ₹50 per delivery (configurable)

function StatCard({ icon, label, value, sub, color = "var(--white)" }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.5rem", color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{sub}</div>}
    </div>
  );
}

export default function DeliveryEarnings() {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all"); // all | today | week | month
  const [error,       setError]       = useState("");

  const partner = (() => {
    try { return JSON.parse(localStorage.getItem("fh_delivery_partner") || "{}"); }
    catch { return {}; }
  })();

  useEffect(() => {
    dApi("/delivery/partner/assignments")
      .then(r => setAssignments(r.data.filter(a => a.status === "DELIVERED")))
      .catch(() => setError("Failed to load delivery history"))
      .finally(() => setLoading(false));
  }, []);

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week  = new Date(today); week.setDate(today.getDate() - 7);
  const month = new Date(today); month.setDate(1);

  const inRange = (a, from) => {
    if (!a.deliveredAt) return false;
    return new Date(a.deliveredAt) >= from;
  };

  const filtered = filter === "today" ? assignments.filter(a => inRange(a, today))
    : filter === "week"  ? assignments.filter(a => inRange(a, week))
    : filter === "month" ? assignments.filter(a => inRange(a, month))
    : assignments;

  const totalEarnings   = filtered.length * RATE_PER_DELIVERY;
  const todayCount      = assignments.filter(a => inRange(a, today)).length;
  const weekCount       = assignments.filter(a => inRange(a, week)).length;
  const totalCount      = assignments.length;
  const avgRating       = partner.rating ? Number(partner.rating).toFixed(1) : "—";

  const formatDate = (dt) => dt ? new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }) : "—";

  const formatDuration = (a) => {
    if (!a.assignedAt || !a.deliveredAt) return "—";
    const mins = Math.round((new Date(a.deliveredAt) - new Date(a.assignedAt)) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)" }}>
      {/* Header */}
      <div style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 50 }}>
        <Link to="/delivery/dashboard" style={{ color: "var(--muted)", fontSize: "1.2rem" }}>←</Link>
        <div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.1rem", fontWeight: 700 }}>My Earnings & Deliveries</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{partner.name}</p>
        </div>
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 640, margin: "0 auto" }}>
        {error && <p style={{ color: "#E63946", marginBottom: 16 }}>{error}</p>}

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <StatCard icon="💰" label="Total Earnings" value={`₹${totalCount * RATE_PER_DELIVERY}`} sub={`₹${RATE_PER_DELIVERY}/delivery`} color="#57CC99" />
          <StatCard icon="📦" label="Total Deliveries" value={totalCount} sub="all time" />
          <StatCard icon="🗓" label="This Week" value={weekCount} sub={`₹${weekCount * RATE_PER_DELIVERY} earned`} />
          <StatCard icon="⭐" label="Your Rating" value={avgRating} sub={`${partner.totalRatings || 0} ratings`} color="#F4C842" />
        </div>

        {/* Today summary card */}
        <div className="card" style={{ padding: "18px 20px", marginBottom: 20, background: "linear-gradient(135deg,rgba(255,107,53,0.12),rgba(255,107,53,0.04))", borderColor: "rgba(255,107,53,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "var(--flame)" }}>
                ₹{todayCount * RATE_PER_DELIVERY}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.83rem" }}>Today's earnings</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>{todayCount}</p>
              <p style={{ color: "var(--muted)", fontSize: "0.83rem" }}>deliveries today</p>
            </div>
          </div>
          {todayCount === 0 && (
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 10, textAlign: "center" }}>No deliveries yet today — go online to start earning!</p>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", background: "var(--charcoal)", borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {[["all","All Time"],["month","This Month"],["week","This Week"],["today","Today"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8, fontWeight: 600, fontSize: "0.78rem",
              background: filter===k ? "var(--flame)" : "transparent",
              color:      filter===k ? "#fff"         : "var(--muted)",
            }}>{l}</button>
          ))}
        </div>

        {/* Filtered summary */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--charcoal)", borderRadius: 10, marginBottom: 16 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{filtered.length} deliveries</span>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, color: "#57CC99", fontSize: "1.1rem" }}>
            ₹{filtered.length * RATE_PER_DELIVERY}
          </span>
        </div>

        {/* Delivery list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>📭</div>
            <p style={{ color: "var(--muted)" }}>No deliveries in this period</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((a, i) => {
              const order = a.order || {};
              const amtInr = Math.round((order.total || 0) * 84);
              return (
                <div key={a.id} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700 }}>Order #{order.id}</span>
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 20, background: "rgba(87,204,153,0.12)", color: "#57CC99", fontWeight: 700 }}>✓ Delivered</span>
                      </div>
                      <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{order.customerName}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>
                        {order.deliveryAddress || [order.addressLine1, order.city].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, color: "#57CC99", fontSize: "1rem" }}>+₹{RATE_PER_DELIVERY}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: 2 }}>Order: ₹{amtInr}</p>
                    </div>
                  </div>

                  {/* Items */}
                  {order.itemsSummary && (
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)", background: "var(--charcoal)", borderRadius: 6, padding: "5px 10px", marginBottom: 8 }}>
                      🍽 {order.itemsSummary}
                    </p>
                  )}

                  {/* Meta row */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.73rem", color: "var(--muted)" }}>
                      🕐 {formatDate(a.deliveredAt)}
                    </span>
                    <span style={{ fontSize: "0.73rem", color: "var(--muted)" }}>
                      ⏱ {formatDuration(a)}
                    </span>
                    {a.partnerRating && (
                      <span style={{ fontSize: "0.73rem", color: "#F4C842" }}>
                        {"★".repeat(a.partnerRating)} customer rated
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}