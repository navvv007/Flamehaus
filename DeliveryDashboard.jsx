import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/apiClient";

/* ── Auth hook ───────────────────────────────────────────────────────────── */
function useDeliveryAuth() {
  const navigate = useNavigate();

  // Read once into state — avoid re-reading on every render which
  // can cause false "no token" redirects when localStorage is temporarily
  // being updated (e.g. after reject sets availability to ONLINE)
  const [token]   = useState(() => localStorage.getItem("fh_delivery_token"));
  const [partner] = useState(() => {
    try {
      const raw = localStorage.getItem("fh_delivery_partner");
      if (!raw || raw === "undefined" || raw === "null") return null;
      return JSON.parse(raw);
    } catch { return null; }
  });

  useEffect(() => {
    // Only redirect if truly missing — check localStorage directly once
    const t = localStorage.getItem("fh_delivery_token");
    const p = localStorage.getItem("fh_delivery_partner");
    const partnerValid = p && p !== "undefined" && p !== "null";
    if (!t || !partnerValid) {
      localStorage.removeItem("fh_delivery_token");
      localStorage.removeItem("fh_delivery_partner");
      navigate("/delivery/login");
    }
  // Run only on mount — intentionally empty deps so it doesn't
  // fire again when localStorage is updated mid-session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { token, partner };
}

/* ── Delivery API — always reads token fresh, always sets Content-Type ───── */
const makeDeliveryApi = () => {
  const token = localStorage.getItem("fh_delivery_token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  return {
    get:   (path)        => api.get(path,         { headers }),
    patch: (path, data)  => api.patch(path, data, { headers }),
    post:  (path, data)  => api.post(path, data,  { headers }),
  };
};

/* ── Live Map ────────────────────────────────────────────────────────────── */
function DeliveryMap({ order, partnerLat, partnerLng }) {
  const W = 540, H = 220, PAD = 44;
  const rest = { lat: 17.4326, lng: 78.4071 };
  const drop = { lat: order?.deliveryLat || 17.4156, lng: order?.deliveryLng || 78.4347 };
  const me   = { lat: partnerLat || rest.lat, lng: partnerLng || rest.lng };
  const pts  = [rest, drop, me];
  const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng);
  const minLat = Math.min(...lats)-0.015, maxLat = Math.max(...lats)+0.015;
  const minLng = Math.min(...lngs)-0.015, maxLng = Math.max(...lngs)+0.015;
  const proj = (lat, lng) => ({
    x: PAD + ((lng - minLng) / ((maxLng - minLng) || 0.001)) * (W - PAD * 2),
    y: PAD + ((maxLat - lat) / ((maxLat - minLat) || 0.001)) * (H - PAD * 2),
  });
  const rPt = proj(rest.lat, rest.lng);
  const dPt = proj(drop.lat, drop.lng);
  const mPt = proj(me.lat,   me.lng);
  const cx  = (rPt.x+dPt.x)/2, cy = Math.min(rPt.y,dPt.y)-36;
  return (
    <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid var(--border)", background:"#0d1520", marginBottom:14 }}>
      <div style={{ padding:"7px 14px", background:"rgba(0,0,0,0.4)", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:"0.8rem", fontWeight:600 }}>🗺 Live Map</span>
        <span style={{ fontSize:"0.7rem", color:"#4CC9F0" }}>● Live</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {[...Array(5)].map((_,i)=><line key={`h${i}`} x1={0} y1={(H/5)*i} x2={W} y2={(H/5)*i} stroke="#151f2e" strokeWidth={1}/>)}
        {[...Array(8)].map((_,i)=><line key={`v${i}`} x1={(W/8)*i} y1={0} x2={(W/8)*i} y2={H} stroke="#151f2e" strokeWidth={1}/>)}
        <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#263548" strokeWidth={6} strokeLinecap="round"/>
        <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#FF6B35" strokeWidth={2.5} strokeDasharray="8 6" strokeLinecap="round" opacity={0.6}/>
        <circle cx={rPt.x} cy={rPt.y} r={14} fill="#FF6B35"/>
        <text x={rPt.x} y={rPt.y+5} textAnchor="middle" fontSize={12}>🔥</text>
        <circle cx={dPt.x} cy={dPt.y} r={14} fill="#57CC99"/>
        <text x={dPt.x} y={dPt.y+5} textAnchor="middle" fontSize={12}>🏠</text>
        <circle cx={mPt.x} cy={mPt.y} r={16} fill="rgba(76,201,240,0.1)" stroke="rgba(76,201,240,0.3)" strokeWidth={1.5}>
          <animate attributeName="r" values="13;18;13" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx={mPt.x} cy={mPt.y} r={11} fill="#0f172a" stroke="#4CC9F0" strokeWidth={2}/>
        <text x={mPt.x} y={mPt.y+5} textAnchor="middle" fontSize={12}>🛵</text>
      </svg>
    </div>
  );
}

/* ── Status steps ────────────────────────────────────────────────────────── */
const STEPS = [
  { key:"ASSIGNED",  label:"Assigned",  icon:"📦" },
  { key:"ACCEPTED",  label:"Accepted",  icon:"✅" },
  { key:"PICKED_UP", label:"Picked Up", icon:"🛵" },
  { key:"DELIVERED", label:"Delivered", icon:"🎉" },
];
function StatusSteps({ status }) {
  const idx = STEPS.findIndex(s => s.key === status);
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:16 }}>
      {STEPS.map((s,i) => (
        <div key={s.key} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : "none" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem",
              background: i<=idx ? "var(--flame)" : "var(--charcoal)",
              border:`2px solid ${i<=idx ? "var(--flame)" : "var(--border)"}` }}>
              {s.icon}
            </div>
            <div style={{ fontSize:"0.6rem", color: i<=idx ? "var(--flame)" : "var(--muted)", marginTop:3, fontWeight: i===idx ? 700 : 400 }}>{s.label}</div>
          </div>
          {i < STEPS.length-1 && <div style={{ flex:1, height:2, margin:"0 3px", marginBottom:18, background: i<idx ? "var(--flame)" : "var(--border)" }}/>}
        </div>
      ))}
    </div>
  );
}

/* ── Reject Modal ────────────────────────────────────────────────────────── */
const REJECT_REASONS = ["Too far", "Vehicle issue", "Personal emergency", "Area not serviceable", "Other"];

function RejectModal({ onConfirm, onCancel, loading, errorMsg }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
      <div className="card fade-in" style={{ width:"100%", maxWidth:400, padding:"32px 28px" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <span style={{ fontSize:"2rem" }}>⚠️</span>
          <h3 style={{ fontFamily:"Syne,sans-serif", marginTop:10, marginBottom:6 }}>Reject this order?</h3>
          <p style={{ color:"var(--muted)", fontSize:"0.85rem" }}>
            It will be reassigned to the next available partner automatically.
          </p>
        </div>

        {/* Show backend error inside modal */}
        {errorMsg && (
          <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.3)", borderRadius:8, padding:"10px 12px", marginBottom:14, color:"#E63946", fontSize:"0.83rem" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <p style={{ fontSize:"0.75rem", color:"var(--muted)", fontWeight:600, marginBottom:10, letterSpacing:0.5 }}>SELECT REASON</p>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
          {REJECT_REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)} style={{
              padding:"10px 14px", borderRadius:8, textAlign:"left", fontSize:"0.87rem",
              background: reason===r ? "rgba(255,107,53,0.15)" : "var(--charcoal)",
              border:`1.5px solid ${reason===r ? "var(--flame)" : "var(--border)"}`,
              color: reason===r ? "var(--flame)" : "var(--muted)", transition:"all 0.15s",
            }}>{r}</button>
          ))}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} disabled={loading} className="btn-outline" style={{ flex:1, padding:"12px 0", opacity: loading ? 0.6 : 1 }}>
            Cancel
          </button>
          <button
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason || loading}
            style={{
              flex:1, padding:"12px 0", borderRadius:50, fontWeight:700, fontSize:"0.9rem",
              background: reason ? "#E63946" : "var(--border)", color:"#fff",
              opacity: (!reason || loading) ? 0.6 : 1,
              border:"none", cursor: reason && !loading ? "pointer" : "not-allowed",
            }}>
            {loading ? "Rejecting…" : "Reject Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────────── */
const STEP_MAP = {
  ASSIGNED:  { label:"New Order",  icon:"📦", color:"#4CC9F0", next:"accept",  nextLabel:"✅ Accept Order" },
  ACCEPTED:  { label:"Accepted",   icon:"✅", color:"#C77DFF", next:"pickup",  nextLabel:"🛵 Mark Picked Up" },
  PICKED_UP: { label:"On the Way", icon:"🛵", color:"#F4C842", next:"deliver", nextLabel:"📦 Mark Delivered" },
  DELIVERED: { label:"Delivered",  icon:"🎉", color:"#57CC99", next:null },
  REJECTED:  { label:"Rejected",   icon:"❌", color:"#E63946", next:null },
};

export default function DeliveryDashboard() {
  const navigate           = useNavigate();
  const { partner }        = useDeliveryAuth();
  const [active,  setActive]  = useState(null);
  const [history, setHistory] = useState([]);
  const [avail,   setAvail]   = useState(partner?.availability || "OFFLINE");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(true);
  const [actLoad, setActLoad] = useState(false);
  const [rejLoad, setRejLoad] = useState(false);
  const [error,   setError]   = useState("");
  const [rejError,   setRejError]   = useState(""); // error shown inside reject modal
  const [showReject, setShowReject] = useState(false);
  const [coords,  setCoords]  = useState(null);
  const locRef = useRef(null);

  // Load assignments
  const load = useCallback(async () => {
    try {
      const dApi = makeDeliveryApi();
      const r = await dApi.get("/delivery/partner/assignments");
      const all = r.data;
      setActive(all.find(a => ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status)) || null);
      setHistory(all.filter(a => ["DELIVERED","REJECTED","FAILED"].includes(a.status)));
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("fh_delivery_token");
        localStorage.removeItem("fh_delivery_partner");
        navigate("/delivery/login");
      } else {
        setError("Failed to load assignments");
      }
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  // GPS ping
  useEffect(() => {
    clearInterval(locRef.current);
    if (!["ONLINE","BUSY"].includes(avail)) return;
    const ping = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        makeDeliveryApi().patch("/delivery/partner/location", { lat: c.latitude, lng: c.longitude }).catch(()=>{});
      }, ()=>{});
    };
    ping();
    locRef.current = setInterval(ping, 30000);
    return () => clearInterval(locRef.current);
  }, [avail]);

  const toggleAvail = async () => {
    const next = avail === "ONLINE" ? "OFFLINE" : "ONLINE";
    try {
      await makeDeliveryApi().patch("/delivery/partner/availability", { availability: next });
      setAvail(next);
      localStorage.setItem("fh_delivery_partner", JSON.stringify({ ...partner, availability: next }));
    } catch (e) { setError(e.response?.data?.error || "Failed to update availability"); }
  };

  const handleAction = async () => {
    if (!active) return;
    const step = STEP_MAP[active.status];
    if (!step?.next) return;
    setActLoad(true); setError("");
    try {
      const dApi = makeDeliveryApi();
      if (step.next === "accept") {
        await dApi.patch(`/delivery/partner/assignments/${active.id}/accept`, {});
      } else if (step.next === "pickup") {
        await dApi.patch(`/delivery/partner/assignments/${active.id}/pickup`,
          { lat: coords?.lat || null, lng: coords?.lng || null });
      } else if (step.next === "deliver") {
        if (!otp.trim()) { setError("Enter the 4-digit delivery OTP"); setActLoad(false); return; }
        const delivId = active.id;
        await dApi.patch(`/delivery/partner/assignments/${active.id}/deliver`, { otp: otp.trim() });
        setOtp("");
        setActive(null);  // clear immediately — prevents stale active state
        await load();
        navigate(`/delivery/rate/${delivId}`);  // stay in /delivery/* — no website redirect
        return;
      }
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Action failed. Please try again.");
    } finally { setActLoad(false); }
  };

  // ── Reject — sends reason as JSON body, shows error inside modal ──────────
  const handleReject = async (reason) => {
    setRejLoad(true); setRejError("");
    try {
      const dApi = makeDeliveryApi();
      // Explicitly send JSON body with reason string
      await dApi.patch(
        `/delivery/partner/assignments/${active.id}/reject`,
        { reason: reason }   // ← plain object, axios serialises to JSON
      );
      // Update localStorage BEFORE load() — prevents auth hook from
      // seeing a stale partner object and redirecting to login
      const updatedPartner = { ...partner, availability: "ONLINE" };
      localStorage.setItem("fh_delivery_partner", JSON.stringify(updatedPartner));
      setAvail("ONLINE");
      setShowReject(false);
      setRejError("");
      // Clear active immediately so the reject button disappears
      setActive(null);
      // Then reload from server
      await load();
    } catch (e) {
      // Show error inside the modal — don't close it
      const msg = e.response?.data?.error || "Failed to reject order. Please try again.";
      setRejError(msg);
    } finally { setRejLoad(false); }
  };

  const handleLogout = async () => {
    try { await makeDeliveryApi().post("/delivery/auth/logout", {}); } catch(_) {}
    localStorage.removeItem("fh_delivery_token");
    localStorage.removeItem("fh_delivery_partner");
    navigate("/delivery/login");
  };

  const todayCount = history.filter(a =>
    a.deliveredAt && new Date(a.deliveredAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div style={{ minHeight:"100vh", background:"var(--dark)", display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ background:"var(--charcoal)", borderBottom:"1px solid var(--border)", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:"1.3rem" }}>🛵</span>
          <div>
            <p style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:"0.9rem" }}>{partner?.name}</p>
            <p style={{ color:"var(--muted)", fontSize:"0.7rem" }}>{partner?.vehicleType} · {partner?.vehicleNumber || "—"}</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={toggleAvail} style={{
            padding:"6px 14px", borderRadius:50, fontWeight:700, fontSize:"0.8rem",
            background: avail==="ONLINE" ? "rgba(87,204,153,0.15)" : "rgba(136,136,136,0.1)",
            color: avail==="ONLINE" ? "#57CC99" : "#888",
            border:`1.5px solid ${avail==="ONLINE" ? "rgba(87,204,153,0.4)" : "var(--border)"}`,
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background: avail==="ONLINE" ? "#57CC99" : "#888", display:"inline-block", marginRight:5, verticalAlign:"middle" }}/>
            {avail==="ONLINE" ? "Online" : "Go Online"}
          </button>
          <button onClick={handleLogout} style={{ background:"transparent", color:"var(--muted)", fontSize:"0.78rem", padding:"6px 10px", borderRadius:8, border:"1px solid var(--border)" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex:1, padding:"16px 14px", maxWidth:600, margin:"0 auto", width:"100%" }}>
        {error && (
          <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:14, color:"#E63946", fontSize:"0.85rem" }}>
            {error}
            <button onClick={() => setError("")} style={{ float:"right", background:"transparent", color:"#E63946", fontWeight:700 }}>✕</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {[
            { label:"Today",  value: todayCount, icon:"📦" },
            { label:"Total",  value: partner?.totalDeliveries || 0, icon:"🎯" },
            { label:"Rating", value: (partner?.totalRatings||0) > 0 ? `★ ${Number(partner.rating).toFixed(1)}` : "—", icon:"⭐" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={{ padding:"12px 8px", textAlign:"center" }}>
              <div style={{ fontSize:"1.1rem", marginBottom:3 }}>{icon}</div>
              <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"1.2rem", marginBottom:1 }}>{value}</div>
              <div style={{ color:"var(--muted)", fontSize:"0.65rem" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Active assignment */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)" }}>Loading…</div>
        ) : active ? (
          <div className="card fade-in" style={{ padding:18, marginBottom:16 }}>
            {(() => {
              const step  = STEP_MAP[active.status];
              const order = active.order || {};
              return (
                <>
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <span style={{ fontSize:"1.6rem" }}>{step.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"Syne,sans-serif", fontWeight:700, color:step.color }}>{step.label}</div>
                      <div style={{ color:"var(--muted)", fontSize:"0.75rem" }}>Order #{order.id}</div>
                    </div>
                    <Link to={`/delivery/track/${active.id}`} style={{ fontSize:"0.75rem", color:"var(--muted)", border:"1px solid var(--border)", padding:"3px 8px", borderRadius:6 }}>
                      Full View →
                    </Link>
                  </div>

                  <StatusSteps status={active.status} />
                  <DeliveryMap order={order} partnerLat={coords?.lat} partnerLng={coords?.lng} />

                  {/* Order info */}
                  <div style={{ background:"var(--charcoal)", borderRadius:8, padding:12, marginBottom:10 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                      <div>
                        <p style={{ fontSize:"0.68rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", marginBottom:3 }}>📍 Pickup</p>
                        <p style={{ fontSize:"0.8rem" }}>Flamehaus Kitchen</p>
                        <p style={{ fontSize:"0.72rem", color:"var(--muted)" }}>12 Jubilee Hills</p>
                      </div>
                      <div>
                        <p style={{ fontSize:"0.68rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase", marginBottom:3 }}>🏠 Drop</p>
                        <p style={{ fontSize:"0.8rem" }}>{order.customerName}</p>
                        <p style={{ fontSize:"0.72rem", color:"var(--muted)" }}>📞 {order.customerPhone}</p>
                      </div>
                    </div>
                    <div style={{ borderTop:"1px solid var(--border)", paddingTop:8 }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--muted)", marginBottom:2 }}>Address</p>
                      <p style={{ fontSize:"0.8rem" }}>{order.deliveryAddress || "—"}</p>
                    </div>
                  </div>

                  {/* Delivery OTP */}
                  {["ASSIGNED","ACCEPTED"].includes(active.status) && active.deliveryOtp && (
                    <div style={{ marginBottom:10, padding:"10px 12px", background:"rgba(255,107,53,0.08)", borderRadius:8, textAlign:"center" }}>
                      <p style={{ color:"var(--muted)", fontSize:"0.68rem", marginBottom:4 }}>Share with customer on arrival</p>
                      <p style={{ fontFamily:"monospace", fontSize:"1.8rem", fontWeight:900, color:"var(--flame)", letterSpacing:10 }}>
                        {active.deliveryOtp}
                      </p>
                    </div>
                  )}

                  {/* OTP input for delivery */}
                  {active.status === "PICKED_UP" && (
                    <div style={{ marginBottom:10 }}>
                      <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>
                        Enter Customer OTP
                      </label>
                      <input type="text" inputMode="numeric" maxLength={4}
                        value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g,""))}
                        placeholder="_ _ _ _"
                        style={{ width:"100%", fontSize:"1.8rem", letterSpacing:14, textAlign:"center", padding:"10px 0" }}/>
                    </div>
                  )}

                  {/* Accept / Pickup / Deliver button */}
                  {step.next && (
                    <button onClick={handleAction} disabled={actLoad} className="btn-primary"
                      style={{ width:"100%", justifyContent:"center", padding:"13px 0", marginBottom:10, opacity: actLoad ? 0.7 : 1 }}>
                      {actLoad ? "Updating…" : step.nextLabel}
                    </button>
                  )}

                  {/* Reject button — ASSIGNED or ACCEPTED only */}
                  {["ASSIGNED","ACCEPTED"].includes(active.status) && (
                    <button
                      onClick={() => { setShowReject(true); setRejError(""); }}
                      style={{
                        width:"100%", padding:"11px 0", borderRadius:50,
                        border:"1.5px solid rgba(230,57,70,0.4)",
                        background:"rgba(230,57,70,0.08)", color:"#E63946",
                        fontWeight:700, fontSize:"0.88rem", transition:"all 0.2s", cursor:"pointer",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background="rgba(230,57,70,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background="rgba(230,57,70,0.08)"; }}
                    >
                      ✕ Reject Order
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="card" style={{ padding:"36px 20px", textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:"2.5rem", marginBottom:10 }}>{avail==="ONLINE" ? "⏳" : "😴"}</div>
            <p style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:"1rem", marginBottom:6 }}>
              {avail==="ONLINE" ? "Waiting for orders…" : "You're Offline"}
            </p>
            <p style={{ color:"var(--muted)", fontSize:"0.84rem" }}>
              {avail==="ONLINE" ? "Auto-refreshes every 15 seconds" : "Tap Go Online to receive orders"}
            </p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:"0.88rem", color:"var(--muted)", marginBottom:10 }}>
              History ({history.length})
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {history.slice(0,10).map((a) => (
                <Link key={a.id} to={`/delivery/track/${a.id}`} style={{ textDecoration:"none" }}>
                  <div className="card" style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <p style={{ fontWeight:600, fontSize:"0.84rem" }}>Order #{a.order?.id}</p>
                      <p style={{ color:"var(--muted)", fontSize:"0.72rem" }}>{a.order?.customerName}</p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span style={{
                        fontSize:"0.7rem", padding:"3px 8px", borderRadius:20, fontWeight:700,
                        background: a.status==="DELIVERED" ? "rgba(87,204,153,0.15)" : a.status==="REJECTED" ? "rgba(230,57,70,0.12)" : "rgba(136,136,136,0.1)",
                        color:      a.status==="DELIVERED" ? "#57CC99"               : a.status==="REJECTED" ? "#E63946"               : "#888",
                      }}>
                        {a.status==="DELIVERED" ? "✓ Delivered" : a.status==="REJECTED" ? "✕ Rejected" : a.status}
                      </span>
                      {a.status==="REJECTED" && a.rejectionReason && (
                        <p style={{ color:"var(--muted)", fontSize:"0.66rem", marginTop:2 }}>{a.rejectionReason}</p>
                      )}
                      {a.partnerRating && (
                        <p style={{ color:"#F4C842", fontSize:"0.7rem", marginTop:2 }}>{"★".repeat(a.partnerRating)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reject modal */}
      {showReject && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => { setShowReject(false); setRejError(""); }}
          loading={rejLoad}
          errorMsg={rejError}
        />
      )}
    </div>
  );
}
