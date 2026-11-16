import { Link } from "react-router-dom";
import { categories, menuItems, reviews } from "../../data/foodData";
import { useApp } from "../../context/AppContext";
import { useState } from "react";

function StarRating({ rating }) {
  return (
    <span className="stars">
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

function FoodCard({ item }) {
  const { addToCart, wishlist, toggleWishlist } = useApp();
  const [added, setAdded] = useState(false);
  const inWishlist = wishlist.find((i) => i.id === item.id);

  const badgeClass = {
    "Best Seller": "badge-bestSeller",
    "Chef's Pick": "badge-chefsPick",
    "Premium": "badge-premium",
    "New": "badge-new",
  }[item.badge] || "badge-default";

  const handleAdd = () => {
    addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="card fade-in" style={{ overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,107,53,0.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      {/* Image placeholder */}
      <div style={{ height: 160, background: "linear-gradient(135deg, #1A1A1A, #2A2A2A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", position: "relative" }}>
        {item.image}
        <button onClick={() => toggleWishlist(item)} style={{
          position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)",
          border: "none", borderRadius: "50%", width: 34, height: 34,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem", transition: "all 0.2s"
        }}>
          {inWishlist ? "❤️" : "🤍"}
        </button>
        {item.badge && (
          <span className={`tag ${badgeClass}`} style={{ position: "absolute", top: 12, left: 12 }}>
            {item.badge}
          </span>
        )}
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
          <h4 style={{ fontSize: "1rem", fontFamily: "Syne, sans-serif" }}>{item.name}</h4>
          <span style={{ fontWeight: 700, color: "var(--flame)", fontSize: "1.05rem" }}>₹{(item.price * 84).toFixed(0)}</span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 10, lineHeight: 1.5 }}>{item.description}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StarRating rating={item.rating} />
            <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>({item.reviews})</span>
          </div>
          <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>⏱ {item.prepTime}</span>
        </div>
        <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px 0", background: added ? "var(--green)" : "var(--flame)" }} onClick={handleAdd}>
          {added ? "✓ Added!" : "+ Add to Cart"}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const featured = menuItems.filter((i) => ["Best Seller", "Chef's Pick", "Premium"].includes(i.badge)).slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section style={{
        minHeight: "88vh", display: "flex", alignItems: "center",
        padding: "0 5%",
        background: "radial-gradient(ellipse at 70% 50%, rgba(255,107,53,0.12) 0%, transparent 60%), var(--dark)",
        position: "relative", overflow: "hidden"
      }}>
        {/* Background text */}
        <div style={{
          position: "absolute", right: "-5%", top: "50%", transform: "translateY(-50%)",
          fontSize: "18rem", opacity: 0.04, fontFamily: "Syne, sans-serif", fontWeight: 800,
          userSelect: "none", lineHeight: 1
        }}>FOOD</div>

        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div className="fade-in">
            <div className="section-label" style={{ marginBottom: 20 }}>⚡ Hyderabad's boldest kitchen</div>
            <h1 style={{ fontSize: "clamp(2.8rem, 5vw, 4.5rem)", lineHeight: 1.05, marginBottom: 28 }}>
              Food that hits<br />
              <span style={{ color: "var(--flame)" }}>different.</span>
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1.7, marginBottom: 40, maxWidth: 440 }}>
              Premium burgers, handmade pasta, and live-fire cooking — delivered to your door in under 30 minutes.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link to="/menu" className="btn-primary">🍽 Explore Menu</Link>
              <Link to="/about" className="btn-outline">Our Story</Link>
            </div>
            <div style={{ display: "flex", gap: 40, marginTop: 48 }}>
              {[["4.9★", "Rating"], ["12k+", "Orders"], ["<30min", "Delivery"]].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "var(--flame)" }}>{val}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { emoji: "🍔", name: "Smash Burger", col: "#FF6B35" },
              { emoji: "🍕", name: "Margherita", col: "#E63946" },
              { emoji: "🍣", name: "Dragon Roll", col: "#2A9D8F" },
              { emoji: "🍝", name: "Carbonara", col: "#E9C46A" },
            ].map((item, i) => (
              <div key={i} className="card fade-in" style={{
                padding: 24, textAlign: "center", animationDelay: `${i * 0.1}s`,
                borderColor: `${item.col}30`
              }}>
                <div style={{ fontSize: "3rem", marginBottom: 8 }}>{item.emoji}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: "80px 5%", background: "var(--charcoal)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="section-label">Browse by Category</div>
          <h2 style={{ fontSize: "2.2rem", marginBottom: 40 }}>What are you craving?</h2>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {categories.map((cat) => (
              <Link to="/menu" key={cat.id} style={{
                flexShrink: 0, padding: "14px 24px", borderRadius: 50,
                background: "var(--card)", border: "1.5px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
                fontWeight: 500, fontSize: "0.9rem"
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = `${cat.color}15`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}>
                <span style={{ fontSize: "1.2rem" }}>{cat.icon}</span>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section style={{ padding: "80px 5%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
            <div>
              <div className="section-label">Hand-picked for you</div>
              <h2 style={{ fontSize: "2.2rem" }}>Customer favourites</h2>
            </div>
            <Link to="/menu" className="btn-outline" style={{ padding: "10px 24px" }}>View All →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {featured.map((item) => <FoodCard key={item.id} item={item} />)}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section style={{ padding: "80px 5%", background: "var(--charcoal)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="section-label">What people say</div>
          <h2 style={{ fontSize: "2.2rem", marginBottom: 40 }}>Reviews</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {reviews.map((r) => (
              <div key={r.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: "var(--flame)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontFamily: "Syne, sans-serif", fontWeight: 700
                  }}>{r.avatar}</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{r.name}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{r.date}</p>
                  </div>
                </div>
                <StarRating rating={r.rating} />
                <p style={{ color: "var(--muted)", fontSize: "0.87rem", marginTop: 10, lineHeight: 1.6 }}>{r.text}</p>
                <p style={{ color: "var(--flame)", fontSize: "0.78rem", marginTop: 10, fontWeight: 600 }}>📍 {r.dish}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "100px 5%", textAlign: "center",
        background: "radial-gradient(ellipse at center, rgba(255,107,53,0.1), transparent 70%)"
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔥</div>
          <h2 style={{ fontSize: "2.8rem", marginBottom: 16 }}>Hungry yet?</h2>
          <p style={{ color: "var(--muted)", marginBottom: 32, fontSize: "1.05rem" }}>
            Order now and get free delivery on your first order. No code needed.
          </p>
          <Link to="/menu" className="btn-primary" style={{ fontSize: "1.05rem", padding: "14px 40px" }}>
            Order Now
          </Link>
        </div>
      </section>
    </div>
  );
}
