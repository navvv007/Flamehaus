import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PaymentFailed() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const orderId   = params.get("orderId");
  const reason    = params.get("reason") || "Payment was not completed.";
  const gateway   = params.get("gateway") || "";
  const [show, setShow]         = useState(false);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Countdown → auto redirect to order detail (so they can retry from there)
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
      background: "radial-gradient(ellipse at center, rgba(230,57,70,0.07), transparent 65%)",
    }}>
      <div style={{
        textAlign: "center", maxWidth: 520,
        opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>
        {/* X circle */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 28 }}>
          <div style={{
            width: 104, height: 104, borderRadius: "50%",
            background: "rgba(230,57,70,0.1)", border: "2px solid rgba(230,57,70,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
          }}>
            <div style={{
              width: 74, height: 74, borderRadius: "50%", background: "#E63946",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", fontWeight: 700, color: "#fff",
            }}>✕</div>
          </div>
        </div>

        <span style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20,
          background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)",
          color: "#E63946", fontSize: "0.75rem", fontWeight: 700,
          letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20,
        }}>
          Payment Failed
        </span>

        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "2.4rem", marginBottom: 14 }}>
          Something went wrong
        </h1>

        <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.7, marginBottom: 10 }}>
          {reason}
        </p>

        {orderId && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 8 }}>
            Order <span style={{ color: "var(--flame)", fontWeight: 700 }}>#{orderId}</span> — no
            charge was made.{" "}
            {gateway && (
              <span>A notification has been sent to your registered mobile number.</span>
            )}
          </p>
        )}

        {/* Countdown */}
        {orderId && (
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 28 }}>
            Redirecting to order details in{" "}
            <span style={{
              color: "#E63946", fontWeight: 700, fontSize: "1rem",
              display: "inline-block", minWidth: 18, textAlign: "center",
            }}>{countdown}</span>
            {" "}second{countdown !== 1 ? "s" : ""}…
          </p>
        )}

        {/* Tips card */}
        <div className="card" style={{
          padding: "18px 22px", marginBottom: 32,
          borderColor: "rgba(230,57,70,0.2)", textAlign: "left",
        }}>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            What to try
          </p>
          {[
            "Check your card details and try again",
            "Try a different payment method (Razorpay / Stripe)",
            "Ensure your card has sufficient balance",
            "Contact your bank if the issue persists",
          ].map((tip) => (
            <div key={tip} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "#E63946", fontSize: "0.8rem", marginTop: 2 }}>→</span>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {orderId && (
            <Link to={`/payment/${orderId}`} className="btn-primary" style={{ padding: "13px 32px" }}>
              🔄 Try Again
            </Link>
          )}
          {orderId && (
            <Link to={`/orders/${orderId}`} className="btn-outline" style={{ padding: "13px 32px" }}>
              View Order
            </Link>
          )}
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 24 }}>
          Need help?{" "}
          <span style={{ color: "var(--flame)" }}>support@flamehaus.in</span>
        </p>
      </div>
    </div>
  );
}
