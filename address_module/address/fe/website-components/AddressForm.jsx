import { useState, useEffect } from "react";

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh"];

export default function AddressForm({ initial = {}, onSave, onCancel, saving = false }) {
  const [form, setForm] = useState({
    label: "Home", addressLine1: "", addressLine2: "", landmark: "",
    city: "", state: "", pincode: "", country: "India",
    latitude: null, longitude: null, isDefault: false,
    ...initial,
  });
  const [locating, setLocating] = useState(false);
  const [locErr,   setLocErr]   = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-detect GPS location
  const detectLocation = () => {
    if (!navigator.geolocation) { setLocErr("Geolocation not supported"); return; }
    setLocating(true); setLocErr("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        set("latitude",  coords.latitude);
        set("longitude", coords.longitude);
        // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address || {};
          setForm(p => ({
            ...p,
            latitude:     coords.latitude,
            longitude:    coords.longitude,
            addressLine1: [addr.house_number, addr.road].filter(Boolean).join(", "),
            addressLine2: [addr.suburb, addr.neighbourhood].filter(Boolean).join(", "),
            city:         addr.city || addr.town || addr.village || "",
            state:        addr.state || "",
            pincode:      addr.postcode || "",
          }));
        } catch(_) { /* coords still saved even if reverse geocode fails */ }
        setLocating(false);
      },
      (err) => { setLocErr("Could not detect location: " + err.message); setLocating(false); },
      { timeout: 10000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const inputStyle = { width: "100%", marginBottom: 0 };
  const labelStyle = { display: "block", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <form onSubmit={handleSubmit}>
      {/* Label tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Home","Work","Other"].map(l => (
          <button key={l} type="button" onClick={() => set("label", l)} style={{
            padding: "7px 18px", borderRadius: 50, fontWeight: 600, fontSize: "0.85rem",
            background: form.label === l ? "var(--flame)" : "var(--charcoal)",
            color:      form.label === l ? "#fff"         : "var(--muted)",
            border:     `1.5px solid ${form.label === l ? "var(--flame)" : "var(--border)"}`,
          }}>{l === "Home" ? "🏠 " : l === "Work" ? "💼 " : "📍 "}{l}</button>
        ))}
      </div>

      {/* GPS detect */}
      <div style={{ marginBottom: 18 }}>
        <button type="button" onClick={detectLocation} disabled={locating} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 10, fontSize: "0.88rem", fontWeight: 600,
          background: "rgba(76,201,240,0.08)", border: "1px solid rgba(76,201,240,0.25)",
          color: "#4CC9F0", cursor: "pointer", transition: "all 0.2s",
        }}>
          <span style={{ fontSize: "1.1rem" }}>{locating ? "⏳" : "📡"}</span>
          {locating ? "Detecting location…" : "Use my current location"}
        </button>
        {locErr && <p style={{ color: "#E63946", fontSize: "0.78rem", marginTop: 6 }}>{locErr}</p>}
        {form.latitude && !locating && (
          <p style={{ color: "#57CC99", fontSize: "0.78rem", marginTop: 6 }}>
            ✓ GPS: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>House / Flat No., Building *</label>
          <input value={form.addressLine1} onChange={e => set("addressLine1", e.target.value)}
            placeholder="e.g. Flat 301, Green Valley Apts" style={inputStyle} required />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Street / Area</label>
          <input value={form.addressLine2} onChange={e => set("addressLine2", e.target.value)}
            placeholder="e.g. Banjara Hills Road No. 12" style={inputStyle} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Landmark</label>
          <input value={form.landmark} onChange={e => set("landmark", e.target.value)}
            placeholder="e.g. Near Apollo Hospital" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>City *</label>
          <input value={form.city} onChange={e => set("city", e.target.value)}
            placeholder="e.g. Hyderabad" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>State *</label>
          <select value={form.state} onChange={e => set("state", e.target.value)} style={inputStyle} required>
            <option value="">Select state…</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Pincode *</label>
          <input value={form.pincode} onChange={e => set("pincode", e.target.value.replace(/\D/g,""))}
            placeholder="e.g. 500034" maxLength={6} style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Country</label>
          <input value={form.country} onChange={e => set("country", e.target.value)}
            style={inputStyle} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)}
              style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: "0.88rem", color: "var(--muted)" }}>Set as default address</span>
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline" style={{ flex: 1, padding: "12px 0" }}>Cancel</button>
        )}
        <button type="submit" className="btn-primary"
          style={{ flex: 1, justifyContent: "center", padding: "13px 0", opacity: saving ? 0.7 : 1 }}
          disabled={saving}>
          {saving ? "Saving…" : "Save Address"}
        </button>
      </div>
    </form>
  );
}