import { useState, useEffect, useCallback } from "react";
import api from "../../api/apiClient";

const STATUS_COLORS = {
  ASSIGNED:  { bg: "rgba(76,201,240,0.12)",  color: "#4CC9F0",  border: "rgba(76,201,240,0.3)"  },
  ACCEPTED:  { bg: "rgba(199,125,255,0.12)", color: "#C77DFF",  border: "rgba(199,125,255,0.3)" },
  PICKED_UP: { bg: "rgba(244,200,66,0.12)",  color: "#F4C842",  border: "rgba(244,200,66,0.3)"  },
  DELIVERED: { bg: "rgba(87,204,153,0.12)",  color: "#57CC99",  border: "rgba(87,204,153,0.3)"  },
  REJECTED:  { bg: "rgba(230,57,70,0.12)",   color: "#E63946",  border: "rgba(230,57,70,0.3)"   },
  FAILED:    { bg: "rgba(136,136,136,0.12)", color: "#888888",  border: "rgba(136,136,136,0.3)" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.FAILED;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminDeliveryOrders() {
  const [assignments, setAssignments] = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("ALL");
  const [reassigning, setReassigning] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/delivery/admin/assignments");
      const data = res.data;

      // Deduplicate by order ID — one row per order in the table.
      // Priority: active assignment (ASSIGNED/ACCEPTED/PICKED_UP/DELIVERED)
      // over REJECTED. If multiple rows exist, active wins; among same
      // priority, highest id (latest) wins.
      const ACTIVE   = ["ASSIGNED","ACCEPTED","PICKED_UP","DELIVERED"];
      const seen     = new Map();

      data.forEach((a) => {
        const orderId = a.order?.id;
        if (!orderId) return;

        const existing = seen.get(orderId);
        if (!existing) { seen.set(orderId, a); return; }

        const aActive   = ACTIVE.includes(a.status);
        const exActive  = ACTIVE.includes(existing.status);

        // Active beats rejected/failed
        if (aActive && !exActive) { seen.set(orderId, a); return; }
        if (!aActive && exActive) return; // keep existing active

        // Same priority — keep the one with the higher id (more recent)
        if (a.id > existing.id) seen.set(orderId, a);
      });

      const deduped = Array.from(seen.values())
        .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));

      setAssignments(deduped);
      setFiltered(deduped);
    } catch {
      setError("Failed to load delivery orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Apply search + status filter
  useEffect(() => {
    let result = assignments;
    if (statusFilter !== "ALL") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        String(a.order?.id).includes(q) ||
        a.order?.customerName?.toLowerCase().includes(q) ||
        a.partner?.name?.toLowerCase().includes(q) ||
        a.order?.deliveryAddress?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, statusFilter, assignments]);

  const handleReassign = async (orderId) => {
    setReassigning(orderId);
    try {
      await api.post(`/delivery/admin/reassign/${orderId}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Reassignment failed");
    } finally {
      setReassigning(null); }
  };

  const handleAutoAssign = async (orderId) => {
    setReassigning(orderId);
    try {
      await api.post(`/delivery/admin/assign/${orderId}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Auto-assign failed");
    } finally {
      setReassigning(null);
    }
  };

  const statuses = ["ALL", "ASSIGNED", "ACCEPTED", "PICKED_UP", "DELIVERED", "REJECTED", "FAILED"];
  const counts   = statuses.reduce((acc, s) => {
    acc[s] = s === "ALL"
      ? assignments.length
      : assignments.filter((a) => a.status === s).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: "32px 28px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-label">Delivery</div>
        <h1 style={{ fontSize: "1.8rem", fontFamily: "Syne,sans-serif", marginBottom: 4 }}>
          Delivery Orders
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
          One row per order — shows the latest assignment status
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#E63946" }}>
          {error}
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: "5px 14px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600,
            background: statusFilter === s ? "var(--flame)" : "var(--card)",
            color:      statusFilter === s ? "#fff"         : "var(--muted)",
            border: `1.5px solid ${statusFilter === s ? "var(--flame)" : "var(--border)"}`,
          }}>
            {s} {counts[s] > 0 && <span style={{ opacity: 0.7 }}>({counts[s]})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍  Search by order ID, customer, partner, address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 480 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          No delivery orders found
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)" }}>
                {["Order #", "Customer", "Partner", "Status", "Assigned", "Reassigns", "Actions"]
                  .map((h) => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: "0.75rem", color: "var(--muted)",
                      fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
                    }}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>

                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, color: "var(--flame)" }}>
                      #{a.order?.id}
                    </span>
                    {a.reassignCount > 0 && (
                      <span style={{
                        marginLeft: 6, fontSize: "0.65rem", padding: "1px 6px",
                        borderRadius: 10, background: "rgba(244,200,66,0.15)", color: "#F4C842",
                      }}>
                        reassigned
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "13px 16px" }}>
                    <p style={{ fontWeight: 500, fontSize: "0.87rem" }}>{a.order?.customerName || "—"}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{a.order?.customerPhone || ""}</p>
                  </td>

                  <td style={{ padding: "13px 16px" }}>
                    <p style={{ fontWeight: 500, fontSize: "0.87rem" }}>{a.partner?.name || "—"}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{a.partner?.phone || ""}</p>
                  </td>

                  <td style={{ padding: "13px 16px" }}>
                    <StatusBadge status={a.status} />
                    {a.status === "REJECTED" && a.rejectionReason && (
                      <p style={{ color: "var(--muted)", fontSize: "0.68rem", marginTop: 4 }}>
                        {a.rejectionReason}
                      </p>
                    )}
                  </td>

                  <td style={{ padding: "13px 16px", color: "var(--muted)", fontSize: "0.8rem" }}>
                    {fmt(a.assignedAt)}
                  </td>

                  <td style={{ padding: "13px 16px", textAlign: "center" }}>
                    <span style={{
                      fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1rem",
                      color: (a.reassignCount || 0) > 0 ? "#F4C842" : "var(--muted)",
                    }}>
                      {a.reassignCount || 0}
                    </span>
                  </td>

                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {/* Reassign button — shown for REJECTED or unassigned */}
                      {["REJECTED", "FAILED"].includes(a.status) && (
                        <button
                          onClick={() => handleReassign(a.order?.id)}
                          disabled={reassigning === a.order?.id}
                          style={{
                            padding: "5px 12px", borderRadius: 8, fontSize: "0.78rem",
                            fontWeight: 600, background: "rgba(255,107,53,0.12)",
                            border: "1px solid rgba(255,107,53,0.3)", color: "var(--flame)",
                            opacity: reassigning === a.order?.id ? 0.6 : 1,
                          }}>
                          {reassigning === a.order?.id ? "…" : "🔄 Reassign"}
                        </button>
                      )}

                      {/* Auto-assign for ASSIGNED but partner not accepted yet */}
                      {a.status === "ASSIGNED" && (
                        <button
                          onClick={() => handleAutoAssign(a.order?.id)}
                          disabled={reassigning === a.order?.id}
                          style={{
                            padding: "5px 12px", borderRadius: 8, fontSize: "0.78rem",
                            fontWeight: 600, background: "rgba(76,201,240,0.1)",
                            border: "1px solid rgba(76,201,240,0.3)", color: "#4CC9F0",
                            opacity: reassigning === a.order?.id ? 0.6 : 1,
                          }}>
                          {reassigning === a.order?.id ? "…" : "🔁 Re-assign"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
