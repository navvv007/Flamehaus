import { useState, useEffect, useCallback } from "react";
import api from "../../api/apiClient";
import AddressForm from "./AddressForm";

export default function SavedAddresses({ onSelect, selectedId }) {
  const [addresses, setAddresses] = useState([]);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [saveError, setSaveError] = useState("");

  // Read token fresh each call — avoids stale closure
  const getToken = () => localStorage.getItem("fh_customer_token");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { setError("Please log in to view saved addresses"); return; }
    try {
      const r = await api.get("/customer/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses(r.data);
      setError("");
    } catch(e) {
      const msg = e.response?.data?.error || e.response?.status || e.message;
      setError(`Failed to load addresses (${msg})`);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    const token = getToken();
    if (!token) { setSaveError("Not logged in"); return; }
    setSaving(true); setSaveError("");
    try {
      if (editing) {
        await api.put(`/customer/addresses/${editing.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/customer/addresses", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowForm(false); setEditing(null);
      await load();
    } catch(e) {
      const msg = e.response?.data?.error || e.message || "Failed to save address";
      setSaveError(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    const token = getToken();
    try {
      await api.delete(`/customer/addresses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch(e) {
      setError("Failed to delete address");
    }
  };

  const handleSetDefault = async (id) => {
    const token = getToken();
    try {
      await api.patch(`/customer/addresses/${id}/default`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch(e) { setError("Failed to set default"); }
  };

  const fmt = (a) => [a.addressLine1, a.addressLine2, a.landmark, a.city, a.state, a.pincode]
    .filter(Boolean).join(", ");

  return (
    <div>
      {error && (
        <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:12, color:"#E63946", fontSize:"0.82rem" }}>
          {error}
        </div>
      )}

      {addresses.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
          {addresses.map(a => (
            <div key={a.id} onClick={() => onSelect?.(a)} style={{
              padding:"14px 16px", borderRadius:12,
              cursor: onSelect ? "pointer" : "default",
              border:`1.5px solid ${selectedId===a.id ? "var(--flame)" : "var(--border)"}`,
              background: selectedId===a.id ? "rgba(255,107,53,0.08)" : "var(--charcoal)",
              transition:"all 0.2s",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:"0.82rem", fontWeight:700, color:selectedId===a.id?"var(--flame)":"var(--white)" }}>
                      {a.label==="Home"?"🏠":a.label==="Work"?"💼":"📍"} {a.label}
                    </span>
                    {a.isDefault && (
                      <span style={{ fontSize:"0.68rem", padding:"2px 8px", borderRadius:20, background:"rgba(87,204,153,0.15)", color:"#57CC99", fontWeight:700 }}>Default</span>
                    )}
                    {selectedId===a.id && <span style={{ fontSize:"0.68rem", color:"var(--flame)" }}>✓ Selected</span>}
                  </div>
                  <p style={{ fontSize:"0.84rem", color:"var(--muted)", lineHeight:1.5 }}>{fmt(a)}</p>
                  {a.latitude && <p style={{ fontSize:"0.72rem", color:"#4CC9F0", marginTop:3 }}>📡 GPS saved</p>}
                </div>
                <div style={{ display:"flex", gap:6, marginLeft:12, flexShrink:0 }}>
                  <button onClick={e=>{ e.stopPropagation(); setEditing(a); setSaveError(""); setShowForm(true); }}
                    style={{ padding:"4px 10px", borderRadius:6, fontSize:"0.75rem", background:"var(--card)", border:"1px solid var(--border)", color:"var(--muted)", cursor:"pointer" }}>Edit</button>
                  {!a.isDefault && (
                    <button onClick={e=>{ e.stopPropagation(); handleSetDefault(a.id); }}
                      style={{ padding:"4px 10px", borderRadius:6, fontSize:"0.75rem", background:"var(--card)", border:"1px solid var(--border)", color:"#57CC99", cursor:"pointer" }}>Default</button>
                  )}
                  <button onClick={e=>{ e.stopPropagation(); handleDelete(a.id); }}
                    style={{ padding:"4px 10px", borderRadius:6, fontSize:"0.75rem", background:"rgba(230,57,70,0.08)", border:"1px solid rgba(230,57,70,0.2)", color:"#E63946", cursor:"pointer" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => { setEditing(null); setSaveError(""); setShowForm(true); }} style={{
          display:"flex", alignItems:"center", gap:8, padding:"10px 16px",
          borderRadius:10, border:"1.5px dashed var(--border)", background:"transparent",
          color:"var(--muted)", fontSize:"0.88rem", cursor:"pointer", width:"100%",
        }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--flame)"; e.currentTarget.style.color="var(--flame)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--muted)"; }}>
          + Add new address
        </button>
      ) : (
        <div className="card" style={{ padding:"20px 22px", marginTop:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <h4 style={{ fontFamily:"Syne,sans-serif" }}>{editing?"Edit Address":"Add New Address"}</h4>
            <button onClick={()=>{ setShowForm(false); setEditing(null); setSaveError(""); }}
              style={{ background:"transparent", color:"var(--muted)", fontSize:"1.2rem" }}>✕</button>
          </div>
          {saveError && (
            <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:14, color:"#E63946", fontSize:"0.82rem" }}>
              {saveError}
            </div>
          )}
          <AddressForm
            initial={editing || {}}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); setSaveError(""); }}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}