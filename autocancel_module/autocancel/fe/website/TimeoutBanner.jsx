/**
 * TimeoutBanner — shown on OrderDetail page when order is in delivery
 * and approaching or past the 2-hour SLA.
 * Props: assignedAt (ISO datetime string from assignment)
 */
import { useState, useEffect } from "react";

export default function TimeoutBanner({ assignedAt }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (!assignedAt) return;
    const update = () => {
      setMins(Math.floor((Date.now() - new Date(assignedAt).getTime()) / 60000));
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [assignedAt]);

  if (!assignedAt) return null;
  const left = 120 - mins;

  if (left > 30) return null; // no banner needed yet

  if (left <= 0) return (
    <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:"1.4rem" }}>🚨</span>
        <div>
          <p style={{ color:"#E63946", fontWeight:700, marginBottom:4 }}>Delivery overdue — auto-cancellation pending</p>
          <p style={{ color:"var(--muted)", fontSize:"0.84rem" }}>
            Your order has exceeded the 2-hour delivery window. It will be automatically cancelled within the next few minutes and a full refund will be initiated to your original payment method (5–7 business days).
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:"rgba(244,200,66,0.08)", border:"1px solid rgba(244,200,66,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:"1.4rem" }}>⚠️</span>
        <div>
          <p style={{ color:"#F4C842", fontWeight:700, marginBottom:4 }}>Delivery running late — {left} minute{left!==1?"s":""} remaining</p>
          <p style={{ color:"var(--muted)", fontSize:"0.84rem" }}>
            If not delivered within {left} minute{left!==1?"s":""}, your order will be automatically cancelled and fully refunded.
          </p>
        </div>
      </div>
      <div style={{ marginTop:10, height:4, background:"var(--charcoal)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:2, background:"#F4C842", width:`${Math.round((120-left)/1.2)}%`, transition:"width 1s" }}/>
      </div>
    </div>
  );
}