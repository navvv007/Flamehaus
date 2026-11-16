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

export default function AdminOrders() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [error,    setError]    = useState("");

  const token = localStorage.getItem("fh_admin_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };

  const load = () => {
    setLoading(true);
    api.get("/admin/orders", cfg)
      .then(r => setOrders(r.data))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdvance = async (e, orderId) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await api.patch(`/admin/orders/${orderId}/advance`, {}, cfg);
      load();
    } catch(err) { alert(err.response?.data?.error || "Failed"); }
  };

  const filtered = orders
    .filter(o => filter === "all" || o.status === filter)
    .filter(o => !search || o.customerName?.toLowerCase().includes(search.toLowerCase())
                         || String(o.id).includes(search)
                         || o.customerPhone?.includes(search));

  const counts = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status]||0)+1; });

  return (
    <div style={{ padding:"40px 36px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <div>
          <div className="section-label">Operations</div>
          <h1 style={{ fontSize:"2rem" }}>Orders</h1>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search order, customer, phone…"
          style={{ padding:"9px 16px", borderRadius:10, width:260 }} />
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
        {[
          { s:"Pending",    l:"Pending"   },
          { s:"Preparing",  l:"Preparing" },
          { s:"On the Way", l:"On the Way"},
          { s:"Delivered",  l:"Delivered" },
        ].map(({s,l}) => {
          const sc = STATUS_CONFIG[s];
          return (
            <div key={s} className="card" style={{ padding:"14px 16px", cursor:"pointer",
              borderColor: filter===s?"var(--flame)":"var(--border)" }}
              onClick={() => setFilter(filter===s?"all":s)}>
              <div style={{ fontSize:"1.3rem", marginBottom:4 }}>{sc.icon}</div>
              <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"1.4rem", color:sc.color }}>
                {counts[s]||0}
              </div>
              <div style={{ color:"var(--muted)", fontSize:"0.75rem" }}>{l}</div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["all","Pending","Confirmed","Preparing","On the Way","Delivered","Cancelled","Refunded","Failed"]
          .map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:"6px 14px", borderRadius:50, fontWeight:600, fontSize:"0.8rem",
              background: filter===s ? "var(--flame)" : "var(--charcoal)",
              color:      filter===s ? "#fff"         : "var(--muted)",
              border:     `1px solid ${filter===s ? "var(--flame)" : "var(--border)"}`,
            }}>{s === "all" ? `All (${orders.length})` : `${STATUS_CONFIG[s]?.icon} ${s} (${counts[s]||0})`}</button>
          ))}
      </div>

      {error && <p style={{ color:"#E63946", marginBottom:16 }}>{error}</p>}

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--muted)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:"center" }}>
          <p style={{ color:"var(--muted)" }}>No orders found</p>
        </div>
      ) : (
        <div className="card" style={{ overflow:"hidden", padding:0 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"var(--charcoal)", borderBottom:"1px solid var(--border)" }}>
                {["Order","Customer","Items","Address","Amount","Status","Actions"].map(h => (
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:"0.75rem",
                    color:"var(--muted)", fontWeight:600, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => {
                const sc    = STATUS_CONFIG[o.status] || STATUS_CONFIG["Pending"];
                const amtInr= Math.round((o.total||0)*84);
                const addr  = [o.addressLine1, o.city].filter(Boolean).join(", ")
                              || o.deliveryAddress || "—";
                const canAdvance = ["Pending","Confirmed","Preparing","On the Way"].includes(o.status);
                return (
                  <tr key={o.id} style={{ borderTop:i>0?"1px solid var(--border)":"none" }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"13px 14px" }}>
                      <Link to={`/admin/orders/${o.id}`} style={{ fontFamily:"Syne,sans-serif", fontWeight:700, color:"var(--flame)" }}>
                        #{o.id}
                      </Link>
                      <p style={{ color:"var(--muted)", fontSize:"0.72rem" }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : ""}
                      </p>
                    </td>
                    <td style={{ padding:"13px 14px" }}>
                      <p style={{ fontWeight:600, fontSize:"0.87rem" }}>{o.customerName}</p>
                      <p style={{ color:"var(--muted)", fontSize:"0.75rem" }}>{o.customerPhone}</p>
                    </td>
                    <td style={{ padding:"13px 14px", fontSize:"0.82rem", color:"var(--muted)", maxWidth:160 }}>
                      {o.itemsSummary || "—"}
                    </td>
                    <td style={{ padding:"13px 14px", fontSize:"0.82rem", color:"var(--muted)", maxWidth:160 }}>
                      {addr}
                    </td>
                    <td style={{ padding:"13px 14px" }}>
                      <p style={{ fontFamily:"Syne,sans-serif", fontWeight:700, color:"var(--flame)" }}>₹{amtInr}</p>
                      {o.discountAmountInr > 0 && (
                        <p style={{ fontSize:"0.7rem", color:"#57CC99" }}>-₹{Math.round(o.discountAmountInr)}</p>
                      )}
                    </td>
                    <td style={{ padding:"13px 14px" }}>
                      <span style={{ padding:"4px 10px", borderRadius:20, fontSize:"0.75rem",
                        fontWeight:700, background:sc.bg, color:sc.color }}>
                        {sc.icon} {o.status}
                      </span>
                    </td>
                    <td style={{ padding:"13px 14px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <Link to={`/admin/orders/${o.id}`}
                          style={{ padding:"5px 10px", borderRadius:8, fontSize:"0.76rem",
                            background:"var(--charcoal)", border:"1px solid var(--border)",
                            color:"var(--muted)", textDecoration:"none" }}>
                          View
                        </Link>
                        {canAdvance && (
                          <button onClick={e => handleAdvance(e, o.id)}
                            style={{ padding:"5px 10px", borderRadius:8, fontSize:"0.76rem",
                              background:"rgba(255,107,53,0.1)", border:"1px solid rgba(255,107,53,0.3)",
                              color:"var(--flame)", cursor:"pointer" }}>
                            → Next
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}