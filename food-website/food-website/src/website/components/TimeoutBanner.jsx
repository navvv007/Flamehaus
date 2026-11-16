import { useState, useEffect, useRef } from "react";
import api from "../../api/apiClient";

const LIVE_ORDER_STATUSES = ["Preparing", "On the Way"];

/**
 * Shows a warning when a delivery is close to (or past) the time limit.
 * Reads the deadline from the SERVER and corrects for any clock difference,
 * so a wrong phone clock cannot show the wrong time.
 */
export default function TimeoutBanner({ orderId, orderStatus }) {
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(Date.now());
  const offsetRef = useRef(0);   // server time minus browser time

  useEffect(() => {
    if (!LIVE_ORDER_STATUSES.includes(orderStatus)) { setTimer(null); return; }
    let alive = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("fh_customer_token");
        const r = await api.get(`/customer/orders/${orderId}/delivery-timer`, { headers: { Authorization: `Bearer ${token}` } });
        if (!alive) return;
        offsetRef.current = new Date(r.data.serverNow).getTime() - Date.now();
        setTimer(r.data);
      } catch (_) { /* the banner is optional - fail quietly */ }
    };
    load();
    const poll = setInterval(load, 60000);
    return () => { alive = false; clearInterval(poll); };
  }, [orderId, orderStatus]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  if (!timer || !timer.active) return null;

  const remainingMs = new Date(timer.deadline).getTime() - (now + offsetRef.current);
  const left = Math.ceil(remainingMs / 60000);
  const total = timer.timeoutMinutes;
  if (left > timer.warningMinutes) return null;

  if (left <= 0) return (
    <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
      <p style={{ color: "#E63946", fontWeight: 700, marginBottom: 4 }}>🚨 Delivery is overdue</p>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        This order missed its {total >= 60 && total % 60 === 0 ? `${total / 60}-hour` : `${total}-minute`} delivery limit. It will be cancelled automatically within a minute or two
        and you will receive a <strong>full refund</strong> to your original payment method (5–7 business days).
      </p>
    </div>
  );

  const pct = Math.max(0, Math.min(100, Math.round(((total - left) / total) * 100)));
  return (
    <div style={{ background: "rgba(244,200,66,0.08)", border: "1px solid rgba(244,200,66,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
      <p style={{ color: "#F4C842", fontWeight: 700, marginBottom: 4 }}>⚠️ Delivery is running late — {left} minute{left === 1 ? "" : "s"} left</p>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        If your order is not delivered in time it will be cancelled automatically and <strong>fully refunded</strong>.
      </p>
      <div style={{ marginTop: 10, height: 4, background: "var(--charcoal)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#F4C842", borderRadius: 2 }} />
      </div>
    </div>
  );
}
