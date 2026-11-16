import { useState, useEffect } from "react";

export default function TimeoutBanner({ assignedAt }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (!assignedAt) return;
    const calc = () => setMins(Math.floor((Date.now() - new Date(assignedAt).getTime()) / 60000));
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [assignedAt]);

  if (!assignedAt) return null;
  const left = 120 - mins;
  if (left > 30) return null;

  if (left <= 0) return (
    <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:"1.4rem" }}>🚨</span>
        <div>
          <p style={{ color:"#E63946", fontWeight:700, marginBottom:4 }}>Delivery overdue — auto-cancellation pending</p>
          <p style={{ color:"var(--muted)", fontSize:"0.84rem" }}>
            Your order exceeded the 2-hour delivery window and will be automatically cancelled shortly.
            A <strong>full refund</strong> will be credited to your original payment method within <strong>5–7 business days</strong>.
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
          <p style={{ color:"#F4C842", fontWeight:700, marginBottom:4 }}>
            Delivery running late — {left} minute{left!==1?"s":""} remaining
          </p>
          <p style={{ color:"var(--muted)", fontSize:"0.84rem" }}>
            If not delivered within {left} minute{left!==1?"s":""}, your order will be automatically cancelled and <strong>fully refunded</strong>.
          </p>
        </div>
      </div>
      <div style={{ marginTop:10, height:4, background:"var(--charcoal)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:2, background:"#F4C842", width:`${Math.round(mins/1.2)}%`, transition:"width 1s" }}/>
      </div>
    </div>
  );
}