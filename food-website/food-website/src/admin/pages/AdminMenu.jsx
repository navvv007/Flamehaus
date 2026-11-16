import { useState, useEffect, useCallback } from "react";
import { fetchAdminMenu, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItem } from "../../api/apiClient";

const CATEGORIES = ["Burgers","Pizza","Sushi","Pasta","Salads","Desserts","Drinks","Tacos"];

const EMPTY_FORM = { name: "", category: "Burgers", price: "", description: "", image: "🍽", badge: "", available: true, prepTime: "15 min" };

export default function AdminMenu() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminMenu()
      .then((r) => setItems(r.data))
      .catch(() => setError("Failed to load menu"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items
    .filter((i) => filterCat === "All" || i.category === filterCat)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, price: item.price, description: item.description || "", image: item.image || "🍽", badge: item.badge || "", available: item.available, prepTime: item.prepTime || "15 min" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this dish?")) return;
    await deleteMenuItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleToggle = async (id) => {
    const updated = await toggleMenuItem(id);
    setItems((prev) => prev.map((i) => i.id === id ? updated.data : i));
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      if (editItem) {
        const res = await updateMenuItem(editItem.id, payload);
        setItems((prev) => prev.map((i) => i.id === editItem.id ? res.data : i));
      } else {
        const res = await createMenuItem(payload);
        setItems((prev) => [...prev, res.data]);
      }
      setShowForm(false);
      setEditItem(null);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError("Save failed: " + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const allCats = ["All", ...CATEGORIES];

  return (
    <div style={{ padding: "40px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
        <div>
          <div className="section-label">Menu Management</div>
          <h1 style={{ fontSize: "2rem" }}>Dishes</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>{items.length} total items</p>
          {error && <p style={{ color: "#E63946", fontSize: "0.88rem", marginTop: 6 }}>{error}</p>}
        </div>
        <button className="btn-primary" onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true); }}>
          + Add Dish
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input type="text" placeholder="🔍 Search dishes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ minWidth: 160 }}>
          {allCats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading menu…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)" }}>
                {["Dish", "Category", "Price", "Rating", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "14px 16px", color: "var(--muted)", fontWeight: 600, fontSize: "0.8rem", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,53,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "1.6rem" }}>{item.image}</span>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{item.name}</p>
                        <p style={{ color: "var(--muted)", fontSize: "0.76rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: "0.85rem" }}>{item.category}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--flame)" }}>₹{(item.price * 84).toFixed(0)}</td>
                  <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>
                    <span style={{ color: "#F4C842" }}>★</span> {item.rating} <span style={{ color: "var(--muted)" }}>({item.reviews})</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button onClick={() => handleToggle(item.id)} style={{
                      padding: "5px 14px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
                      background: item.available ? "rgba(87,204,153,0.15)" : "rgba(136,136,136,0.15)",
                      color: item.available ? "#57CC99" : "var(--muted)",
                      border: `1px solid ${item.available ? "rgba(87,204,153,0.3)" : "var(--border)"}`,
                    }}>
                      {item.available ? "Available" : "Unavailable"}
                    </button>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleEdit(item)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "rgba(255,107,53,0.15)", color: "var(--flame)", border: "1px solid rgba(255,107,53,0.3)" }}>Edit</button>
                      <button onClick={() => handleDelete(item.id)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "rgba(230,57,70,0.12)", color: "#E63946", border: "1px solid rgba(230,57,70,0.3)" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>No dishes found</div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: 520, padding: 36, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} style={{ position: "absolute", top: 16, right: 16, background: "transparent", color: "var(--muted)", fontSize: "1.3rem" }}>✕</button>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.4rem", marginBottom: 28 }}>{editItem ? "Edit Dish" : "Add New Dish"}</h3>
            {error && <p style={{ color: "#E63946", fontSize: "0.87rem", marginBottom: 16 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Dish Name *", key: "name", type: "text", placeholder: "e.g. Truffle Mushroom Pizza" },
                { label: "Price (USD) *", key: "price", type: "number", placeholder: "e.g. 14.99" },
                { label: "Image Emoji", key: "image", type: "text", placeholder: "🍕" },
                { label: "Prep Time", key: "prepTime", type: "text", placeholder: "15 min" },
                { label: "Badge", key: "badge", type: "text", placeholder: "Best Seller / New / Premium" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={form[key]} placeholder={placeholder} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} style={{ width: "100%" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 6 }}>Category *</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} style={{ width: "100%" }}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 6 }}>Description</label>
                <textarea value={form.description} placeholder="Describe the dish..." onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ width: "100%", minHeight: 80, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="avail" checked={form.available} onChange={(e) => setForm((p) => ({ ...p, available: e.target.checked }))} style={{ width: "auto", accentColor: "var(--flame)" }} />
                <label htmlFor="avail" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Available on menu</label>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : (editItem ? "Save Changes" : "Add Dish")}
                </button>
                <button className="btn-outline" onClick={() => { setShowForm(false); setEditItem(null); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
