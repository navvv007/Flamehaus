import { useState, useEffect } from "react";
import api from "../../api/apiClient";

const EMPTY = { code:"", description:"", discountType:"PERCENTAGE", discountValue:"", minimumOrderAmount:700, maximumDiscount:"", usageLimit:"", perCustomerLimit:1, expiresAt:"" };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("fh_admin_token");
  const cfg = { headers: { Authorization: `Bearer ${token}` } };

  const load = () => { setLoading(true); api.get("/admin/coupons", cfg).then(r => setCoupons(r.data)).catch(() => setError("Failed to load")).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setFormErr(""); setShowForm(true); };
  const openEdit = (c) => {
    setForm({ code:c.code, description:c.description, discountType:c.discountType, discountValue:c.discountValue, minimumOrderAmount:c.minimumOrderAmount, maximumDiscount:c.maximumDiscount||"", usageLimit:c.usageLimit||"", perCustomerLimit:c.perCustomerLimit, expiresAt:c.expiresAt?c.expiresAt.substring(0,10):"" });
    setEditing(c.id); setFormErr(""); setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setFormErr("");
    const body = { ...form, discountValue:Number(form.discountValue), minimumOrderAmount:Number(form.minimumOrderAmount), maximumDiscount:form.maximumDiscount?Number(form.maximumDiscount):null, usageLimit:form.usageLimit?Number(form.usageLimit):null, perCustomerLimit:Number(form.perCustomerLimit), expiresAt:form.expiresAt?form.expiresAt+"T23:59:59":null };
    try {
      editing ? await api.put(`/admin/coupons/${editing}`, body, cfg) : await api.post("/admin/coupons", body, cfg);
      setShowForm(false); load();
    } catch(err) { setFormErr(err.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ padding:"40px 36px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 }}>
        <div>
          <div className="section-label">Promotions</div>
          <h1 style={{ fontSize:"2rem" }}>Discount Coupons</h1>
          <p style={{ color:"var(--muted)", fontSize:"0.88rem", marginTop:4 }}>Auto-applied on orders above minimum amount (default ₹700)</p>
        </div>
        <button onClick={openCreate} className="btn-primary" style={{ padding:"11px 24px" }}>+ New Coupon</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:28 }}>
        {[{l:"Total",v:coupons.length,i:"🎟"},{l:"Active",v:coupons.filter(c=>c.active).length,i:"✅"},{l:"Times Used",v:coupons.reduce((s,c)=>s+c.usageCount,0),i:"📊"},{l:"Min Order",v:"₹700+",i:"🔒"}].map(({l,v,i})=>(
          <div key={l} className="card" style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:"1.4rem", marginBottom:6 }}>{i}</div>
            <div style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"1.4rem" }}>{v}</div>
            <div style={{ color:"var(--muted)", fontSize:"0.78rem" }}>{l}</div>
          </div>
        ))}
      </div>

      {error && <p style={{ color:"#E63946", marginBottom:16 }}>{error}</p>}

      {loading ? <div style={{ textAlign:"center", padding:60, color:"var(--muted)" }}>Loading…</div> :
      coupons.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🎟</div>
          <p style={{ color:"var(--muted)" }}>No coupons yet. Create your first one.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow:"hidden", padding:0 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--charcoal)" }}>
                {["Code","Description","Discount","Min Order","Usage","Expires","Status","Actions"].map(h=>(
                  <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:"0.75rem", color:"var(--muted)", fontWeight:600, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c,i) => (
                <tr key={c.id} style={{ borderBottom:i<coupons.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"13px 14px" }}><code style={{ background:"var(--charcoal)", padding:"3px 8px", borderRadius:6, color:"var(--flame)", fontWeight:700 }}>{c.code}</code></td>
                  <td style={{ padding:"13px 14px", fontSize:"0.85rem", color:"var(--muted)" }}>{c.description}</td>
                  <td style={{ padding:"13px 14px" }}>
                    <span style={{ fontWeight:700, color:"#57CC99" }}>{c.discountType==="PERCENTAGE"?`${c.discountValue}%`:`₹${c.discountValue}`} off</span>
                    {c.maximumDiscount && <span style={{ color:"var(--muted)", fontSize:"0.72rem", display:"block" }}>max ₹{c.maximumDiscount}</span>}
                  </td>
                  <td style={{ padding:"13px 14px", fontSize:"0.87rem" }}>₹{c.minimumOrderAmount}</td>
                  <td style={{ padding:"13px 14px", fontSize:"0.87rem" }}>
                    {c.usageCount}{c.usageLimit?`/${c.usageLimit}`:""}
                    <span style={{ color:"var(--muted)", fontSize:"0.72rem", display:"block" }}>{c.perCustomerLimit}x/customer</span>
                  </td>
                  <td style={{ padding:"13px 14px", fontSize:"0.82rem", color:"var(--muted)" }}>{c.expiresAt?new Date(c.expiresAt).toLocaleDateString("en-IN"):"—"}</td>
                  <td style={{ padding:"13px 14px" }}>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:700, background:c.active?"rgba(87,204,153,0.15)":"rgba(136,136,136,0.1)", color:c.active?"#57CC99":"#888" }}>
                      {c.active?"Active":"Inactive"}
                    </span>
                  </td>
                  <td style={{ padding:"13px 14px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openEdit(c)} style={{ padding:"5px 10px", borderRadius:6, fontSize:"0.76rem", background:"var(--charcoal)", border:"1px solid var(--border)", color:"var(--muted)", cursor:"pointer" }}>Edit</button>
                      <button onClick={()=>api.patch(`/admin/coupons/${c.id}/toggle`,{},cfg).then(load)} style={{ padding:"5px 10px", borderRadius:6, fontSize:"0.76rem", background:"var(--charcoal)", border:"1px solid var(--border)", color:c.active?"#E63946":"#57CC99", cursor:"pointer" }}>
                        {c.active?"Disable":"Enable"}
                      </button>
                      <button onClick={()=>window.confirm("Delete?")&&api.delete(`/admin/coupons/${c.id}`,cfg).then(load)} style={{ padding:"5px 10px", borderRadius:6, fontSize:"0.76rem", background:"rgba(230,57,70,0.08)", border:"1px solid rgba(230,57,70,0.2)", color:"#E63946", cursor:"pointer" }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
          <div className="card fade-in" style={{ width:"100%", maxWidth:520, padding:"36px 32px", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.4rem" }}>{editing?"Edit Coupon":"New Coupon"}</h2>
              <button onClick={()=>setShowForm(false)} style={{ background:"transparent", color:"var(--muted)", fontSize:"1.3rem" }}>✕</button>
            </div>
            {formErr && <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"#E63946", fontSize:"0.87rem" }}>{formErr}</div>}
            <form onSubmit={handleSave}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>COUPON CODE *</label>
                  <input value={form.code} onChange={e=>set("code",e.target.value.toUpperCase())} placeholder="e.g. FLAME20" style={{ width:"100%", fontFamily:"monospace", letterSpacing:2 }} required />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>DESCRIPTION *</label>
                  <input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="e.g. 20% off on orders above ₹700" style={{ width:"100%" }} required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>DISCOUNT TYPE</label>
                  <select value={form.discountType} onChange={e=>set("discountType",e.target.value)} style={{ width:"100%" }}>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>{form.discountType==="PERCENTAGE"?"PERCENTAGE *":"AMOUNT (₹) *"}</label>
                  <input type="number" min="1" value={form.discountValue} onChange={e=>set("discountValue",e.target.value)} placeholder={form.discountType==="PERCENTAGE"?"e.g. 20":"e.g. 100"} style={{ width:"100%" }} required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>MIN ORDER (₹) *</label>
                  <input type="number" min="1" value={form.minimumOrderAmount} onChange={e=>set("minimumOrderAmount",e.target.value)} style={{ width:"100%" }} required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>MAX DISCOUNT CAP (₹)</label>
                  <input type="number" min="1" value={form.maximumDiscount} onChange={e=>set("maximumDiscount",e.target.value)} placeholder="No cap" style={{ width:"100%" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>TOTAL USAGE LIMIT</label>
                  <input type="number" min="1" value={form.usageLimit} onChange={e=>set("usageLimit",e.target.value)} placeholder="Unlimited" style={{ width:"100%" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>PER CUSTOMER LIMIT</label>
                  <input type="number" min="1" value={form.perCustomerLimit} onChange={e=>set("perCustomerLimit",e.target.value)} style={{ width:"100%" }} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>EXPIRY DATE (optional)</label>
                  <input type="date" value={form.expiresAt} onChange={e=>set("expiresAt",e.target.value)} style={{ width:"100%" }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:24 }}>
                <button type="button" onClick={()=>setShowForm(false)} className="btn-outline" style={{ flex:1, padding:"12px 0" }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex:1, justifyContent:"center", padding:"12px 0", opacity:saving?0.7:1 }} disabled={saving}>
                  {saving?"Saving…":editing?"Update":"Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}