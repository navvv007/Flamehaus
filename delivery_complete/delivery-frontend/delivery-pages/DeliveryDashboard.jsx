import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

/* ── Auth guard ───────────────────────────────────────────────────────────── */
function useDeliveryAuth() {
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

/* ── Delivery API helper ─────────────────────────────────────────────────── */
function useDeliveryApi() {
  return useCallback((path, method = "get", data = null) => {
    const token = localStorage.getItem("fh_delivery_token");
    const cfg   = { headers: { Authorization: `Bearer ${token}` } };
    if (method === "get")   return api.get(path, cfg);
    if (method === "patch") return api.patch(path, data, cfg);
    return api.post(path, data, cfg);
  }, []);
}

/* ── Live SVG Delivery Map ───────────────────────────────────────────────── */
function LiveMap({ assignment, riderLat, riderLng }) {
  const W = 560, H = 220, PAD = 48;

  const kitchen     = { lat: 17.4326, lng: 78.4071 };
  const destination = {
    lat: assignment?.order?.deliveryLat  || 17.4156,
    lng: assignment?.order?.deliveryLng  || 78.4347,
  };
  const rider = { lat: riderLat || kitchen.lat, lng: riderLng || kitchen.lng };

  const all  = [kitchen, destination, rider];
  const minLat = Math.min(...all.map(p => p.lat)) - 0.014;
  const maxLat = Math.max(...all.map(p => p.lat)) + 0.014;
  const minLng = Math.min(...all.map(p => p.lng)) - 0.014;
  const maxLng = Math.max(...all.map(p => p.lng)) + 0.014;

  const proj = (lat, lng) => ({
    x: PAD + ((lng - minLng) / ((maxLng - minLng) || 0.001)) * (W - PAD * 2),
    y: PAD + ((maxLat - lat) / ((maxLat - minLat) || 0.001)) * (H - PAD * 2),
  });

  const kPt = proj(kitchen.lat,     kitchen.lng);
  const dPt = proj(destination.lat, destination.lng);
  const mPt = proj(rider.lat,       rider.lng);
  const cx  = (kPt.x + dPt.x) / 2;
  const cy  = Math.min(kPt.y, dPt.y) - 36;

  const isMoving = ["ACCEPTED", "PICKED_UP"].includes(assignment?.status);

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#0d1520", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: "8px 14px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>🗺 Live Route</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: isMoving ? "#4CC9F0" : "#888" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isMoving ? "#4CC9F0" : "#888", display: "inline-block" }}/>
          {isMoving ? "Live tracking" : "Standby"}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(H/5)*i} x2={W} y2={(H/5)*i} stroke="#151f2e" strokeWidth={1}/>
        ))}
        {[...Array(8)].map((_, i) => (
          <line key={`v${i}`} x1={(W/8)*i} y1={0} x2={(W/8)*i} y2={H} stroke="#151f2e" strokeWidth={1}/>
        ))}
        {/* Road */}
        <path d={`M ${kPt.x} ${kPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#1e2d42" strokeWidth={12} strokeLinecap="round"/>
        <path d={`M ${kPt.x} ${kPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#263548" strokeWidth={6} strokeLinecap="round"/>
        <path d={`M ${kPt.x} ${kPt.y} Q ${cx} ${cy} ${dPt.x} ${dPt.y}`} fill="none" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" opacity={0.5} strokeDasharray="8 7"/>
        {/* Kitchen pin */}
        <circle cx={kPt.x} cy={kPt.y} r={18} fill="#FF6B35"/>
        <text x={kPt.x} y={kPt.y+6} textAnchor="middle" fontSize={14}>🔥</text>
        <text x={kPt.x} y={kPt.y+30} textAnchor="middle" fontSize={8} fill="#FF6B35" fontFamily="Inter,sans-serif" fontWeight="700">PICKUP</text>
        {/* Drop pin */}
        <circle cx={dPt.x} cy={dPt.y} r={18}
          fill={assignment?.status === "DELIVERED" ? "#57CC99" : "#4CC9F0"}/>
        <text x={dPt.x} y={dPt.y+6} textAnchor="middle" fontSize={14}>
          {assignment?.status === "DELIVERED" ? "✓" : "🏠"}
        </text>
        <text x={dPt.x} y={dPt.y+30} textAnchor="middle" fontSize={8}
          fill={assignment?.status === "DELIVERED" ? "#57CC99" : "#4CC9F0"}
          fontFamily="Inter,sans-serif" fontWeight="700">
          {assignment?.status === "DELIVERED" ? "DONE" : "DROP"}
        </text>
        {/* Rider dot */}
        {assignment?.status !== "DELIVERED" && (
          <g>
            <circle cx={mPt.x} cy={mPt.y} r={20} fill="rgba(76,201,240,0.08)" stroke="rgba(76,201,240,0.25)" strokeWidth={1.5}>
              {isMoving && <animate attributeName="r" values="16;22;16" dur="2s" repeatCount="indefinite"/>}
            </circle>
            <circle cx={mPt.x} cy={mPt.y} r={14} fill="#0f172a" stroke="#4CC9F0" strokeWidth={2}/>
            <text x={mPt.x} y={mPt.y+5} textAnchor="middle" fontSize={13}>🛵</text>
          </g>
        )}
      </svg>
      {/* Footer */}
      <div style={{ padding: "6px 14px", borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.3)", fontSize: "0.68rem", color: "#3a506b", fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
        <span>You: {rider.lat.toFixed(4)}, {rider.lng.toFixed(4)}</span>
        <span>Drop: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</span>
      </div>
    </div>
  );
}

/* ── Status steps bar ────────────────────────────────────────────────────── */
function StatusBar({ status }) {
  const steps = [
    { key: "ASSIGNED",  label: "Assigned",  icon: "📦" },
    { key: "ACCEPTED",  label: "Accepted",  icon: "✅" },
    { key: "PICKED_UP", label: "Picked Up", icon: "🛵" },
    { key: "DELIVERED", label: "Delivered", icon: "🎉" },
  ];
  const cur = steps.findIndex(s => s.key === status);
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", fontSize: "0.95rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: i <= cur ? "rgba(255,107,53,0.2)" : "var(--charcoal)",
              border: `2px solid ${i <= cur ? "var(--flame)" : "var(--border)"}`,
            }}>{s.icon}</div>
            <div style={{ fontSize: "0.6rem", marginTop: 4, fontWeight: i === cur ? 700 : 400, color: i <= cur ? "var(--flame)" : "var(--muted)" }}>
              {s.label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: "0 3px", marginBottom: 18, background: i < cur ? "var(--flame)" : "var(--border)", transition: "background 0.3s" }}/>
          )}
        </div>
      ))}
    </div>
  );
}

const STEP_MAP = {
  ASSIGNED:  { label: "New Order",  icon: "📦", color: "#4CC9F0", next: "accept",  nextLabel: "✅ Accept Order" },
  ACCEPTED:  { label: "Accepted",   icon: "✅", color: "#C77DFF", next: "pickup",  nextLabel: "🛵 Mark Picked Up" },
  PICKED_UP: { label: "On the Way", icon: "🛵", color: "#F4C842", next: "deliver", nextLabel: "🎉 Mark Delivered" },
  DELIVERED: { label: "Delivered",  icon: "🎉", color: "#57CC99", next: null,      nextLabel: null },
  FAILED:    { label: "Failed",     icon: "❌", color: "#E63946", next: null,      nextLabel: null },
};

/* ── Main Dashboard ──────────────────────────────────────────────────────── */
export default function DeliveryDashboard() {
  const navigate          = useNavigate();
  const { partner }       = useDeliveryAuth();
  const dApi              = useDeliveryApi();

  const [all,           setAll]           = useState([]);
  const [active,        setActive]        = useState(null);
  const [availability,  setAvailability]  = useState(partner?.availability || "OFFLINE");
  const [otpInput,      setOtpInput]      = useState("");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,         setError]         = useState("");
  const [riderCoords,   setRiderCoords]   = useState(null);
  const [tab,           setTab]           = useState("current"); // "current" | "history"
  const locationRef = useRef(null);
  const pollRef     = useRef(null);

  /* Load assignments */
  const load = useCallback(async () => {
    try {
      const res = await dApi("/delivery/partner/assignments");
      const data = res.data;
      setAll(data);
      const cur = data.find(a => ["ASSIGNED", "ACCEPTED", "PICKED_UP"].includes(a.status));
      setActive(cur || null);
    } catch { setError("Failed to load assignments"); }
    finally { setLoading(false); }
  }, [dApi]);

  useEffect(() => { load(); }, [load]);

  /* Poll every 15s */
  useEffect(() => {
    pollRef.current = setInterval(load, 15000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  /* GPS ping every 30s when online */
  useEffect(() => {
    const ping = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setRiderCoords(pos);
        if (availability === "ONLINE" || availability === "BUSY") {
          dApi("/delivery/partner/location", "patch", pos).catch(() => {});
        }
      }, () => {});
    };
    ping();
    locationRef.current = setInterval(ping, 30000);
    return () => clearInterval(locationRef.current);
  }, [availability, dApi]);

  /* Toggle availability */
  const toggleAvailability = async () => {
    const next = availability === "ONLINE" ? "OFFLINE" : "ONLINE";
    try {
      await dApi("/delivery/partner/availability", "patch", { availability: next });
      setAvailability(next);
      localStorage.setItem("fh_delivery_partner", JSON.stringify({ ...partner, availability: next }));
    } catch (e) { setError(e.response?.data?.error || "Failed to update"); }
  };

  /* Actions */
  const handleAction = async () => {
    if (!active) return;
    const step = STEP_MAP[active.status];
    if (!step?.next) return;
    setActionLoading(true); setError("");
    try {
      if (step.next === "accept") {
        await dApi(`/delivery/partner/assignments/${active.id}/accept`, "patch");
      } else if (step.next === "pickup") {
        await dApi(`/delivery/partner/assignments/${active.id}/pickup`, "patch",
          { lat: riderCoords?.lat, lng: riderCoords?.lng });
      } else if (step.next === "deliver") {
        if (!otpInput.trim()) { setError("Enter the 4-digit OTP from customer"); setActionLoading(false); return; }
        await dApi(`/delivery/partner/assignments/${active.id}/deliver`, "patch", { otp: otpInput.trim() });
        setOtpInput("");
      }
      await load();
    } catch (e) { setError(e.response?.data?.error || "Action failed"); }
    finally { setActionLoading(false); }
  };

  /* Logout */
  const handleLogout = async () => {
    try { await dApi("/delivery/auth/logout", "post"); } catch (_) {}
    localStorage.removeItem("fh_delivery_token");
    localStorage.removeItem("fh_delivery_partner");
    navigate("/delivery/login");
  };

  const delivered = all.filter(a => a.status === "DELIVERED");
  const todayCount = delivered.filter(a => {
    if (!a.deliveredAt) return false;
    return new Date(a.deliveredAt).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--charcoal)", borderBottom: "1px solid var(--border)",
        padding: "12px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--flame)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🛵</div>
          <div>
            <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "0.95rem", marginBottom: 1 }}>{partner?.name}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.72rem" }}>
              {partner?.vehicleType || "Bike"} · {partner?.vehicleNumber || "—"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Online/Offline toggle */}
          <button onClick={toggleAvailability} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 16px", borderRadius: 50, fontWeight: 700, fontSize: "0.82rem", transition: "all 0.2s",
            background: availability === "ONLINE" ? "rgba(87,204,153,0.15)" : "rgba(136,136,136,0.1)",
            color:      availability === "ONLINE" ? "#57CC99"               : "#888",
            border:     `1.5px solid ${availability === "ONLINE" ? "rgba(87,204,153,0.4)" : "var(--border)"}`,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: availability === "ONLINE" ? "#57CC99" : "#555", display: "inline-block" }}/>
            {availability === "ONLINE" ? "Online" : "Go Online"}
          </button>
          <button onClick={handleLogout} style={{
            background: "transparent", color: "var(--muted)", fontSize: "0.82rem",
            padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)",
          }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "18px 16px", maxWidth: 620, margin: "0 auto", width: "100%" }}>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 16, color: "#E63946", fontSize: "0.87rem" }}>
            {error} <button onClick={() => setError("")} style={{ float: "right", background: "none", color: "#E63946", fontWeight: 700 }}>×</button>
          </div>
        )}

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Today",  val: todayCount,                                                                  icon: "📦" },
            { label: "Total",  val: partner?.totalDeliveries || 0,                                               icon: "🎯" },
            { label: "Rating", val: (partner?.totalRatings || 0) > 0 ? `★${Number(partner.rating).toFixed(1)}` : "—", icon: "⭐" },
          ].map(({ label, val, icon }) => (
            <div key={label} className="card" style={{ padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{icon}</div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: 1 }}>{val}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.68rem" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab selector ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", background: "var(--charcoal)", borderRadius: 10, padding: 3, marginBottom: 18 }}>
          {[["current", "📍 Current Order"], ["history", `📋 History (${delivered.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
              background: tab === key ? "var(--flame)" : "transparent",
              color:      tab === key ? "#fff"         : "var(--muted)",
            }}>{label}</button>
          ))}
        </div>

        {/* ── Current Order tab ─────────────────────────────────────────── */}
        {tab === "current" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>⏳</div>
                <p>Loading assignments…</p>
              </div>
            ) : active ? (
              <div className="card fade-in" style={{ padding: 20 }}>

                {/* Status header */}
                {(() => {
                  const step  = STEP_MAP[active.status];
                  const order = active.order || {};
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <span style={{ fontSize: "1.8rem" }}>{step.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, color: step.color, fontSize: "1rem" }}>{step.label}</div>
                          <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Order #{order.id} · Assignment #{active.id}</div>
                        </div>
                      </div>

                      {/* Step progress */}
                      <StatusBar status={active.status} />

                      {/* Live map */}
                      <LiveMap
                        assignment={active}
                        riderLat={riderCoords?.lat}
                        riderLng={riderCoords?.lng}
                      />

                      {/* Order info */}
                      <div style={{ background: "var(--charcoal)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                          <div>
                            <p style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>📍 Pickup</p>
                            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>Flamehaus Kitchen</p>
                            <p style={{ fontSize: "0.76rem", color: "var(--muted)" }}>12 Jubilee Hills, Hyd</p>
                          </div>
                          <div>
                            <p style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>🏠 Deliver to</p>
                            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>{order.customerName}</p>
                            <p style={{ fontSize: "0.76rem", color: "var(--muted)" }}>📞 {order.customerPhone}</p>
                          </div>
                        </div>
                        {order.deliveryAddress && (
                          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                            <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: 3 }}>Drop address</p>
                            <p style={{ fontSize: "0.82rem" }}>{order.deliveryAddress}</p>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div style={{ background: "var(--charcoal)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.8rem" }}>
                        <span style={{ color: "var(--muted)" }}>Items: </span>
                        <span>{order.itemsSummary || "—"}</span>
                      </div>

                      {/* Delivery OTP (partner shows to customer) */}
                      {["ASSIGNED", "ACCEPTED"].includes(active.status) && active.deliveryOtp && (
                        <div style={{ marginBottom: 14, padding: "14px", background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 10, textAlign: "center" }}>
                          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8 }}>
                            🔐 Your Delivery OTP — share with customer on arrival
                          </p>
                          <p style={{ fontFamily: "monospace", fontSize: "2.4rem", fontWeight: 900, color: "var(--flame)", letterSpacing: 12 }}>
                            {active.deliveryOtp}
                          </p>
                        </div>
                      )}

                      {/* OTP input (customer gives to partner) */}
                      {active.status === "PICKED_UP" && (
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>
                            Enter 4-digit OTP from customer
                          </label>
                          <input
                            type="text" inputMode="numeric" maxLength={4}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                            placeholder="_ _ _ _"
                            style={{ width: "100%", fontSize: "2rem", letterSpacing: 14, textAlign: "center", padding: "12px 0" }}
                          />
                        </div>
                      )}

                      {/* Action button */}
                      {step.next && (
                        <button
                          onClick={handleAction}
                          disabled={actionLoading}
                          className="btn-primary"
                          style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: "1rem", opacity: actionLoading ? 0.7 : 1 }}
                        >
                          {actionLoading ? "Updating…" : step.nextLabel}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              /* No active order */
              <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>
                  {availability === "ONLINE" ? "⏳" : "😴"}
                </div>
                <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.2rem", marginBottom: 10 }}>
                  {availability === "ONLINE" ? "Waiting for orders…" : "You're Offline"}
                </h3>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {availability === "ONLINE"
                    ? "New orders will appear here automatically. Stay online!"
                    : "Toggle online above to start receiving delivery assignments."}
                </p>
                {availability !== "ONLINE" && (
                  <button onClick={toggleAvailability} className="btn-primary"
                    style={{ marginTop: 24, padding: "12px 32px" }}>
                    Go Online →
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── History tab ────────────────────────────────────────────────── */}
        {tab === "history" && (
          <>
            {delivered.length === 0 ? (
              <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
                <p style={{ color: "var(--muted)" }}>No deliveries yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {delivered.map((a) => (
                  <div key={a.id} className="card" style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>Order #{a.order?.id}</span>
                          <span style={{ fontSize: "0.7rem", background: "rgba(87,204,153,0.15)", color: "#57CC99", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>✓ Delivered</span>
                        </div>
                        <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: 2 }}>{a.order?.customerName}</p>
                        <p style={{ color: "var(--muted)", fontSize: "0.72rem" }}>
                          {a.deliveredAt ? new Date(a.deliveredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: 700, color: "var(--flame)", marginBottom: 4 }}>
                          ₹{(a.order?.total * 84 || 0).toFixed(0)}
                        </p>
                        {a.partnerRating ? (
                          <div>
                            <span style={{ color: "#F4C842", fontSize: "0.85rem" }}>{"★".repeat(a.partnerRating)}</span>
                            {a.ratingComment && <p style={{ color: "var(--muted)", fontSize: "0.7rem", marginTop: 2, maxWidth: 120, textAlign: "right" }}>{a.ratingComment}</p>}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Not rated</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
