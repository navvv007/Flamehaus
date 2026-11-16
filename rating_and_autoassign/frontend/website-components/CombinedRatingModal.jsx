import { useState, useEffect } from "react";
import api from "../../api/apiClient";

function StarPicker({ value, onChange, size = "1.6rem" }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
          style={{ fontSize: size, cursor: "pointer", transition: "transform 0.12s",
            transform: s <= (hovered || value) ? "scale(1.2)" : "scale(1)",
            color: s <= (hovered || value) ? "#F4C842" : "#444" }}>★</span>
      ))}
    </div>
  );
}

const FOOD_LABELS     = ["", "Terrible", "Bad", "Okay", "Good", "Excellent!"];
const DELIVERY_LABELS = ["", "Very Bad", "Poor", "Average", "Good", "Outstanding!"];

export default function CombinedRatingModal({ orderId, assignment, onClose, onDone }) {
  const [step,           setStep]           = useState(1);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState("");
  const [alreadyRated,   setAlreadyRated]   = useState(false);
  const [menuItems,      setMenuItems]      = useState([]);
  const [overallFood,    setOverallFood]    = useState(0);
  const [foodComment,    setFoodComment]    = useState("");
  const [dishRatings,    setDishRatings]    = useState({});
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [deliveryComment,setDeliveryComment]= useState("");

  useEffect(() => {
    if (!orderId) return;
    const token = localStorage.getItem("fh_customer_token");
    api.get(`/customer/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.data.rated) setAlreadyRated(true);
        const summary = r.data.itemsSummary || "";
        const parsed  = summary.split(",").map((s) => s.trim().replace(/\s*x\d+$/, "")).filter(Boolean);
        setMenuItems([...new Set(parsed)]);
      }).catch(() => {});
  }, [orderId]);

  const setDishRating  = (name, val) => setDishRatings((p) => ({ ...p, [name]: { ...p[name], rating: val } }));
  const setDishComment = (name, val) => setDishRatings((p) => ({ ...p, [name]: { ...p[name], comment: val } }));

  const handleSubmitFood = async () => {
    if (overallFood === 0) { setError("Please select a star rating"); return; }
    setError(""); setSubmitting(true);
    try {
      const token = localStorage.getItem("fh_customer_token");
      await api.post("/customer/ratings", {
        orderId, overallRating: overallFood, overallComment: foodComment,
        dishRatings: Object.entries(dishRatings).map(([name, v]) => ({
          dishName: name, rating: v.rating || overallFood, comment: v.comment || "",
        })),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setStep(2);
    } catch (e) {
      if (e.response?.status === 400) { setAlreadyRated(true); setStep(2); }
      else setError(e.response?.data?.error || "Failed to submit food rating");
    } finally { setSubmitting(false); }
  };

  const handleSubmitDelivery = async () => {
    if (!assignment) { onDone?.(); return; }
    if (deliveryRating === 0) { setError("Please rate the delivery"); return; }
    setError(""); setSubmitting(true);
    try {
      const token = localStorage.getItem("fh_customer_token");
      await api.post(`/delivery/rate/${assignment.id}`, { rating: deliveryRating, comment: deliveryComment },
        { headers: { Authorization: `Bearer ${token}` } });
      onDone?.();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to submit delivery rating");
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 500, padding: "36px 32px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "transparent", color: "var(--muted)", fontSize: "1.3rem" }}>✕</button>

        {/* Step bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 3, background: step >= s ? "var(--flame)" : "var(--border)", transition: "background 0.3s" }} />
          ))}
        </div>

        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#E63946", fontSize: "0.85rem" }}>{error}</div>
        )}

        {/* Step 1: Food rating */}
        {step === 1 && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: "2rem" }}>🍽</span>
              <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.4rem", marginTop: 8, marginBottom: 4 }}>Rate Your Food</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.83rem" }}>{alreadyRated ? "Already rated — continue to delivery rating" : "How was the food quality?"}</p>
            </div>
            {!alreadyRated && (
              <>
                <div style={{ marginBottom: 20, textAlign: "center" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>OVERALL ORDER</p>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><StarPicker value={overallFood} onChange={setOverallFood} size="2rem" /></div>
                  {overallFood > 0 && <p style={{ color: "#F4C842", fontWeight: 700, fontSize: "0.9rem" }}>{FOOD_LABELS[overallFood]}</p>}
                </div>
                {menuItems.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>RATE EACH DISH</p>
                    {menuItems.map((name) => (
                      <div key={name} style={{ background: "var(--charcoal)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{name}</p>
                          <StarPicker value={dishRatings[name]?.rating || 0} onChange={(v) => setDishRating(name, v)} size="1.2rem" />
                        </div>
                        <input type="text" placeholder="Comment on this dish…" value={dishRatings[name]?.comment || ""}
                          onChange={(e) => setDishComment(name, e.target.value)}
                          style={{ width: "100%", fontSize: "0.8rem", padding: "6px 10px" }} />
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <textarea value={foodComment} onChange={(e) => setFoodComment(e.target.value)}
                    placeholder="Overall comment…" rows={2} style={{ width: "100%", resize: "none" }} />
                </div>
              </>
            )}
            <button className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: submitting || (!alreadyRated && overallFood === 0) ? 0.7 : 1 }}
              onClick={alreadyRated ? () => setStep(2) : handleSubmitFood}
              disabled={submitting || (!alreadyRated && overallFood === 0)}>
              {submitting ? "Submitting…" : "Next: Rate Delivery →"}
            </button>
            {assignment && (
              <button onClick={() => setStep(2)} style={{ width: "100%", marginTop: 10, background: "transparent", color: "var(--muted)", fontSize: "0.82rem", padding: "8px 0" }}>Skip food rating →</button>
            )}
          </>
        )}

        {/* Step 2: Delivery partner rating */}
        {step === 2 && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: "2rem" }}>🛵</span>
              <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "1.4rem", marginTop: 8, marginBottom: 4 }}>Rate Your Delivery</h2>
              {assignment?.partner && <p style={{ color: "var(--muted)", fontSize: "0.83rem" }}>How did <strong style={{ color: "var(--white)" }}>{assignment.partner.name}</strong> do?</p>}
              {!assignment && <p style={{ color: "var(--muted)", fontSize: "0.83rem" }}>No delivery partner for this order</p>}
            </div>
            {assignment && (
              <>
                <div style={{ marginBottom: 16, textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><StarPicker value={deliveryRating} onChange={setDeliveryRating} size="2rem" /></div>
                  {deliveryRating > 0 && <p style={{ color: "#F4C842", fontWeight: 700, fontSize: "0.9rem" }}>{DELIVERY_LABELS[deliveryRating]}</p>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 14 }}>
                  {["Fast delivery", "Friendly", "Safe handling", "On time", "Polite"].map((tag) => (
                    <button key={tag} onClick={() => setDeliveryComment((c) => c ? `${c}, ${tag}` : tag)}
                      style={{ padding: "5px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 500, background: "var(--charcoal)", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}>
                      {tag}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <textarea value={deliveryComment} onChange={(e) => setDeliveryComment(e.target.value)}
                    placeholder="Any comments about the delivery?" rows={2} style={{ width: "100%", resize: "none" }} />
                </div>
                <button className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "13px 0", opacity: submitting || deliveryRating === 0 ? 0.7 : 1 }}
                  onClick={handleSubmitDelivery} disabled={submitting || deliveryRating === 0}>
                  {submitting ? "Submitting…" : "Submit & Finish 🎉"}
                </button>
              </>
            )}
            <button onClick={onDone} style={{ width: "100%", marginTop: 10, background: "transparent", color: "var(--muted)", fontSize: "0.82rem", padding: "8px 0" }}>
              {assignment ? "Skip delivery rating" : "Done"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
