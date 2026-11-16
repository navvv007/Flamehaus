import { useState, useEffect, useCallback } from "react";
import api from "../../api/apiClient";

function Stars({ n }) {
  return <span style={{ color: "#F4C842" }}>{"★".repeat(n || 0)}{"☆".repeat(5 - (n || 0))}</span>;
}

export default function AdminRatings() {
  const [tab,       setTab]       = useState("food");     // food | delivery
  const [foodData,  setFoodData]  = useState([]);
  const [dlvData,   setDlvData]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("All");
  const [search,    setSearch]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, dRes] = await Promise.all([
        api.get("/admin/ratings"),
        api.get("/delivery/admin/partners"),
      ]);
      setFoodData(fRes.data || []);
      setDlvData(dRes.data  || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const foodFiltered = foodData.filter((r) => {
    const starMatch = filter === "All" || r.rating === Number(filter);
    const searchMatch = !search || (r.customerName || "").toLowerCase().includes(search.toLowerCase()) || (r.comment || "").toLowerCase().includes(search.toLowerCase());
    return starMatch && searchMatch;
  });

  const avgFood  = foodData.length  ? (foodData.reduce((s, r) => s + (r.rating || 0), 0) / foodData.length).toFixed(1) : "—";
  const avgDlv   = dlvData.length   ? (dlvData.reduce((s, p) => s + (p.rating || 0), 0) / dlvData.filter(p => p.totalRatings > 0).length || 0).toFixed(1) : "—";

  const starDist = [5,4,3,2,1].map((s) => ({
    star: s,
    count: foodData.filter((r) => r.rating === s).length,
    pct: foodData.length ? Math.round((foodData.filter((r) => r.rating === s).length / foodData.length) * 100) : 0,
  }));

  return (
    <div style={{ padding: "40px 36px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-label">Reviews & Ratings</div>
        <h1 style={{ fontSize: "2rem" }}>Ratings Dashboard</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>
          Food ratings, delivery partner ratings, and customer feedback
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Food Reviews",    value: foodData.length,  icon: "🍽", color: "var(--flame)" },
          { label: "Avg Food Rating", value: `★ ${avgFood}`,  icon: "⭐", color: "#F4C842" },
          { label: "Delivery Reviews",value: dlvData.filter(p => p.totalRatings > 0).reduce((s,p)=>s+p.totalRatings,0), icon: "🛵", color: "#4CC9F0" },
          { label: "Avg Delivery",    value: `★ ${avgDlv}`,   icon: "⭐", color: "#57CC99" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding: "22px 20px" }}>
            <span style={{ fontSize: "1.6rem" }}>{icon}</span>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.6rem", color, marginTop: 8 }}>{value}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", background: "var(--charcoal)", borderRadius: 10, padding: 4, marginBottom: 24, maxWidth: 360 }}>
        {[["food", "🍽 Food Ratings"], ["delivery", "🛵 Delivery Ratings"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 600, fontSize: "0.88rem",
            background: tab === key ? "var(--flame)" : "transparent",
            color:      tab === key ? "#fff"         : "var(--muted)",
            transition: "all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Food ratings tab ─────────────────────────────────────────────── */}
      {tab === "food" && (
        <>
          {/* Star distribution */}
          <div className="card" style={{ padding: "22px 24px", marginBottom: 24 }}>
            <h3 style={{ fontFamily: "Syne,sans-serif", marginBottom: 16 }}>Rating Distribution</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {starDist.map(({ star, count, pct }) => (
                <div key={star} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "#F4C842", minWidth: 60, fontSize: "0.85rem" }}>{"★".repeat(star)} {star}</span>
                  <div style={{ flex: 1, height: 10, background: "var(--charcoal)", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--flame)", borderRadius: 5, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "0.8rem", minWidth: 50, textAlign: "right" }}>{count} ({pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <input type="text" placeholder="🔍 Search reviews…" value={search}
              onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 140 }}>
              <option value="All">All Stars</option>
              {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} ★</option>)}
            </select>
          </div>

          {/* Reviews list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading…</div>
          ) : foodFiltered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>No reviews found</div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)" }}>
                    {["Order", "Customer", "Rating", "Comment", "Date"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "var(--muted)", fontWeight: 600, fontSize: "0.8rem" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {foodFiltered.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,53,0.03)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ padding: "14px 16px", color: "var(--flame)", fontWeight: 600, fontSize: "0.88rem" }}>#{r.orderId}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.88rem" }}>{r.customerName || "—"}</td>
                      <td style={{ padding: "14px 16px" }}><Stars n={r.rating} /></td>
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: "0.82rem", maxWidth: 280 }}>{r.comment || "—"}</td>
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: "0.8rem" }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Delivery ratings tab ─────────────────────────────────────────── */}
      {tab === "delivery" && (
        <div className="card" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading…</div>
          ) : dlvData.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>No delivery partners yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)" }}>
                  {["Partner", "Status", "Total Deliveries", "Avg Rating", "Total Ratings"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "var(--muted)", fontWeight: 600, fontSize: "0.8rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dlvData.filter(p => p.status === "ACTIVE").map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,53,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "14px 16px" }}>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.76rem" }}>📞 {p.phone}</p>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
                        background: p.availability === "ONLINE" ? "rgba(87,204,153,0.15)" : "rgba(136,136,136,0.1)",
                        color:      p.availability === "ONLINE" ? "#57CC99"               : "#888" }}>
                        {p.availability}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>{p.totalDeliveries || 0}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {p.totalRatings > 0
                        ? <><Stars n={Math.round(p.rating)} /> <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>({p.rating?.toFixed(1)})</span></>
                        : <span style={{ color: "var(--muted)" }}>No ratings yet</span>}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--muted)" }}>{p.totalRatings || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
