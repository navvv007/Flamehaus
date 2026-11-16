import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

function mins(dt) {
  return dt ? Math.floor((Date.now() - new Date(dt).getTime()) / 60000) : 0;
}
function timeLeft(assignedAt) {
  const left = 120 - mins(assignedAt);
  if (left <= 0)  return { label:"OVERDUE",      color:"#E63946", pct:100 };
  if (left <= 30) return { label:`${left}m left`, color:"#F4C842", pct:Math.round((120-left)/1.2) };
  return             { label:`${left}m left`, color:"#57CC99", pct:Math.round((120-left)/1.2) };
}

export default function AdminTimeoutOrders() {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("active");
  const [msg,         setMsg]         = useState("");

  const token = localStorage.getItem("fh_admin_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/delivery/admin/assignments", cfg);
      setAssignments(r.data);
    } catch(_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const active  = assignments.filter(a => ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status));
  const overdue = active.filter(a => mins(a.assignedAt) >= 120);
  const warning = active.filter(a => { const m = mins(a.assignedAt); return m >= 90 && m < 120; });

  const displayed = filter==="overdue" ? overdue : filter==="active" ? active : assignments;

  const handleManualCancel = async (orderId) => {
    if (!window.confirm("Cancel this order and initiate refund to customer?")) return;
    try {
      await api.post(`/admin/orders/${orderId}/cancel`,
        { reason: "Manually cancelled by admin — delivery timeout" }, cfg);
      setMsg(`Order #${orderId} cancelled and refund initiated`);
      load();
    } catch(e) { setMsg(e.response?.data?.error || "Failed"); }
  };

  // TEST button — triggers auto-cancel for a specific order immediately
  const handleTestTimeout = async (orderId) => {
    try {
      const r = await api.post(`/admin/test/timeout/${orderId}`, {}, cfg);
      setMsg(`Test result: ${r.data.result}`);
      load();
    } catch(e) { setMsg(e.response?.data?.error || "Test failed"); }
  };

  const handleRunAll = async () => {
    try {
      await api.post("/admin/test/timeout/run-all", {}, cfg);
      setMsg("Scheduler triggered — check backend logs for details");
      setTimeout(load, 2000);
    } catch(_) {}
  };

  return (
    <div style={{ padding:"40px 36px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <div>
          <div className="section-label">Delivery SLA</div>
          <h1 style={{ fontSize:"2rem" }}>Timeout Monitor</h1>
          <p style={{ color:"var(--muted)", fontSize:"0.88rem", marginTop:4 }}>
            Orders auto-cancel after <strong style={{ color:"var(--flame)" }}>2 hours</strong> from assignment · scheduler runs every 5 min
          </p>
        </div>
        <button onClick={handleRunAll} style={{ padding:"10px 20px", borderRadius:10, background:"rgba(76,201,240,0.1)", border:"1px solid rgba(76,201,240,0.25)", color:"#4CC9F0", fontWeight:700, fontSize:"0.85rem", cursor:"pointer" }}>
          ▶ Run Scheduler Now
        </button>
      </div>

      {msg && (
        <div style={{ background:"rgba(87,204,153,0.1)", border:"1px solid rgba(87,204,153,0.25)", borderRadius:10, padding:"12px 16px", marginBottom:20, color:"#57CC99", fontSize:"0.87rem" }}>
          {msg} <button onClick={()=>setMsg("")} style={{ background:"transparent", color:"#57CC99", marginLeft:10 }}>✕</button>
        </div>
      )}

      {/* Alert banners */}
      {overdue.length > 0 && (
        <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", gap:12, alignItems:"center" }}>
          <span style={{ fontSize:"1.5rem" }}>🚨</span>
          <div>
            <p style={{ color:"#E63946", fontWeight:700 }}>{overdue.length} order(s) OVERDUE — scheduler will cancel automatically within 5 min</p>
            <p style={{ color:"var(--muted)", fontSize:"0.82rem" }}>Or click "Cancel & Refund" to process immediately</p>
          </div>
        </div>
      )}
      {warning.length > 0 && (
        <div style={{ background:"rgba(244,200,66,0.08)", border:"1px solid rgba(244,200,66,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", gap:12, alignItems:"center" }}>
          <span style={{ fontSize:"1.5rem" }}>⚠️</span>
          <p style={{ color:"#F4C842", fontWeight:700 }}>{warning.length} order(s) approaching 2h limit — less than 30 min remaining</p>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        {[
          { l:"Active",   v:active.length,   i:"🚴", c:"var(--white)" },
          { l:"Warning",  v:warning.length,  i:"⚠️", c:"#F4C842" },
          { l:"Overdue",  v:overdue.length,  i:"🚨", c:"#E63946" },
          { l:"All",      v:assignments.length, i:"📊", c:"var(--muted)" },
        ].map(({l,v,i,c}) => (
          <div key={l} className="card" style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:"1.4rem", marginBottom:6 }}>{i}</div>
            <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"1.4rem", color:c }}>{v}</div>
            <div style={{ color:"var(--muted)", fontSize:"0.78rem" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:"flex", background:"var(--charcoal)", borderRadius:10, padding:4, maxWidth:340, marginBottom:20 }}>
        {[["active","Active"],["overdue","Overdue 🚨"],["all","All"]].map(([k,l]) => (
          <button key={k} onClick={()=>setFilter(k)} style={{
            flex:1, padding:"8px 0", borderRadius:8, fontWeight:600, fontSize:"0.85rem",
            background:filter===k?"var(--flame)":"transparent",
            color:filter===k?"#fff":"var(--muted)",
          }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--muted)" }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>✅</div>
          <p style={{ color:"var(--muted)" }}>No {filter==="overdue"?"overdue":"active"} assignments</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {displayed.map(a => {
            const order = a.order || {};
            const tl    = ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status) ? timeLeft(a.assignedAt) : null;
            const m     = mins(a.assignedAt);
            return (
              <div key={a.id} className="card" style={{ padding:"18px 20px",
                borderColor: tl && m>=120?"rgba(230,57,70,0.4)":tl && m>=90?"rgba(244,200,66,0.3)":"var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700 }}>Order #{order.id}</span>
                      <span style={{ padding:"2px 9px", borderRadius:20, fontSize:"0.72rem", fontWeight:700, background:"var(--charcoal)", color:"var(--muted)" }}>{a.status}</span>
                      {tl && <span style={{ padding:"2px 9px", borderRadius:20, fontSize:"0.72rem", fontWeight:700, background:"rgba(0,0,0,0.3)", color:tl.color }}>{tl.label}</span>}
                    </div>
                    <p style={{ color:"var(--muted)", fontSize:"0.82rem" }}>{order.customerName} · {order.customerPhone}</p>
                    <p style={{ color:"var(--muted)", fontSize:"0.78rem", marginTop:2 }}>{order.deliveryAddress || [order.addressLine1, order.city].filter(Boolean).join(", ")}</p>
                    <p style={{ color:"var(--muted)", fontSize:"0.75rem", marginTop:2 }}>Partner: {a.partner?.name || "—"} · Assigned {m}m ago</p>
                  </div>
                  <p style={{ fontWeight:700, color:"var(--flame)", flexShrink:0, marginLeft:12 }}>₹{Math.round((order.total||0)*84)}</p>
                </div>

                {/* Progress bar */}
                {tl && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ height:5, background:"var(--charcoal)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:3, background:tl.color, width:`${Math.min(tl.pct,100)}%`, transition:"width 0.5s" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                      <span style={{ fontSize:"0.7rem", color:"var(--muted)" }}>Assigned</span>
                      <span style={{ fontSize:"0.7rem", color:tl.color, fontWeight:700 }}>{tl.label}</span>
                      <span style={{ fontSize:"0.7rem", color:"var(--muted)" }}>2h limit</span>
                    </div>
                  </div>
                )}

                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <Link to={`/admin/orders/${order.id}`}
                    style={{ padding:"7px 12px", borderRadius:8, fontSize:"0.79rem", background:"var(--charcoal)", border:"1px solid var(--border)", color:"var(--muted)" }}>
                    View Order
                  </Link>
                  {["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status) && (
                    <>
                      <button onClick={()=>api.post(`/delivery/admin/reassign/${order.id}`,{},cfg).then(()=>{setMsg(`Order #${order.id} reassigned`);load();})}
                        style={{ padding:"7px 12px", borderRadius:8, fontSize:"0.79rem", background:"rgba(76,201,240,0.1)", border:"1px solid rgba(76,201,240,0.25)", color:"#4CC9F0", cursor:"pointer" }}>
                        🔄 Reassign
                      </button>
                      <button onClick={()=>handleManualCancel(order.id)}
                        style={{ padding:"7px 12px", borderRadius:8, fontSize:"0.79rem", background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", color:"#E63946", cursor:"pointer" }}>
                        ✕ Cancel & Refund
                      </button>
                      <button onClick={()=>handleTestTimeout(a.id)}
                        style={{ padding:"7px 12px", borderRadius:8, fontSize:"0.79rem", background:"rgba(244,200,66,0.08)", border:"1px solid rgba(244,200,66,0.2)", color:"#F4C842", cursor:"pointer" }}>
                        🧪 Test Timeout
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