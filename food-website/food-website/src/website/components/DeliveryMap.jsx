import { useEffect, useRef, useState } from "react";

// Restaurant coords — Jubilee Hills, Hyderabad
const RESTAURANT = { lat: 17.4326, lng: 78.4071 };

// Fallback delivery coords (Banjara Hills, Hyderabad) when geolocation unavailable
const DEFAULT_DELIVERY = { lat: 17.4156, lng: 78.4347 };

const STATUS_PROGRESS = {
  "Pending":    0,
  "Preparing":  0,
  "On the Way": 0.55,
  "Delivered":  1,
};

function project(lat, lng, bounds, w, h, pad = 52) {
  const lngRange = bounds.maxLng - bounds.minLng || 0.001;
  const latRange = bounds.maxLat - bounds.minLat || 0.001;
  const x = pad + ((lng - bounds.minLng) / lngRange) * (w - pad * 2);
  const y = pad + ((bounds.maxLat - lat) / latRange) * (h - pad * 2);
  return { x, y };
}

function getBounds(pts) {
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad  = 0.02;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export default function DeliveryMap({ order, width = 680, height = 310 }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const fromRef = useRef(0);

  const status = order?.status || "Pending";
  const target = STATUS_PROGRESS[status] ?? 0;

  // Safely parse coords — JSON may give null, undefined, or a valid number
  const rawLat = order?.deliveryLat;
  const rawLng = order?.deliveryLng;
  const dLat   = (rawLat != null && isFinite(rawLat)) ? Number(rawLat) : DEFAULT_DELIVERY.lat;
  const dLng   = (rawLng != null && isFinite(rawLng)) ? Number(rawLng) : DEFAULT_DELIVERY.lng;

  const bounds = getBounds([RESTAURANT, { lat: dLat, lng: dLng }]);
  const rPt    = project(RESTAURANT.lat, RESTAURANT.lng, bounds, width, height);
  const dPt    = project(dLat, dLng, bounds, width, height);

  // Quadratic bezier control point (arcs the route upward)
  const ctrlX = (rPt.x + dPt.x) / 2;
  const ctrlY = Math.min(rPt.y, dPt.y) - Math.max(50, Math.abs(dPt.x - rPt.x) * 0.4);
  const road  = `M ${rPt.x} ${rPt.y} Q ${ctrlX} ${ctrlY} ${dPt.x} ${dPt.y}`;

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = fromRef.current;
    const to   = target;
    if (Math.abs(to - from) < 0.005) { setProgress(to); fromRef.current = to; return; }

    let startTs = null;
    const DURATION = 2200;

    const animate = (ts) => {
      if (!startTs) startTs = ts;
      const raw = Math.min((ts - startTs) / DURATION, 1);
      // Ease in-out cubic
      const e = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      const val = from + (to - from) * e;
      setProgress(val);
      fromRef.current = val;
      if (raw < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]); // eslint-disable-line

  const riderPos  = lerp(rPt, dPt, progress);
  const moving    = status === "On the Way";
  const delivered = status === "Delivered";
  const waiting   = status === "Pending" || status === "Preparing";

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", background: "#0d1520" }}>
      {/* Header */}
      <div style={{
        padding: "12px 18px", background: "rgba(0,0,0,0.5)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>🗺 Live Delivery Map</span>
        <span style={{
          fontSize: "0.75rem", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 7,
          color: moving ? "#4CC9F0" : delivered ? "#57CC99" : "var(--muted)",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: moving ? "#4CC9F0" : delivered ? "#57CC99" : "#444",
            boxShadow: moving ? "0 0 0 3px rgba(76,201,240,0.25)" : "none",
            display: "inline-block",
          }} />
          {moving ? "En Route" : delivered ? "Delivered ✓" : waiting ? "Awaiting Dispatch" : "—"}
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {/* City grid background */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(height / 8) * i} x2={width} y2={(height / 8) * i}
            stroke="#151f2e" strokeWidth={1} />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={(width / 11) * i} y1={0} x2={(width / 11) * i} y2={height}
            stroke="#151f2e" strokeWidth={1} />
        ))}

        {/* Road shadow */}
        <path d={road} fill="none" stroke="#1e2d42" strokeWidth={12} strokeLinecap="round" />
        {/* Road surface */}
        <path d={road} fill="none" stroke="#263548" strokeWidth={6} strokeLinecap="round" />
        {/* Road dashes */}
        <path d={road} fill="none" stroke="#3a506b" strokeWidth={2}
          strokeDasharray="10 8" strokeLinecap="round" />

        {/* Travelled portion glow */}
        {progress > 0.02 && (
          <path d={road} fill="none" stroke="#4CC9F0" strokeWidth={4} strokeLinecap="round"
            strokeDasharray={`${progress * 1200} 1300`} opacity={0.6} />
        )}

        {/* ── Restaurant pin ─────────────────────────── */}
        <circle cx={rPt.x} cy={rPt.y} r={24} fill="rgba(255,107,53,0.1)"
          stroke="rgba(255,107,53,0.3)" strokeWidth={1.5} />
        <circle cx={rPt.x} cy={rPt.y} r={15} fill="#FF6B35" />
        <text x={rPt.x} y={rPt.y + 6} textAnchor="middle" fontSize={14}>🔥</text>
        {/* Label */}
        <rect x={rPt.x - 58} y={rPt.y + 29} width={116} height={20} rx={6}
          fill="rgba(255,107,53,0.85)" />
        <text x={rPt.x} y={rPt.y + 43} textAnchor="middle" fontSize={10}
          fontWeight="700" fill="#fff" fontFamily="Inter,sans-serif">
          Flamehaus Kitchen
        </text>

        {/* ── Delivery pin ───────────────────────────── */}
        <circle cx={dPt.x} cy={dPt.y} r={24}
          fill={delivered ? "rgba(87,204,153,0.12)" : "rgba(76,201,240,0.1)"}
          stroke={delivered ? "rgba(87,204,153,0.35)" : "rgba(76,201,240,0.25)"} strokeWidth={1.5} />
        <circle cx={dPt.x} cy={dPt.y} r={15} fill={delivered ? "#57CC99" : "#4CC9F0"} />
        <text x={dPt.x} y={dPt.y + 6} textAnchor="middle" fontSize={14}>
          {delivered ? "✓" : "🏠"}
        </text>
        <rect x={dPt.x - 42} y={dPt.y + 29} width={84} height={20} rx={6}
          fill={delivered ? "rgba(87,204,153,0.85)" : "rgba(76,201,240,0.85)"} />
        <text x={dPt.x} y={dPt.y + 43} textAnchor="middle" fontSize={10}
          fontWeight="700" fill="#fff" fontFamily="Inter,sans-serif">
          {delivered ? "Delivered!" : "Your Door"}
        </text>

        {/* ── Rider ──────────────────────────────────── */}
        {progress > 0.02 && !delivered && (
          <g>
            {moving && (
              <circle cx={riderPos.x} cy={riderPos.y} r={18}
                fill="rgba(76,201,240,0.08)" stroke="rgba(76,201,240,0.2)" strokeWidth={1}>
                <animate attributeName="r" values="15;22;15" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={riderPos.x} cy={riderPos.y} r={14}
              fill="#0f172a" stroke={moving ? "#4CC9F0" : "#888"} strokeWidth={2} />
            <text x={riderPos.x} y={riderPos.y + 6} textAnchor="middle" fontSize={14}>🛵</text>
          </g>
        )}
      </svg>

      {/* Footer — coords info */}
      <div style={{
        padding: "9px 18px", borderTop: "1px solid var(--border)",
        background: "rgba(0,0,0,0.3)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: "0.72rem", color: "#3a506b", fontFamily: "monospace" }}>
          📍 {dLat.toFixed(4)}, {dLng.toFixed(4)}
        </span>
        <span style={{ fontSize: "0.72rem", color: "#3a506b" }}>
          {rawLat != null ? "GPS location" : "Default location"}
        </span>
      </div>
    </div>
  );
}
