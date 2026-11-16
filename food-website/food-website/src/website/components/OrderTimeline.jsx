const STEPS = [
  { key: "Pending",      icon: "📋", label: "Order Received",    desc: "We received your order and it's queued for the kitchen." },
  { key: "Preparing",    icon: "👨‍🍳", label: "Preparing",        desc: "Your order is being freshly prepared by our chefs." },
  { key: "On the Way",   icon: "🛵", label: "On the Way",        desc: "Your order has left the kitchen and is on its way!" },
  { key: "Delivered",    icon: "✅", label: "Delivered",          desc: "Order delivered. Enjoy your meal! 🔥" },
];

const ORDER_INDEX = { Pending: 0, Preparing: 1, "On the Way": 2, Delivered: 3 };

export default function OrderTimeline({ status, trackingNote }) {
  const current = ORDER_INDEX[status] ?? 0;

  return (
    <div style={{ padding: "4px 0" }}>
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        const future = i > current;
        const isLast = i === STEPS.length - 1;

        const dotColor = done ? "#57CC99" : active ? "var(--flame)" : "var(--border)";
        const lineColor = done ? "#57CC99" : "var(--border)";

        return (
          <div key={step.key} style={{ display: "flex", gap: 16, position: "relative" }}>
            {/* Left — dot + line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: done ? "#57CC99" : active ? "var(--flame)" : "var(--charcoal)",
                border: `2px solid ${dotColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", flexShrink: 0, transition: "all 0.4s",
                boxShadow: active ? "0 0 0 4px rgba(255,107,53,0.2)" : "none",
              }}>
                {done ? "✓" : step.icon}
              </div>
              {!isLast && (
                <div style={{ width: 2, flex: 1, minHeight: 24, background: lineColor, marginTop: 4, transition: "background 0.4s" }} />
              )}
            </div>

            {/* Right — text */}
            <div style={{ paddingBottom: isLast ? 0 : 24, paddingTop: 6, flex: 1 }}>
              <p style={{
                fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "0.95rem",
                color: future ? "var(--muted)" : "var(--white)",
                marginBottom: 4,
              }}>
                {step.label}
                {active && (
                  <span style={{ marginLeft: 8, fontSize: "0.7rem", fontWeight: 600,
                    background: "rgba(255,107,53,0.15)", color: "var(--flame)",
                    border: "1px solid rgba(255,107,53,0.3)", borderRadius: 20, padding: "2px 8px" }}>
                    Current
                  </span>
                )}
              </p>
              <p style={{ fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.5 }}>
                {active && trackingNote ? trackingNote : step.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
