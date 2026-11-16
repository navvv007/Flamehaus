import { useState, useEffect } from "react";
import api from "../../api/apiClient";

const RESTAURANT = { lat: 17.4326, lng: 78.4071, name: "Flamehaus Kitchen" };

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function SVGMap({ partners, orders, W = 700, H = 340 }) {
  const allPts = [
    RESTAURANT,
    ...partners.filter(p => p.currentLat).map(p => ({ lat: p.currentLat, lng: p.currentLng })),
    ...orders.filter(o => o.deliveryLat).map(o => ({ lat: o.deliveryLat, lng: o.deliveryLng })),
  ];
  if (allPts.length < 2) return (
    <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
      No partner GPS data yet — partners need to share location while online
    </div>
  );

  const lats = allPts.map(p => p.lat), lngs = allPts.map(p => p.lng);
  const PAD = 40;
  const minLat = Math.min(...lats)-0.01, maxLat = Math.max(...lats)+0.01;
  const minLng = Math.min(...lngs)-0.01, maxLng = Math.max(...lngs)+0.01;
  const proj = (lat, lng) => ({
    x: PAD + ((lng-minLng)/((maxLng-minLng)||0.001))*(W-PAD*2),
    y: PAD + ((maxLat-lat)/((maxLat-minLat)||0.001))*(H-PAD*2),
  });

  const rPt = proj(RESTAURANT.lat, RESTAURANT.lng);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ borderRadius: 10, background: "#0d1520" }}>
      {/* Grid */}
      {[...Array(6)].map((_,i) => <line key={`h${i}`} x1={0} y1={(H/6)*i} x2={W} y2={(H/6)*i} stroke="#151f2e" strokeWidth={1}/>)}
      {[...Array(9)].map((_,i) => <line key={`v${i}`} x1={(W/9)*i} y1={0} x2={(W/9)*i} y2={H} stroke="#151f2e" strokeWidth={1}/>)}

      {/* Lines from restaurant to each active order */}
      {orders.filter(o => o.deliveryLat).map(o => {
        const oPt = proj(o.deliveryLat, o.deliveryLng);
        return <line key={`ol${o.id}`} x1={rPt.x} y1={rPt.y} x2={oPt.x} y2={oPt.y} stroke="rgba(255,107,53,0.2)" strokeWidth={1.5} strokeDasharray="4 4"/>;
      })}

      {/* Lines from partners to restaurant */}
      {partners.filter(p => p.currentLat).map(p => {
        const pPt = proj(p.currentLat, p.currentLng);
        return <line key={`pl${p.id}`} x1={pPt.x} y1={pPt.y} x2={rPt.x} y2={rPt.y} stroke="rgba(76,201,240,0.15)" strokeWidth={1}/>;
      })}

      {/* Active orders (drop points) */}
      {orders.filter(o => o.deliveryLat).map(o => {
        const pt = proj(o.deliveryLat, o.deliveryLng);
        return (
          <g key={`o${o.id}`}>
            <circle cx={pt.x} cy={pt.y} r={12} fill="#57CC99" fillOpacity={0.15} stroke="#57CC99" strokeWidth={1}/>
            <text x={pt.x} y={pt.y+5} textAnchor="middle" fontSize={11}>🏠</text>
            <text x={pt.x} y={pt.y+22} textAnchor="middle" fontSize={9} fill="#57CC99">#{o.id}</text>
          </g>
        );
      })}

      {/* Restaurant */}
      <circle cx={rPt.x} cy={rPt.y} r={18} fill="#FF6B35" fillOpacity={0.15} stroke="#FF6B35" strokeWidth={2}/>
      <text x={rPt.x} y={rPt.y+5} textAnchor="middle" fontSize={14}>🔥</text>
      <text x={rPt.x} y={rPt.y+28} textAnchor="middle" fontSize={9} fill="#FF6B35">Kitchen</text>

      {/* Partners */}
      {partners.filter(p => p.currentLat).map(p => {
        const pt  = proj(p.currentLat, p.currentLng);
        const col = p.availability === "BUSY" ? "#F4C842" : "#4CC9F0";
        const km  = haversineKm(RESTAURANT.lat, RESTAURANT.lng, p.currentLat, p.currentLng).toFixed(1);
        return (
          <g key={`p${p.id}`}>
            <circle cx={pt.x} cy={pt.y} r={14} fill={col} fillOpacity={0.12} stroke={col} strokeWidth={1.5}>
              {p.availability === "ONLINE" && <animate attributeName="r" values="11;15;11" dur="2s" repeatCount="indefinite"/>}
            </circle>
            <circle cx={pt.x} cy={pt.y} r={10} fill="#0f172a" stroke={col} strokeWidth={2}/>
            <text x={pt.x} y={pt.y+4} textAnchor="middle" fontSize={10}>🛵</text>
            <text x={pt.x} y={pt.y+24} textAnchor="middle" fontSize={8} fill={col}>{p.name.split(" ")[0]}</text>
            <text x={pt.x} y={pt.y+34} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.4)">{km}km</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminDeliveryMap() {
  const [partners,  setPartners]  = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  const token = localStorage.getItem("fh_admin_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        api.get("/delivery/admin/partners", cfg),
        api.get("/delivery/admin/assignments", cfg),
      ]);
      setPartners(pRes.data.filter(p => p.status === "ACTIVE"));
      // Active orders with GPS
      const activeOrders = aRes.data
        .filter(a => ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status) && a.order?.deliveryLat)
        .map(a => ({ ...a.order, assignmentStatus: a.status, partnerName: a.partner?.name }));
      setOrders(activeOrders);
    } catch(_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const online = partners.filter(p => p.availability === "ONLINE").length;
  const busy   = partners.filter(p => p.availability === "BUSY").length;
  const withGps= partners.filter(p => p.currentLat).length;

  return (
    <div style={{ padding: "40px 36px" }}>
      <div style={{ marginBottom: 28 }}>
        <div className="section-label">Live Operations</div>
        <h1 style={{ fontSize: "2rem" }}>Delivery Partner Map</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 4 }}>
          Real-time locations · updates every 30 seconds · nearest partner auto-assigned
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label:"Online",    value:online,   icon:"🟢", color:"#57CC99" },
          { label:"Busy",      value:busy,     icon:"🟡", color:"#F4C842" },
          { label:"With GPS",  value:withGps,  icon:"📡", color:"#4CC9F0" },
          { label:"Active Orders", value:orders.length, icon:"📦", color:"var(--flame)" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{icon}</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color }}>{value}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>Live Map</span>
          <div style={{ display: "flex", gap: 16, fontSize: "0.75rem" }}>
            <span>🔥 Kitchen</span>
            <span style={{ color: "#4CC9F0" }}>🛵 Online</span>
            <span style={{ color: "#F4C842" }}>🛵 Busy</span>
            <span style={{ color: "#57CC99" }}>🏠 Drop point</span>
          </div>
        </div>
        <SVGMap partners={partners} orders={orders} />
      </div>

      {/* Partner list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "0.88rem" }}>
          Partner Locations
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
        ) : partners.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No active partners</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)" }}>
                {["Partner","Status","GPS","Distance from Kitchen","Last Update"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partners.map((p, i) => {
                const dist = p.currentLat
                  ? haversineKm(RESTAURANT.lat, RESTAURANT.lng, p.currentLat, p.currentLng).toFixed(2)
                  : null;
                const lastUpdate = p.locationUpdatedAt
                  ? Math.floor((Date.now() - new Date(p.locationUpdatedAt).getTime()) / 60000)
                  : null;
                return (
                  <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>{p.name}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{p.vehicleType} · {p.vehicleNumber}</p>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                        background: p.availability==="ONLINE" ? "rgba(87,204,153,0.15)"
                                  : p.availability==="BUSY"   ? "rgba(244,200,66,0.15)"
                                  : "rgba(136,136,136,0.1)",
                        color: p.availability==="ONLINE" ? "#57CC99"
                             : p.availability==="BUSY"   ? "#F4C842"
                             : "#888",
                      }}>{p.availability}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.82rem" }}>
                      {p.currentLat
                        ? <span style={{ color: "#4CC9F0" }}>📡 {Number(p.currentLat).toFixed(4)}, {Number(p.currentLng).toFixed(4)}</span>
                        : <span style={{ color: "var(--muted)" }}>No GPS</span>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>
                      {dist ? <span>{dist} km</span> : <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "var(--muted)" }}>
                      {lastUpdate !== null ? `${lastUpdate}m ago` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}