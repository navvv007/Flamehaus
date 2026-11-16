import { useState, useEffect } from "react";
import api from "../../api/apiClient";
import AddressForm from "./AddressForm";

/**
 * Shows saved addresses for logged-in customer.
 * Props:
 *   onSelect(addr) — called when customer picks an address for delivery
 *   selectedId     — currently selected address id
 */
export default function SavedAddresses({ onSelect, selectedId }) {
  const [addresses, setAddresses] = useState([]);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);

  const token = localStorage.getItem("fh_customer_token");
  const cfg   = { headers: { Authorization: `Bearer ${token}` } };

  const load = () => {
    if (!token) return;
    api.get("/customer/addresses", cfg).then(r => setAddresses(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      editing
        ? await api.put(`/customer/addresses/${editing.id}`, form, cfg)
        : await api.post("/customer/addresses", form, cfg);
      setShowForm(false); setEditing(null); load();
    } catch(_) {}
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    await api.delete(`/customer/addresses/${id}`, cfg).catch(() => {});
    load();
  };

  const handleSetDefault = async (id) => {
    await api.patch(`/customer/addresses/${id}/default`, {}, cfg).catch(() => {});
    load();
  };

  const formatAddress = (a) => [
    a.addressLine1, a.addressLine2, a.landmark, a.city,
    a.state, a.pincode
  ].filter(Boolean).join(", ");

  return (
    <div>
      {addresses.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {addresses.map(a => (
            <div key={a.id} onClick={() => onSelect?.(a)}
              style={{
                padding: "14px 16px", borderRadius: 12, cursor: onSelect ? "pointer" : "default",
                border: `1.5px solid ${selectedId === a.id ? "var(--flame)" : "var(--border)"}`,
                background: selectedId === a.id ? "rgba(255,107,53,0.08)" : "var(--charcoal)",
                transition: "all 0.2s",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: selectedId === a.id ? "var(--flame)" : "var(--white)" }}>
                      {a.label === "Home" ? "🏠" : a.label === "Work" ? "💼" : "📍"} {a.label}
                    </span>
                    {a.isDefault && (
                      <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 20, background: "rgba(87,204,153,0.15)", color: "#57CC99", fontWeight: 700 }}>Default</span>
                    )}
                    {selectedId === a.id && (
                      <span style={{ fontSize: "0.68rem", color: "var(--flame)" }}>✓ Selected</span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {formatAddress(a)}
                  </p>
                  {a.latitude && (
                    <p style={{ fontSize: "0.72rem", color: "#4CC9F0", marginTop: 3 }}>
                      📡 GPS saved
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setEditing(a); setShowForm(true); }}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}>
                    Edit
                  </button>
                  {!a.isDefault && (
                    <button onClick={e => { e.stopPropagation(); handleSetDefault(a.id); }}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", background: "var(--card)", border: "1px solid var(--border)", color: "#57CC99", cursor: "pointer" }}>
                      Set Default
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)", color: "#E63946", cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
          borderRadius: 10, border: "1.5px dashed var(--border)", background: "transparent",
          color: "var(--muted)", fontSize: "0.88rem", cursor: "pointer", width: "100%",
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--flame)"; e.currentTarget.style.color = "var(--flame)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}>
          + Add new address
        </button>
      ) : (
        <div className="card" style={{ padding: "20px 22px", marginTop: 10 }}>
          <h4 style={{ fontFamily: "Syne,sans-serif", marginBottom: 18 }}>
            {editing ? "Edit Address" : "Add New Address"}
          </h4>
          <AddressForm
            initial={editing || {}}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}