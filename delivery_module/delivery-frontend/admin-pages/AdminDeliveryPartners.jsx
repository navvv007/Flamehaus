import { useState, useEffect, useCallback } from "react";
import api from "../../api/apiClient";

const STATUS_COLORS = {
  PENDING:  { bg: "rgba(244,200,66,0.15)",  color: "#F4C842", border: "rgba(244,200,66,0.3)" },
  ACTIVE:   { bg: "rgba(87,204,153,0.15)",  color: "#57CC99", border: "rgba(87,204,153,0.3)" },
  INACTIVE: { bg: "rgba(136,136,136,0.12)", color: "#888",    border: "rgba(136,136,136,0.2)" },
  REJECTED: { bg: "rgba(230,57,70,0.12)",   color: "#E63946", border: "rgba(230,57,70,0.3)" },
};
const AVAIL_COLORS = {
  ONLINE:  "#57CC99",
  OFFLINE: "#888",
  BUSY:    "#F4C842",
};

export default function AdminDeliveryPartners() {
  const [partners, setPartners] = useState([]);
  const [filter,   setFilter]   = useState("ALL");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/delivery/admin/partners")
      .then((r) => setPartners(r.data))
      .catch(() => setError("Failed to load partners"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "ALL" ? partners : partners.filter((p) => p.status === filter);

  const counts = ["PENDING","ACTIVE","INACTIVE","REJECTED"].reduce((acc, s) => ({
    ...acc, [s]: partners.filter((p) => p.status === s).length,
  }), {});

  const handleApprove = async (id) => { await api.patch(`/delivery/admin/partners/${id}/approve`); load(); };
  const handleReject  = async (id) => { if (!window.confirm("Reject this partner?")) return; await api.patch(`/delivery/admin/partners/${id}/reject`);  load(); };
  const handleToggle  = async (id) => { await api.patch(`/delivery/admin/partners/${id}/toggle`);  load(); };

  return (
    <div style={{ padding: "40px 36px" }}>
      <div style={{ marginBottom: 36 }}>
        <div className="section-label">Delivery Management</div>
        <h1 style={{ fontSize: "2rem" }}>Delivery Partners</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>{partners.length} total partners</p>
        {error && <p style={{ color: "#E63946", fontSize: "0.88rem", marginTop: 8 }}>{error}</p>}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {Object.entries(counts).map(([status, count]) => {
          const s = STATUS_COLORS[status];
          return (
            <div key={status} onClick={() => setFilter(filter === status ? "ALL" : status)}
              style={{ padding: "18px 20px", cursor: "pointer", background: "var(--card)", borderRadius: "var(--radius)", border: `1px solid ${filter === status ? s.border : "var(--border)"}`, transition: "border-color 0.2s" }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem", color: s.color, marginBottom: 4 }}>{count}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{status}</div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["ALL","PENDING","ACTIVE","INACTIVE","REJECTED"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "8px 16px", borderRadius: 50, fontWeight: 600, fontSize: "0.82rem",
            background: filter === f ? "var(--flame)" : "var(--card)",
            color:      filter === f ? "#fff"         : "var(--muted)",
            border:     `1.5px solid ${filter === f ? "var(--flame)" : "var(--border)"}`,
            transition: "all 0.2s",
          }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)" }}>
                {["Partner","Phone","Vehicle","Status","Availability","Deliveries","Rating","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "var(--muted)", fontWeight: 600, fontSize: "0.78rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.INACTIVE;
                const ac = AVAIL_COLORS[p.availability] || "#888";
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,53,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{p.email}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>{p.phone}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "var(--muted)" }}>
                      🛵 {p.vehicleType}<br /><span style={{ fontSize: "0.75rem" }}>{p.vehicleNumber}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: ac }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: ac, display: "inline-block" }} />
                        {p.availability}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", textAlign: "center" }}>{p.totalDeliveries}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>
                      {p.totalRatings > 0
                        ? <span><span style={{ color: "#F4C842" }}>★</span> {Number(p.rating).toFixed(1)} ({p.totalRatings})</span>
                        : <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {p.status === "PENDING" && (
                          <>
                            <button onClick={() => handleApprove(p.id)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, background: "rgba(87,204,153,0.15)", color: "#57CC99", border: "1px solid rgba(87,204,153,0.3)" }}>✓ Approve</button>
                            <button onClick={() => handleReject(p.id)}  style={{ padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, background: "rgba(230,57,70,0.12)", color: "#E63946", border: "1px solid rgba(230,57,70,0.3)" }}>✕ Reject</button>
                          </>
                        )}
                        {(p.status === "ACTIVE" || p.status === "INACTIVE") && (
                          <button onClick={() => handleToggle(p.id)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, background: "rgba(255,107,53,0.12)", color: "var(--flame)", border: "1px solid rgba(255,107,53,0.3)" }}>
                            {p.status === "ACTIVE" ? "Disable" : "Enable"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>No partners found</div>
        )}
      </div>
    </div>
  );
}
