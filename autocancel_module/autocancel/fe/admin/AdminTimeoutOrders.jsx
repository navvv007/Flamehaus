import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

const STATUS_STYLE = {
  ASSIGNED:  { bg:"rgba(76,201,240,0.12)",  color:"#4CC9F0"  },
  ACCEPTED:  { bg:"rgba(199,125,255,0.12)", color:"#C77DFF"  },
  PICKED_UP: { bg:"rgba(244,200,66,0.12)",  color:"#F4C842"  },
  DELIVERED: { bg:"rgba(87,204,153,0.12)",  color:"#57CC99"  },
  FAILED:    { bg:"rgba(230,57,70,0.12)",   color:"#E63946"  },
  CANCELLED: { bg:"rgba(136,136,136,0.12)", color:"#888"     },
};

function minutesAgo(dt) {
  return Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
}

function timeLeft(assignedAt) {
  const mins    = minutesAgo(assignedAt);
  const left    = 120 - mins;
  if (left <= 0) return { label: "OVERDUE", color: "#E63946", pct: 100 };
  if (left <= 30) return { label: `${left}m left`, color: "#F4C842", pct: Math.round((120-left)/1.2) };
  return { label: `${left}m left`, color: "#57CC99", pct: Math.round((120-left)/1.2) };
}

export default function AdminTimeoutOrders() {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("active"); // active | overdue | all
  const [error,       setError]       = useState("");

  const token = localStorage.getItem("fh_admin_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };

  const load = () => {
    setLoading(true);
    api.get("/delivery/admin/assignments", cfg)
      .then(r => setAssignments(r.data))
      .catch(() => setError("Failed to load assignments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const now = Date.now();
  const active   = assignments.filter(a => ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status));
  const overdue  = active.filter(a => minutesAgo(a.assignedAt) >= 120);
  const warning  = active.filter(a => { const m = minutesAgo(a.assignedAt); return m >= 90 && m < 120; });

  const displayed = filter === "overdue" ? overdue
    : filter === "active" ? active
    : assignments;

  const handleManualCancel = async (orderId) => {
    if (!window.confirm("Cancel this order and initiate refund?")) return;
    try {
      await api.post(`/admin/orders/${orderId}/cancel`,
        { reason: "Manually cancelled by admin — delivery timeout" }, cfg);
      load();
    } catch(e) { alert(e.response?.data?.error || "Failed to cancel"); }
  };

  return (
    <div style={{ padding:"40px 36px" }}>
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div className="section-label">Delivery SLA</div>
        <h1 style={{ fontSize:"2rem" }}>Delivery Timeout Monitor</h1>
        <p style={{ color:"var(--muted)", fontSize:"0.88rem", marginTop:4 }}>
          Orders auto-cancel after <strong style={{ color:"var(--flame)" }}>2 hours</strong> from assignment.
          Refund initiates automatically.
        </p>
      </div>

      {/* Alert banners */}
      {overdue.length > 0 && (
        <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:"1.5rem" }}>🚨</span>
          <div>
            <p style={{ color:"#E63946", fontWeight:700 }}>{overdue.length} order(s) OVERDUE — auto-cancel running</p>
            <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>The scheduler will cancel these within the next 5 minutes and initiate refunds automatically.</p>
          </div>
        </div>
      )}
      {warning.length > 0 && (
        <div style={{ background:"rgba(244,200,66,0.08)", border:"1px solid rgba(244,200,66,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:"1.5rem" }}>⚠️</span>
          <div>
            <p style={{ color:"#F4C842", fontWeight:700 }}>{warning.length} order(s) approaching 2h limit</p>
            <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>Less than 30 minutes left. Consider manual reassignment.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:28 }}>
        {[
          { label:"Active",    value:active.length,   icon:"🚴", color:"var(--white)" },
          { label:"Warning",   value:warning.length,  icon:"⚠️", color:"#F4C842" },
          { label:"Overdue",   value:overdue.length,  icon:"🚨", color:"#E63946" },
          { label:"Total",     value:assignments.length, icon:"📊", color:"var(--muted)" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:"1.4rem", marginBottom:6 }}>{icon}</div>
            <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"1.5rem", color }}>{value}</div>
            <div style={{ color:"var(--muted)", fontSize:"0.78rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", background:"var(--charcoal)", borderRadius:10, padding:4, marginBottom:20, maxWidth:360 }}>
        {[["active","Active"],["overdue","Overdue 🚨"],["all","All"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            flex:1, padding:"8px 0", borderRadius:8, fontWeight:600, fontSize:"0.85rem",
            background: filter===k ? "var(--flame)" : "transparent",
            color:      filter===k ? "#fff"         : "var(--muted)",
          }}>{l}</button>
        ))}
      </div>

      {error && <p style={{ color:"#E63946", marginBottom:16 }}>{error}</p>}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--muted)" }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>✅</div>
          <p style={{ color:"var(--muted)" }}>No {filter === "overdue" ? "overdue" : "active"} assignments</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {displayed.map(a => {
            const order  = a.order || {};
            const mins   = minutesAgo(a.assignedAt);
            const tl     = ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status) ? timeLeft(a.assignedAt) : null;
            const ss     = STATUS_STYLE[a.status] || STATUS_STYLE.FAILED;

            return (
              <div key={a.id} className="card" style={{ padding:"18px 20px", borderColor: tl && mins >= 120 ? "rgba(230,57,70,0.4)" : tl && mins >= 90 ? "rgba(244,200,66,0.3)" : "var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700 }}>Order #{order.id}</span>
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:700, ...ss }}>{a.status}</span>
                      {tl && (
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:700, background:"rgba(0,0,0,0.3)", color:tl.color }}>
                          {tl.label}
                        </span>
                      )}
                    </div>
                    <p style={{ color:"var(--muted)", fontSize:"0.83rem" }}>{order.customerName} · {order.customerPhone}</p>
                    <p style={{ color:"var(--muted)", fontSize:"0.8rem", marginTop:2 }}>{order.deliveryAddress}</p>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
                    <p style={{ fontSize:"0.8rem", color:"var(--muted)" }}>Assigned {mins}m ago</p>
                    <p style={{ fontSize:"0.8rem", color:"var(--muted)" }}>Partner: {a.partner?.name || "—"}</p>
                    <p style={{ fontWeight:700, color:"var(--flame)", marginTop:4 }}>₹{Math.round((order.total||0)*84)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                {tl && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ height:6, background:"var(--charcoal)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:3, background:tl.color, width:`${Math.min(tl.pct,100)}%`, transition:"width 0.3s" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                      <span style={{ fontSize:"0.7rem", color:"var(--muted)" }}>Assigned</span>
                      <span style={{ fontSize:"0.7rem", color:tl.color, fontWeight:600 }}>{tl.label}</span>
                      <span style={{ fontSize:"0.7rem", color:"var(--muted)" }}>2h limit</span>
                    </div>
                  </div>
                )}

                <div style={{ display:"flex", gap:8 }}>
                  <Link to={`/admin/orders/${order.id}`} style={{ padding:"7px 14px", borderRadius:8, fontSize:"0.8rem", background:"var(--charcoal)", border:"1px solid var(--border)", color:"var(--muted)" }}>
                    View Order
                  </Link>
                  {["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status) && (
                    <>
                      <button onClick={() => api.post(`/delivery/admin/reassign/${order.id}`,{},{ headers:{ Authorization:`Bearer ${token}` }}).then(load)}
                        style={{ padding:"7px 14px", borderRadius:8, fontSize:"0.8rem", background:"rgba(76,201,240,0.1)", border:"1px solid rgba(76,201,240,0.25)", color:"#4CC9F0", cursor:"pointer" }}>
                        🔄 Reassign
                      </button>
                      <button onClick={() => handleManualCancel(order.id)}
                        style={{ padding:"7px 14px", borderRadius:8, fontSize:"0.8rem", background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", color:"#E63946", cursor:"pointer" }}>
                        ✕ Cancel & Refund
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}