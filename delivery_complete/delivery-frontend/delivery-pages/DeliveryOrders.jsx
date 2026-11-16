import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/apiClient";

/* ── Shared auth hook ─────────────────────────────────────────────────────── */
export function useDeliveryAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("fh_delivery_token");
  const partner = (() => {
    try {
      const raw = localStorage.getItem("fh_delivery_partner");
      if (!raw || raw === "undefined" || raw === "null") return null;
      return JSON.parse(raw);
    } catch { return null; }
  })();

  useEffect(() => {
    if (!token || !partner) {
      localStorage.removeItem("fh_delivery_token");
      localStorage.removeItem("fh_delivery_partner");
      navigate("/delivery/login");
    }
  }, [token, partner, navigate]);

  return { token, partner };
}

/* ── Delivery API helper (always uses delivery token) ─────────────────────── */
export function useDeliveryApi() {
  return useCallback((path, method = "get", data = null) => {
    const token = localStorage.getItem("fh_delivery_token");
    const cfg = { headers: { Authorization: `Bearer ${token}` } };
    if (method === "get")   return api.get(path, cfg);
    if (method === "patch") return api.patch(path, data, cfg);
    return api.post(path, data, cfg);
  }, []);
}

/* ── Live Delivery Map (SVG, animated rider) ─────────────────────────────── */
function DeliveryMap({ assignment, partnerLat, partnerLng }) {
  const W = 560, H = 240, PAD = 44;

  const restaurant  = { lat: 17.4326, lng: 78.4071 }; // Jubilee Hills
  const destination = {
    lat: assignment?.order?.deliveryLat  || 17.4156,
    lng: assignment?.order?.deliveryLng  || 78.4347,
  };
  const partnerPos  = {
    lat: partnerLat || restaurant.lat,
    lng: partnerLng || restaurant.lng,
  };

  const pts = [restaurant, destination, partnerPos];
  const lats = pts.map(p => p.lat);
  const lngs = pts.map(p => p.lng);
  const minLat = Math.min(...lats) - 0.015, maxLat = Math.max(...lats) + 0.015;
  const minLng = Math.min(...lngs) - 0.015, maxLng = Math.max(...lngs) + 0.015;

  const proj = (lat, lng) => ({
    x: PAD + ((lng - minLng) / ((maxLng - minLng) || 0.001)) * (W - PAD * 2),
    y: PAD + ((maxLat - lat) / ((maxLat - minLat) || 0.001)) * (H - PAD * 2),
  });

  const rPt = proj(restaurant.lat,  restaurant.lng);
  const dPt = proj(destination.lat, destination.lng);
  const mPt = proj(partnerPos.lat,  partnerPos.lng);
  const cx  = (rPt.x + dPt.x) / 2;
  const cy  = Math.min(rPt.y, dPt.y) - 40;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#0d1520", marginBottom: 16 }}>
      <div style={{ padding: "8px 14px", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>🗺 Live Map</span>
        <span style={{ fontSize: "0.72rem", color: "#4CC9F0" }}>● Live</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* Grid */}
        {[...Array(6)].map((_, i) => <line key={`h${i}`} x1={0} y1={(H/6)*i} x2={W} y2={(H/6)*i} stroke="#151f2e" strokeWidth={1}/>)}
        {[...Array(9)].map((_, i) => <line key={`v${i}`} x1={(W/9)*i} y1={0} x2={(W/9)*i} y2={H} stroke="#151f2e" strokeWidth={1}/>)}
        {/* Route */}
        <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#263548" strokeWidth={6} strokeLinecap="round"/>
        <path d={`M ${rPt.x} ${rPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#FF6B35" strokeWidth={3} strokeLinecap="round" opacity={0.6} strokeDasharray="8 6"/>
        {/* Restaurant */}
        <circle cx={rPt.x} cy={rPt.y} r={16} fill="#FF6B35"/>
        <text x={rPt.x} y={rPt.y+5} textAnchor="middle" fontSize={14}>🔥</text>
        <text x={rPt.x} y={rPt.y+28} textAnchor="middle" fontSize={9} fill="#FF6B35" fontFamily="Inter,sans-serif" fontWeight="700">PICKUP</text>
        {/* Destination */}
        <circle cx={dPt.x} cy={dPt.y} r={16} fill="#57CC99"/>
        <text x={dPt.x} y={dPt.y+5} textAnchor="middle" fontSize={14}>🏠</text>
        <text x={dPt.x} y={dPt.y+28} textAnchor="middle" fontSize={9} fill="#57CC99" fontFamily="Inter,sans-serif" fontWeight="700">DROP</text>
        {/* Partner (rider) */}
        <circle cx={mPt.x} cy={mPt.y} r={18} fill="rgba(76,201,240,0.1)" stroke="rgba(76,201,240,0.3)" strokeWidth={1.5}>
          <animate attributeName="r" values="15;20;15" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx={mPt.x} cy={mPt.y} r={13} fill="#0f172a" stroke="#4CC9F0" strokeWidth={2}/>
        <text x={mPt.x} y={mPt.y+5} textAnchor="middle" fontSize={13}>🛵</text>
      </svg>
    </div>
  );
}

/* ── Status step bar ─────────────────────────────────────────────────────── */
function StatusSteps({ status }) {
  const steps = [
    { key: "ASSIGNED",  label: "Assigned",  icon: "📦" },
    { key: "ACCEPTED",  label: "Accepted",  icon: "✅" },
    { key: "PICKED_UP", label: "Picked Up", icon: "🛵" },
    { key: "DELIVERED", label: "Delivered", icon: "🎉" },
  ];
  const idx = steps.findIndex(s => s.key === status);
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "1rem",
              background: i <= idx ? "var(--flame)" : "var(--charcoal)",
              border: `2px solid ${i <= idx ? "var(--flame)" : "var(--border)"}`,
            }}>{s.icon}</div>
            <div style={{ fontSize: "0.65rem", color: i <= idx ? "var(--flame)" : "var(--muted)", marginTop: 4, fontWeight: i === idx ? 700 : 400 }}>
              {s.label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: "0 4px", marginBottom: 20, background: i < idx ? "var(--flame)" : "var(--border)" }}/>
          )}
        </div>
      ))}
    </div>
  );
}

const STEP_MAP = {
  ASSIGNED:  { label: "New Order",  icon: "📦", color: "#4CC9F0", next: "accept",  nextLabel: "Accept Order" },
  ACCEPTED:  { label: "Accepted",   icon: "✅", color: "#C77DFF", next: "pickup",  nextLabel: "Mark Picked Up" },
  PICKED_UP: { label: "On the Way", icon: "🛵", color: "#F4C842", next: "deliver", nextLabel: "Mark Delivered" },
  DELIVERED: { label: "Delivered",  icon: "🎉", color: "#57CC99", next: null,      nextLabel: null },
  FAILED:    { label: "Failed",     icon: "❌", color: "#E63946", next: null,      nextLabel: null },
};

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function DeliveryOrders() {
  const navigate    = useNavigate();
  const { partner } = useDeliveryAuth();
  const dApi        = useDeliveryApi();

  const [active,        setActive]        = useState(null);
  const [history,       setHistory]       = useState([]);
  const [availability,  setAvailability]  = useState(partner?.availability || "OFFLINE");
  const [otpInput,      setOtpInput]      = useState("");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,         setError]         = useState("");
  const [partnerCoords, setPartnerCoords] = useState(null);
  const locationRef = useRef(null);

  /* Poll assignments every 15 s */
  const load = useCallback(async () => {
    try {
      const res = await dApi("/delivery/partner/assignments");
      const all = res.data;
      const cur = all.find(a => ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status));
      setActive(cur || null);
      setHistory(all.filter(a => a.status === "DELIVERED" || a.status === "FAILED"));
    } catch { setError("Failed to load assignments"); }
    finally { setLoading(false); }
  }, [dApi]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  /* GPS ping every 30 s when online */
  useEffect(() => {
    if (availability !== "ONLINE" && availability !== "BUSY") {
      clearInterval(locationRef.current);
      return;
    }
    const ping = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        setPartnerCoords({ lat: coords.latitude, lng: coords.longitude });
        dApi("/delivery/partner/location", "patch", { lat: coords.latitude, lng: coords.longitude }).catch(() => {});
      }, () => {});
    };
    ping();
    locationRef.current = setInterval(ping, 30000);
    return () => clearInterval(locationRef.current);
  }, [availability, dApi]);

  const toggleAvailability = async () => {
    const next = availability === "ONLINE" ? "OFFLINE" : "ONLINE";
    try {
      await dApi("/delivery/partner/availability", "patch", { availability: next });
      setAvailability(next);
      localStorage.setItem("fh_delivery_partner", JSON.stringify({ ...partner, availability: next }));
    } catch (e) { setError(e.response?.data?.error || "Failed to update"); }
  };

  const handleAction = async () => {
    if (!active) return;
    const step = STEP_MAP[active.status];
    if (!step?.next) return;
    setActionLoading(true); setError("");
    try {
      if (step.next === "accept") {
        await dApi(`/delivery/partner/assignments/${active.id}/accept`, "patch");
      } else if (step.next === "pickup") {
        const c = partnerCoords;
        await dApi(`/delivery/partner/assignments/${active.id}/pickup`, "patch", { lat: c?.lat, lng: c?.lng });
      } else if (step.next === "deliver") {
        if (!otpInput.trim()) { setError("Enter the 4-digit delivery OTP"); setActionLoading(false); return; }
        await dApi(`/delivery/partner/assignments/${active.id}/deliver`, "patch", { otp: otpInput.trim() });
        setOtpInput("");
      }
      await load();
    } catch (e) { setError(e.response?.data?.error || "Action failed"); }
    finally { setActionLoading(false); }
  };

  const handleLogout = async () => {
    try { await dApi("/delivery/auth/logout", "post"); } catch (_) {}
    localStorage.removeItem("fh_delivery_token");
    localStorage.removeItem("fh_delivery_partner");
    navigate("/delivery/login");
  };

  const todayCount = history.filter(a => {
    if (!a.deliveredAt) return false;
    return new Date(a.deliveredAt).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.4rem" }}>🛵</span>
          <div>
            <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>{partner?.name}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{partner?.vehicleType} · {partner?.vehicleNumber || "—"}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleAvailability} style={{
            padding: "7px 16px", borderRadius: 50, fontWeight: 700, fontSize: "0.82rem", transition: "all 0.2s",
            background: availability === "ONLINE" ? "rgba(87,204,153,0.15)" : "rgba(136,136,136,0.1)",
            color:      availability === "ONLINE" ? "#57CC99"               : "#888",
            border:     `1.5px solid ${availability === "ONLINE" ? "rgba(87,204,153,0.4)" : "var(--border)"}`,
          }}>
            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: availability === "ONLINE" ? "#57CC99" : "#888", marginRight: 6, verticalAlign: "middle" }}/>
            {availability === "ONLINE" ? "Online" : "Go Online"}
          </button>
          <button onClick={handleLogout} style={{ background: "transparent", color: "var(--muted)", fontSize: "0.82rem", padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 16px", maxWidth: 640, margin: "0 auto", width: "100%" }}>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 16, color: "#E63946", fontSize: "0.87rem" }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Today",  value: todayCount,                                                  icon: "📦" },
            { label: "Total",  value: partner?.totalDeliveries || 0,                               icon: "🎯" },
            { label: "Rating", value: (partner?.totalRatings || 0) > 0 ? `★ ${Number(partner.rating).toFixed(1)}` : "—", icon: "⭐" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={{ padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{icon}</div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: 2 }}>{value}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Active assignment ────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Loading…</div>
        ) : active ? (
          <div className="card fade-in" style={{ padding: 20, marginBottom: 20 }}>
            {(() => {
              const step = STEP_MAP[active.status];
              const order = active.order || {};
              return (
                <>
                  {/* Status header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: "1.8rem" }}>{step.icon}</span>
                    <div>
                      <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.05rem", color: step.color }}>{step.label}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Order #{order.id}</div>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <Link to={`/delivery/track/${active.id}`} style={{ fontSize: "0.78rem", color: "var(--muted)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 8 }}>
                        Full View →
                      </Link>
                    </div>
                  </div>

                  {/* Status steps */}
                  <StatusSteps status={active.status} />

                  {/* Live map */}
                  <DeliveryMap
                    assignment={active}
                    partnerLat={partnerCoords?.lat}
                    partnerLng={partnerCoords?.lng}
                  />

                  {/* Order info */}
                  <div style={{ background: "var(--charcoal)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <p style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>📍 Pickup</p>
                        <p style={{ fontSize: "0.82rem" }}>Flamehaus Kitchen</p>
                        <p style={{ fontSize: "0.76rem", color: "var(--muted)" }}>12 Jubilee Hills, Hyd</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>🏠 Drop</p>
                        <p style={{ fontSize: "0.82rem" }}>{order.customerName}</p>
                        <p style={{ fontSize: "0.76rem", color: "var(--muted)" }}>📞 {order.customerPhone}</p>
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 10 }}>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4 }}>Drop address</p>
                      <p style={{ fontSize: "0.82rem" }}>{order.deliveryAddress || "—"}</p>
                    </div>
                  </div>

                  <div style={{ background: "var(--charcoal)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--muted)" }}>Items: </span>{order.itemsSummary || "—"}
                  </div>

                  {/* Delivery OTP shown to partner */}
                  {["ASSIGNED","ACCEPTED"].includes(active.status) && active.deliveryOtp && (
                    <div style={{ marginBottom: 14, padding: "12px 14px", background: "rgba(255,107,53,0.08)", borderRadius: 10, textAlign: "center" }}>
                      <p style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: 6 }}>Delivery OTP — share with customer on arrival</p>
                      <p style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 800, color: "var(--flame)", letterSpacing: 10 }}>{active.deliveryOtp}</p>
                    </div>
                  )}

                  {/* OTP input for delivery step */}
                  {active.status === "PICKED_UP" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>
                        Enter OTP given by customer
                      </label>
                      <input
                        type="text" inputMode="numeric" maxLength={4}
                        value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="_ _ _ _"
                        style={{ width: "100%", fontSize: "2rem", letterSpacing: 14, textAlign: "center", padding: "12px 0" }}
                      />
                    </div>
                  )}

                  {/* Action button */}
                  {step.next && (
                    <button onClick={handleAction} disabled={actionLoading} className="btn-primary"
                      style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: "1rem", opacity: actionLoading ? 0.7 : 1 }}>
                      {actionLoading ? "Updating…" : step.nextLabel}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          /* No active order */
          <div className="card" style={{ padding: "40px 24px", textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: "2.8rem", marginBottom: 12 }}>{availability === "ONLINE" ? "⏳" : "😴"}</div>
            <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
              {availability === "ONLINE" ? "Waiting for orders…" : "You're Offline"}
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              {availability === "ONLINE"
                ? "New orders will appear here automatically every 15 seconds"
                : "Go Online above to start receiving delivery assignments"}
            </p>
          </div>
        )}

        {/* ── Delivery history ────────────────────────────────────────────── */}
        {history.length > 0 && (
          <>
            <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: "0.95rem", color: "var(--muted)", marginBottom: 12 }}>
              Delivery History ({history.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.slice(0, 8).map((a) => (
                <Link key={a.id} to={`/delivery/track/${a.id}`} style={{ textDecoration: "none" }}>
                  <div className="card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--flame)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 2 }}>Order #{a.order?.id}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.76rem" }}>{a.order?.customerName}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        fontSize: "0.72rem", padding: "3px 10px", borderRadius: 20, fontWeight: 700,
                        background: a.status === "DELIVERED" ? "rgba(87,204,153,0.15)" : "rgba(230,57,70,0.12)",
                        color:      a.status === "DELIVERED" ? "#57CC99"               : "#E63946",
                      }}>
                        {a.status === "DELIVERED" ? "✓ Delivered" : "✕ Failed"}
                      </span>
                      {a.partnerRating && (
                        <p style={{ color: "#F4C842", fontSize: "0.72rem", marginTop: 3 }}>{"★".repeat(a.partnerRating)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
