import { useState, useEffect, useCallback } from "react";
import api from "../../api/apiClient";

const STATUS_COLORS = {
  ASSIGNED:  { bg: "rgba(76,201,240,0.12)",  color: "#4CC9F0",  border: "rgba(76,201,240,0.3)" },
  ACCEPTED:  { bg: "rgba(199,125,255,0.12)", color: "#C77DFF",  border: "rgba(199,125,255,0.3)" },
  PICKED_UP: { bg: "rgba(244,200,66,0.12)",  color: "#F4C842",  border: "rgba(244,200,66,0.3)" },
  DELIVERED: { bg: "rgba(87,204,153,0.12)",  color: "#57CC99",  border: "rgba(87,204,153,0.3)" },
  REJECTED:  { bg: "rgba(230,57,70,0.12)",   color: "#E63946",  border: "rgba(230,57,70,0.3)" },
  FAILED:    { bg: "rgba(136,136,136,0.12)", color: "#888",     border: "rgba(136,136,136,0.3)" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.FAILED;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

export default function AdminDeliveryOrders() {
  const [assignments, setAssignments]   = useState([]);
  const [partners,    setPartners]      = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [error,       setError]         = useState("");
  const [filter,      setFilter]        = useState("ALL");
  const [search,      setSearch]        = useState("");
  const [reassigning, setReassigning]   = useState(null); // orderId being reassigned
  const [manualPId,   setManualPId]     = useState("");   // manual partner selection

  const token = localStorage.getItem("fh_admin_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };

  const load = useCallback(async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        api.get("/delivery/admin/assignments", cfg),
        api.get("/delivery/admin/partners",    cfg),
      ]);
      setAssignments(aRes.data);
      setPartners(pRes.data.filter(p => p.status === "ACTIVE"));
    } catch { setError("Failed to load delivery data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Auto-assign ─────────────────────────────────────────────────────── */
  const handleAutoAssign = async (orderId) => {
    setReassigning(orderId); setError("");
    try {
      const res = await api.post(`/delivery/admin/assign/${orderId}`, {}, cfg);
      if (res.data.message) setError("ℹ️ " + res.data.message);
      await load();
    } catch (e) { setError(e.response?.data?.error || "Auto-assign failed"); }
    finally { setReassigning(null); }
  };

  /* ── Manual reassign to specific partner ─────────────────────────────── */
  const handleManualReassign = async (orderId) => {
    if (!manualPId) { setError("Select a partner first"); return; }
    setReassigning(orderId); setError("");
    try {
      await api.post(`/delivery/admin/reassign/${orderId}`, { partnerId: manualPId }, cfg);
      setManualPId("");
      await load();
    } catch (e) { setError(e.response?.data?.error || "Reassign failed"); }
    finally { setReassigning(null); }
  };

  const filtered = assignments
    .filter(a => filter === "ALL" || a.status === filter)
    .filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return String(a.order?.id).includes(q)
          || a.order?.customerName?.toLowerCase().includes(q)
          || a.partner?.name?.toLowerCase().includes(q);
    });

  const fmt = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  const onlinePartners = partners.filter(p => p.availability === "ONLINE");

  return (
    <div style={{ padding: "36px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-label">Delivery Management</div>
        <h1 style={{ fontSize: "1.9rem", marginBottom: 4 }}>Delivery Orders</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
          Manage assignments, rejections, and reassignments
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total",     value: assignments.length,                                           color: "var(--muted)" },
          { label: "Active",    value: assignments.filter(a => ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status)).length, color: "#4CC9F0" },
          { label: "Delivered", value: assignments.filter(a => a.status === "DELIVERED").length,     color: "#57CC99" },
          { label: "Rejected",  value: assignments.filter(a => a.status === "REJECTED").length,      color: "#E63946" },
          { label: "Online Now",value: onlinePartners.length,                                        color: "#F4C842" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "14px 16px", textAlign: "center" }}>
            <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.6rem", color, marginBottom: 4 }}>{value}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          background: error.startsWith("ℹ️") ? "rgba(76,201,240,0.08)" : "rgba(230,57,70,0.08)",
          border: `1px solid ${error.startsWith("ℹ️") ? "rgba(76,201,240,0.2)" : "rgba(230,57,70,0.2)"}`,
          borderRadius: 10, padding: "11px 16px", marginBottom: 18,
          color: error.startsWith("ℹ️") ? "#4CC9F0" : "#E63946", fontSize: "0.87rem",
        }}>{error}</div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search order, customer, partner…"
          style={{ flex: 1, minWidth: 220 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL","ASSIGNED","ACCEPTED","PICKED_UP","DELIVERED","REJECTED"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
              background: filter === f ? "var(--flame)" : "var(--card)",
              color: filter === f ? "#fff" : "var(--muted)",
              border: `1px solid ${filter === f ? "var(--flame)" : "var(--border)"}`,
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📭</div>
          <p>No assignments found</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((a) => {
            const order   = a.order   || {};
            const partner = a.partner || {};
            const isRejected = a.status === "REJECTED";
            const isActive   = ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status);

            return (
              <div key={a.id} className="card" style={{
                padding: "18px 22px",
                borderColor: isRejected ? "rgba(230,57,70,0.25)" : "var(--border)",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "start" }}>

                  {/* Order info */}
                  <div>
                    <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, marginBottom: 4 }}>
                      Order #{order.id}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 2 }}>
                      👤 {order.customerName}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: 2 }}>
                      📞 {order.customerPhone}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      📍 {order.deliveryAddress || "—"}
                    </p>
                  </div>

                  {/* Partner info */}
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 4 }}>
                      🛵 {partner.name || "—"}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: 2 }}>
                      {partner.phone}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: 6 }}>
                      {partner.vehicleType} · {partner.vehicleNumber || "—"}
                    </p>
                    <StatusBadge status={a.status} />
                    {/* Rejection reason */}
                    {isRejected && a.rejectionReason && (
                      <div style={{ marginTop: 6, padding: "5px 8px", background: "rgba(230,57,70,0.08)", borderRadius: 6 }}>
                        <p style={{ fontSize: "0.72rem", color: "#E63946" }}>
                          Reason: {a.rejectionReason}
                        </p>
                      </div>
                    )}
                    {/* Reassign count */}
                    {a.reassignCount > 0 && (
                      <p style={{ fontSize: "0.7rem", color: "#F4C842", marginTop: 4 }}>
                        ⚠️ Reassigned {a.reassignCount}× already
                      </p>
                    )}
                  </div>

                  {/* Timeline */}
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    {[
                      { label: "Assigned",  time: a.assignedAt },
                      { label: "Accepted",  time: a.acceptedAt },
                      { label: "Picked up", time: a.pickedUpAt },
                      { label: "Delivered", time: a.deliveredAt },
                      { label: "Rejected",  time: a.rejectedAt },
                    ].filter(e => e.time).map(({ label, time }) => (
                      <div key={label} style={{ marginBottom: 3 }}>
                        <span style={{ color: "var(--white)", fontWeight: 500 }}>{label}: </span>
                        {fmt(time)}
                      </div>
                    ))}
                    {a.partnerRating && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ color: "#F4C842" }}>{"★".repeat(a.partnerRating)}</span>
                        <span style={{ marginLeft: 4 }}>{a.ratingComment || ""}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                    {/* Auto-assign button — show for rejected or undelivered */}
                    {(isRejected || isActive) && (
                      <button
                        onClick={() => handleAutoAssign(order.id)}
                        disabled={reassigning === order.id}
                        style={{
                          padding: "8px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                          background: "rgba(76,201,240,0.1)", color: "#4CC9F0",
                          border: "1px solid rgba(76,201,240,0.25)", transition: "all 0.2s",
                          opacity: reassigning === order.id ? 0.7 : 1,
                        }}>
                        {reassigning === order.id ? "Assigning…" : "🔄 Auto-Assign"}
                      </button>
                    )}

                    {/* Manual reassign — partner picker */}
                    {(isRejected || isActive) && (
                      <div>
                        <select value={manualPId} onChange={(e) => setManualPId(e.target.value)}
                          style={{ width: "100%", fontSize: "0.78rem", marginBottom: 6 }}>
                          <option value="">Pick partner…</option>
                          {onlinePartners.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.availability})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleManualReassign(order.id)}
                          disabled={!manualPId || reassigning === order.id}
                          style={{
                            width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                            background: manualPId ? "rgba(255,107,53,0.15)" : "var(--charcoal)",
                            color: manualPId ? "var(--flame)" : "var(--muted)",
                            border: `1px solid ${manualPId ? "rgba(255,107,53,0.3)" : "var(--border)"}`,
                            opacity: reassigning === order.id ? 0.7 : 1,
                          }}>
                          Assign to Partner
                        </button>
                      </div>
                    )}
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
