import { useState } from "react";

const SMS_EVENTS = [
  { key: "orderPlaced",       label: "Order Placed",          icon: "📦", desc: "Sent to customer when they place an order" },
  { key: "orderPreparing",    label: "Order Preparing",        icon: "👨‍🍳", desc: "Sent when kitchen starts preparing" },
  { key: "orderOnTheWay",     label: "Order On the Way",       icon: "🛵", desc: "Sent when rider picks up the order" },
  { key: "orderDelivered",    label: "Order Delivered",        icon: "✅", desc: "Sent when order is delivered" },
  { key: "paymentSuccess",    label: "Payment Confirmed",      icon: "💳", desc: "Sent when payment is verified" },
  { key: "paymentFailed",     label: "Payment Failed",         icon: "❌", desc: "Sent when payment fails" },
  { key: "welcomeSms",        label: "Customer Welcome",       icon: "👋", desc: "Sent when a customer registers" },
  { key: "adminOrderAlert",   label: "Admin New Order Alert",  icon: "🔔", desc: "Sent to admin when new order arrives" },
];

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: "40px 36px" }}>
      <div style={{ marginBottom: 36 }}>
        <div className="section-label">Configuration</div>
        <h1 style={{ fontSize: "2rem" }}>Settings</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>
          SMS gateway and notification configuration
        </p>
      </div>

      {/* Twilio Config */}
      <div className="card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,107,53,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>📱</div>
          <div>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem", marginBottom: 2 }}>Twilio SMS Gateway</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Configure in <code style={{ background: "var(--charcoal)", padding: "2px 6px", borderRadius: 4, fontSize: "0.78rem" }}>application.properties</code></p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { label: "twilio.account.sid", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
            { label: "twilio.auth.token",  placeholder: "Your auth token" },
            { label: "twilio.from.number", placeholder: "+1XXXXXXXXXX" },
            { label: "twilio.sms.enabled", placeholder: "true / false" },
          ].map(({ label, placeholder }) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6, fontFamily: "monospace" }}>
                {label}
              </label>
              <input type="text" placeholder={placeholder} disabled
                style={{ width: "100%", opacity: 0.5, cursor: "not-allowed" }} />
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(76,201,240,0.08)", border: "1px solid rgba(76,201,240,0.2)", borderRadius: 10, padding: "14px 18px", fontSize: "0.85rem", color: "#4CC9F0" }}>
          💡 Edit <strong>src/main/resources/application.properties</strong> and restart the backend to apply changes.
          Get your Twilio credentials at <strong>console.twilio.com</strong>
        </div>
      </div>

      {/* SMS Events */}
      <div className="card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem", marginBottom: 6 }}>SMS Notification Events</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 24 }}>
          These SMS messages are sent automatically when events occur. Toggle visibility is for reference — actual control is via <code style={{ background: "var(--charcoal)", padding: "2px 5px", borderRadius: 4, fontSize: "0.78rem" }}>twilio.sms.enabled</code>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SMS_EVENTS.map(({ key, label, icon, desc }) => (
            <div key={key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", background: "var(--charcoal)", borderRadius: 10,
              border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: "1.3rem" }}>{icon}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{label}</p>
                  <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{desc}</p>
                </div>
              </div>
              <div style={{
                padding: "4px 12px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                background: "rgba(87,204,153,0.12)", color: "#57CC99",
                border: "1px solid rgba(87,204,153,0.25)",
              }}>Active</div>
            </div>
          ))}
        </div>
      </div>

      {/* SMS templates */}
      <div className="card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem", marginBottom: 6 }}>Message Templates</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }}>
          Modify these in <code style={{ background: "var(--charcoal)", padding: "2px 6px", borderRadius: 4, fontSize: "0.78rem" }}>SmsService.java</code>
        </p>

        {[
          { event: "Order Placed", template: "Hi {name}! 🔥 Your Flamehaus order #{id} has been placed. Total: ₹{total}. Track: flamehaus.in/orders/{id}" },
          { event: "On the Way",   template: "Hi {name}! 🛵 Your Flamehaus order #{id} is on the way! ETA: {eta}. Get ready!" },
          { event: "Delivered",    template: "Hi {name}! ✅ Order #{id} delivered. Enjoy your meal! Rate us: flamehaus.in/orders/{id}" },
          { event: "Payment OK",   template: "Hi {name}! 💳 Payment of ₹{amount} confirmed via {gateway} for order #{id}." },
        ].map(({ event, template }) => (
          <div key={event} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--flame)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {event}
            </label>
            <div style={{ background: "var(--charcoal)", borderRadius: 8, padding: "12px 14px", fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.6, fontFamily: "monospace", border: "1px solid var(--border)" }}>
              {template}
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ padding: "12px 32px" }}>
        {saved ? "✓ Saved" : "Save Settings"}
      </button>
    </div>
  );
}
