import { useState, useEffect } from "react";
import api from "../../api/apiClient";

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmt = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export default function RefundStatusCard({ orderId }) {
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("fh_customer_token");
    if (!token) return;
    api.get(`/customer/orders/${orderId}/refund-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setD(r.data))
      .catch(() => setFailed(true));
  }, [orderId]);

  if (failed || !d) return null;

  const auto = d.cancelledBy === "SYSTEM";
  const rs = d.refundStatus;
  const paid = rs !== "NOT_APPLICABLE";

  // 3 simple steps; how many are "done" depends on the refund state
  const steps = [
    { label: "Order cancelled", done: true, sub: fmt(d.cancelledAt) },
    { label: "Refund started", done: paid && (rs === "INITIATED" || rs === "COMPLETED"), sub: fmt(d.refundInitiatedAt) },
    { label: "Money back in your account", done: rs === "COMPLETED", sub: `within ${d.expectedCredit}` },
  ];

  let headline, tone;
  if (!paid)                  { headline = "No payment was taken, so there is nothing to refund."; tone = "#888"; }
  else if (rs === "COMPLETED") { headline = `Your refund of ${inr(d.refundAmountInr)} is complete.`; tone = "#57CC99"; }
  else if (rs === "INITIATED") { headline = `Your refund of ${inr(d.refundAmountInr)} has been started.`; tone = "#57CC99"; }
  else                         { headline = `Your refund of ${inr(d.refundAmountInr)} is being processed by our team.`; tone = "#F4C842"; }

  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 20, borderColor: tone + "55" }}>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>💰 Cancellation & refund</p>
      <p style={{ fontWeight: 700, color: tone, marginBottom: 6 }}>{headline}</p>
      {auto && <p style={{ color: "var(--muted)", fontSize: "0.84rem", marginBottom: 8 }}>This order was cancelled automatically because it was not delivered within the time limit. We are sorry for the delay.</p>}
      {!auto && d.reason && <p style={{ color: "var(--muted)", fontSize: "0.84rem", marginBottom: 8 }}>Reason: {d.reason}</p>}

      {paid && (
        <div style={{ marginTop: 10 }}>
          {steps.map((s, i) => (
            <div key={s.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem",
                             background: s.done ? "rgba(87,204,153,0.2)" : "var(--charcoal)", border: `1.5px solid ${s.done ? "#57CC99" : "var(--border)"}`, color: s.done ? "#57CC99" : "var(--muted)" }}>
                {s.done ? "✓" : i + 1}
              </span>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: s.done ? "var(--white)" : "var(--muted)" }}>{s.label}</p>
                {s.sub && <p style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{s.sub}</p>}
              </div>
            </div>
          ))}
          {d.refundId && <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 6 }}>Reference: {d.refundId}{d.refundGateway ? ` (${d.refundGateway})` : ""}</p>}
        </div>
      )}
    </div>
  );
}
