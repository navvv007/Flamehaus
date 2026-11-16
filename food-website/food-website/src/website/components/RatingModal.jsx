import { useState } from "react";
import { submitRating } from "../../api/apiClient";

function StarPicker({ value, onChange, size = "1.6rem" }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s}
          style={{ fontSize: size, cursor: "pointer", transition: "transform 0.1s",
            transform: s <= (hovered || value) ? "scale(1.15)" : "scale(1)" }}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}>
          {s <= (hovered || value) ? "⭐" : "☆"}
        </span>
      ))}
    </div>
  );
}

export default function RatingModal({ order, onClose, onSubmitted }) {
  // Parse dish names + IDs from itemsSummary
  // itemsSummary format: "Dish Name x2, Other Dish x1"
  // We receive orderedItems as array of {menuItemId, name} from parent
  const orderedItems = order.orderedItems || [];

  const [orderStars,   setOrderStars]   = useState(0);
  const [orderComment, setOrderComment] = useState("");
  const [dishRatings,  setDishRatings]  = useState(
    Object.fromEntries(orderedItems.map((i) => [i.menuItemId, { stars: 0, comment: "" }]))
  );
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const setDishStars   = (id, stars)   => setDishRatings((p) => ({ ...p, [id]: { ...p[id], stars } }));
  const setDishComment = (id, comment) => setDishRatings((p) => ({ ...p, [id]: { ...p[id], comment } }));

  const handleSubmit = async () => {
    if (orderStars === 0) { setError("Please rate the overall order."); return; }
    setLoading(true); setError("");
    try {
      const dishRatingsList = orderedItems
        .filter((i) => dishRatings[i.menuItemId]?.stars > 0)
        .map((i) => ({
          menuItemId: i.menuItemId,
          stars:      dishRatings[i.menuItemId].stars,
          comment:    dishRatings[i.menuItemId].comment || "",
        }));

      await submitRating({
        orderId:      order.id,
        orderStars,
        orderComment,
        dishRatings:  dishRatingsList,
      });
      onSubmitted();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: 20,
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: "36px 36px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>Rate Your Experience</div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.5rem" }}>Order #{order.id}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--muted)", fontSize: "1.3rem", padding: "4px 8px" }}>✕</button>
        </div>

        {/* Overall order rating */}
        <div className="card" style={{ padding: "20px 22px", marginBottom: 24, borderColor: "rgba(255,107,53,0.2)" }}>
          <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, marginBottom: 14 }}>
            🍽 Overall Experience
          </p>
          <StarPicker value={orderStars} onChange={setOrderStars} size="2rem" />
          <div style={{ marginTop: 14 }}>
            <textarea
              placeholder="How was your overall experience? (optional)"
              value={orderComment}
              onChange={(e) => setOrderComment(e.target.value)}
              style={{ width: "100%", minHeight: 72, resize: "vertical", fontSize: "0.88rem" }}
            />
          </div>
        </div>

        {/* Individual dish ratings */}
        {orderedItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>
              Rate Individual Dishes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {orderedItems.map((item) => (
                <div key={item.menuItemId} className="card" style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>🍽 {item.name}</span>
                    <StarPicker value={dishRatings[item.menuItemId]?.stars || 0} onChange={(s) => setDishStars(item.menuItemId, s)} />
                  </div>
                  {dishRatings[item.menuItemId]?.stars > 0 && (
                    <input
                      type="text"
                      placeholder="Any thoughts on this dish? (optional)"
                      value={dishRatings[item.menuItemId]?.comment || ""}
                      onChange={(e) => setDishComment(item.menuItemId, e.target.value)}
                      style={{ width: "100%", fontSize: "0.83rem" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#E63946", fontSize: "0.87rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ flex: 1, justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Submitting…" : "Submit Rating"}
          </button>
          <button className="btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
