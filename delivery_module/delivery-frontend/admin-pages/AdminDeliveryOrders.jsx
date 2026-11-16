import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

export default function AdminDeliveryOrders() {
  const [orders,      setOrders]      = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading,     setLoading]     = useState(true);
  const [assigning,   setAssigning]   = useState({});
  const [error,       setError]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/orders");
      const readyOrders = res.data.filter((o) =>
        ["Preparing", "On the Way"].includes(o.status)
      );
      setOrders(readyOrders);

      // Load existing assignments for these orders
      const aMap = {};
      await Promise.all(readyOrders.map(async (o) => {
        try {
          const ar = await api.get(`/delivery/admin/assignment/order/${o.id}`);
          aMap[o.id] = ar.data;
        } catch (_) { /* not assigned yet */ }
      }));
      setAssignments(aMap);
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (orderId) => {
    setAssigning((p) => ({ ...p, [orderId]: true }));
    try {
      const res = await api.post(`/delivery/admin/assign/${orderId}`);
      setAssignments((p) => ({ ...p, [orderId]: res.data }));
    } catch (e) {
      setError(e.response?.data?.error || "Auto-assign failed — no available partners");
    } finally {
      setAssigning((p) => ({ ...p, [orderId]: false }));
    }
  };

  const ASSIGN_STATUS_COLORS = {
    ASSIGNED:  { bg: "rgba(76,201,240,0.15)",  color: "#4CC9F0" },
    ACCEPTED:  { bg: "rgba(199,125,255,0.15)", color: "#C77DFF" },
    PICKED_UP: { bg: "rgba(244,200,66,0.15)",  color: "#F4C842" },
    DELIVERED: { bg: "rgba(87,204,153,0.15)",  color: "#57CC99" },
    FAILED:    { bg: "rgba(230,57,70,0.12)",   color: "#E63946" },
  };

  return (
    <div style={{ padding: "40px 36px" }}>
      <div style={{ marginBottom: 36 }}>
        <div className="section-label">Delivery Management</div>
        <h1 style={{ fontSize: "2rem" }}>Delivery Orders</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>
          Orders in "Preparing" or "On the Way" status
        </p>
        {error && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, color: "#E63946", fontSize: "0.87rem" }}>
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📦</div>
          <p>No active orders to assign</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map((order) => {
            const assignment = assignments[order.id];
            const asc = assignment ? ASSIGN_STATUS_COLORS[assignment.status] : null;
            return (
              <div key={order.id} className="card" style={{ padding: "22px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>

                  {/* Order info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, color: "var(--flame)", fontSize: "1rem" }}>
                        #{order.id}
                      </span>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                        background: order.status === "Preparing" ? "rgba(244,200,66,0.15)" : "rgba(76,201,240,0.15)",
                        color:      order.status === "Preparing" ? "#F4C842"              : "#4CC9F0",
                      }}>{order.status}</span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{order.customerName}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 2 }}>{order.customerPhone}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>📍 {order.deliveryAddress}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 4 }}>
                      {order.itemsSummary?.substring(0, 60)}{order.itemsSummary?.length > 60 ? "…" : ""}
                    </p>
                  </div>

                  {/* Assignment status */}
                  <div style={{ minWidth: 220, textAlign: "right" }}>
                    {assignment ? (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: asc?.bg, color: asc?.color }}>
                            🛵 {assignment.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 2 }}>
                          {assignment.partner?.name}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: 2 }}>
                          {assignment.partner?.phone}
                        </div>
                        {assignment.deliveryOtp && assignment.status !== "DELIVERED" && (
                          <div style={{ marginTop: 6, padding: "4px 10px", background: "rgba(255,107,53,0.1)", borderRadius: 8, display: "inline-block" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>OTP: </span>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--flame)", letterSpacing: 2 }}>
                              {assignment.deliveryOtp}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 10 }}>Not assigned yet</p>
                        <button
                          onClick={() => handleAssign(order.id)}
                          disabled={assigning[order.id]}
                          className="btn-primary"
                          style={{ padding: "8px 20px", opacity: assigning[order.id] ? 0.7 : 1 }}>
                          {assigning[order.id] ? "Assigning…" : "⚡ Auto-Assign"}
                        </button>
                      </div>
                    )}
                    <div style={{ marginTop: 10 }}>
                      <Link to={`/admin/orders/${order.id}`} style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                        View Order →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
