import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PaymentSuccess() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const orderId    = params.get("orderId");
  const gateway    = params.get("gateway") || "Payment";
  const [show, setShow]       = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Fade-in
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Countdown → auto redirect to order detail
  useEffect(() => {
    if (!orderId) return;
    if (countdown <= 0) {
      navigate(`/orders/${orderId}`);
      return;
    }
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown, orderId, navigate]);

  return (
    <div style={{
      minHeight: "88vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "60px 5%",
      background: "radial-gradient(ellipse at center, rgba(87,204,153,0.09), transparent 65%)",
    }}>
      <div style={{
        textAlign: "center", maxWidth: 520,
        opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>
        {/* Animated checkmark */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 28 }}>
          <div style={{
            width: 104, height: 104, borderRadius: "50%",
            background: "rgba(87,204,153,0.12)",
            border: "2px solid rgba(87,204,153,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
          }}>
            <div style={{
              width: 74, height: 74, borderRadius: "50%", background: "#57CC99",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem",
            }}>✓</div>
          </div>
          <div style={{
            position: "absolute", inset: -8, borderRadius: "50%",
            border: "2px solid rgba(87,204,153,0.2)",
            animation: "pulse-ring 2s ease infinite",
          }} />
        </div>

        <style>{`
          @keyframes pulse-ring {
            0%   { transform: scale(1);   opacity: 0.8; }
            100% { transform: scale(1.35); opacity: 0; }
          }
        `}</style>

        <span style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20,
          background: "rgba(87,204,153,0.12)", border: "1px solid rgba(87,204,153,0.25)",
          color: "#57CC99", fontSize: "0.75rem", fontWeight: 700,
          letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20,
        }}>
          Payment Confirmed
        </span>

        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "2.6rem", marginBottom: 14 }}>
          You're all set! 🔥
        </h1>

        <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.7, marginBottom: 10 }}>
          Payment via <span style={{ color: "#57CC99", fontWeight: 600 }}>{gateway}</span> was
          successful. Your order is confirmed and being prepared.
          {" "}A confirmation SMS has been sent to your registered mobile number.
        </p>

        {orderId && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 8 }}>
            Order <span style={{ color: "var(--flame)", fontWeight: 700 }}>#{orderId}</span>
          </p>
        )}

        {/* Countdown */}
        {orderId && (
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 32 }}>
            Redirecting to order details in{" "}
            <span style={{
              color: "#57CC99", fontWeight: 700, fontSize: "1rem",
              display: "inline-block", minWidth: 18, textAlign: "center",
            }}>{countdown}</span>
            {" "}second{countdown !== 1 ? "s" : ""}…
          </p>
        )}

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 36 }}>
          {[
            { icon: "📱", label: "SMS Sent",     sub: "To your mobile" },
            { icon: "👨‍🍳", label: "Preparing",   sub: "Kitchen is on it" },
            { icon: "🛵", label: "Delivery",     sub: "25–30 minutes" },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="card" style={{ padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>{icon}</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>{label}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {orderId && (
            <Link to={`/orders/${orderId}`} className="btn-primary" style={{ padding: "13px 32px" }}>
              🛵 Track My Order
            </Link>
          )}
          <Link to="/menu" className="btn-outline" style={{ padding: "13px 32px" }}>
            Order More
          </Link>
        </div>
      </div>
    </div>
  );
}
