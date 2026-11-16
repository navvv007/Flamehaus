export default function About() {
  const team = [
    { name: "Arjun Mehta", role: "Head Chef", emoji: "👨‍🍳", fact: "12 years in Michelin-starred kitchens across London & Paris" },
    { name: "Priya Nair", role: "Pastry Chef", emoji: "👩‍🍳", fact: "Former MasterChef finalist, dessert specialist" },
    { name: "Rohan Kapoor", role: "Founder & CEO", emoji: "🧑‍💼", fact: "Food entrepreneur, ex-IIM Hyderabad" },
    { name: "Sneha Reddy", role: "Operations", emoji: "👩‍💼", fact: "Ensures every order arrives hot and on time" },
  ];

  const values = [
    { emoji: "🌿", title: "Locally Sourced", desc: "95% of our ingredients are sourced from Telangana farmers and local producers." },
    { emoji: "🔥", title: "Live Fire Cooking", desc: "We use traditional charcoal grills and open flames — no shortcuts, ever." },
    { emoji: "⚡", title: "30-Min Promise", desc: "Your food, hot and fresh, in under 30 minutes. Or your next order is free." },
    { emoji: "♻️", title: "Zero Waste", desc: "Fully compostable packaging, minimal plastic, electric delivery fleet." },
  ];

  return (
    <div>
      {/* Hero */}
      <section style={{
        padding: "100px 5% 80px",
        background: "radial-gradient(ellipse at 30% 50%, rgba(255,107,53,0.1), transparent 60%)"
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div className="section-label">Our Story</div>
          <h1 style={{ fontSize: "3rem", marginBottom: 24 }}>Born from a love of<br /><span style={{ color: "var(--flame)" }}>real food.</span></h1>
          <p style={{ color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1.8 }}>
            Flamehaus started in 2021 in a small cloud kitchen in Jubilee Hills. Our obsession? Closing the gap between restaurant quality and home delivery. No frozen patties. No reheated sauces. Every dish made to order, every time.
          </p>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: "80px 5%", background: "var(--charcoal)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="section-label">What we stand for</div>
          <h2 style={{ fontSize: "2.2rem", marginBottom: 48 }}>Our principles</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
            {values.map((v) => (
              <div key={v.title} className="card" style={{ padding: 28 }}>
                <div style={{ fontSize: "2rem", marginBottom: 16 }}>{v.emoji}</div>
                <h4 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem", marginBottom: 10 }}>{v.title}</h4>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "80px 5%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
            {[["12,000+", "Happy customers"], ["98%", "On-time delivery"], ["4.9 ★", "Average rating"], ["3", "Years of flame"]].map(([val, lbl]) => (
              <div key={lbl} className="card" style={{ padding: "32px 20px" }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", fontWeight: 800, color: "var(--flame)", marginBottom: 8 }}>{val}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: "80px 5%", background: "var(--charcoal)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="section-label">The people behind the food</div>
          <h2 style={{ fontSize: "2.2rem", marginBottom: 48 }}>Meet the team</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
            {team.map((m) => (
              <div key={m.name} className="card" style={{ padding: 28, textAlign: "center" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", background: "var(--flame)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2rem", margin: "0 auto 16px"
                }}>{m.emoji}</div>
                <h4 style={{ fontFamily: "Syne, sans-serif", marginBottom: 4 }}>{m.name}</h4>
                <p style={{ color: "var(--flame)", fontSize: "0.82rem", fontWeight: 600, marginBottom: 12 }}>{m.role}</p>
                <p style={{ color: "var(--muted)", fontSize: "0.83rem", lineHeight: 1.5 }}>{m.fact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
