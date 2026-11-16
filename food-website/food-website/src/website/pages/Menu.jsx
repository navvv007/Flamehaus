import { useState, useEffect } from "react";
import { fetchPublicMenu } from "../../api/apiClient";
import { useApp } from "../../context/AppContext";

const CATEGORIES = ["All","Burgers","Pizza","Sushi","Pasta","Salads","Desserts","Drinks","Tacos"];
const CAT_ICONS  = { Burgers:"🍔", Pizza:"🍕", Sushi:"🍣", Pasta:"🍝", Salads:"🥗", Desserts:"🍰", Drinks:"🥤", Tacos:"🌮" };

function StarRating({ rating }) {
  return <span className="stars">{"★".repeat(Math.round(rating || 0))}{"☆".repeat(5 - Math.round(rating || 0))}</span>;
}

export default function Menu() {
  const { addToCart, wishlist, toggleWishlist } = useApp();
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState("popular");
  const [added, setAdded]         = useState({});

  useEffect(() => {
    fetchPublicMenu()
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items
    .filter((i) => activeCategory === "All" || i.category === activeCategory)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.description || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "price-asc")  return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating")     return (b.rating || 0) - (a.rating || 0);
      return (b.reviews || 0) - (a.reviews || 0);
    });

  const handleAdd = (item) => {
    addToCart(item);
    setAdded((p) => ({ ...p, [item.id]: true }));
    setTimeout(() => setAdded((p) => ({ ...p, [item.id]: false })), 1500);
  };

  const badgeClass = (badge) => ({
    "Best Seller": "badge-bestSeller",
    "Chef's Pick": "badge-chefsPick",
    "Premium":     "badge-premium",
    "New":         "badge-new",
    "Spicy":       "badge-new",
    "Vegan":       "badge-new",
    "Fan Fav":     "badge-default",
    "Refreshing":  "badge-default",
  })[badge] || "badge-default";

  return (
    <div style={{ padding: "60px 5%" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="section-label">Full Menu</div>
          <h1 style={{ fontSize: "2.8rem", marginBottom: 12 }}>Everything we make</h1>
          <p style={{ color: "var(--muted)", fontSize: "1rem" }}>Fresh, bold, made to order</p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <input type="text" placeholder="🔍  Search dishes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ minWidth: 160 }}>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginBottom: 36 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              flexShrink: 0, padding: "9px 20px", borderRadius: 50, fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
              background: activeCategory === cat ? "var(--flame)" : "var(--card)",
              color: activeCategory === cat ? "#fff" : "var(--muted)",
              border: `1.5px solid ${activeCategory === cat ? "var(--flame)" : "var(--border)"}`,
            }}>
              {cat === "All" ? "🍽 All" : (CAT_ICONS[cat] + " " + cat)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
            <p>Loading menu…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🍽</div>
            <p style={{ fontSize: "1.1rem" }}>No dishes match your search.</p>
          </div>
        ) : (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 24 }}>
              Showing {filtered.length} {filtered.length === 1 ? "dish" : "dishes"}{activeCategory !== "All" && ` in ${activeCategory}`}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {filtered.map((item) => {
                const inWishlist = wishlist.find((i) => i.id === item.id);
                return (
                  <div key={item.id} className="card fade-in" style={{ overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,107,53,0.12)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ height: 150, background: "linear-gradient(135deg, #1A1A1A, #2A2A2A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", position: "relative" }}>
                      {item.image}
                      <button onClick={() => toggleWishlist(item)} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                        {inWishlist ? "❤️" : "🤍"}
                      </button>
                      {item.badge && (
                        <span className={`tag ${badgeClass(item.badge)}`} style={{ position: "absolute", top: 10, left: 10 }}>{item.badge}</span>
                      )}
                    </div>
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <h4 style={{ fontSize: "0.97rem", fontFamily: "Syne, sans-serif" }}>{item.name}</h4>
                        <span style={{ fontWeight: 700, color: "var(--flame)" }}>₹{(item.price * 84).toFixed(0)}</span>
                      </div>
                      <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 10, lineHeight: 1.5 }}>{item.description}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <StarRating rating={item.rating} />
                          <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>({item.reviews})</span>
                        </div>
                        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>⏱ {item.prepTime}</span>
                      </div>
                      <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px 0", background: added[item.id] ? "var(--green)" : "var(--flame)" }} onClick={() => handleAdd(item)}>
                        {added[item.id] ? "✓ Added!" : "+ Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
