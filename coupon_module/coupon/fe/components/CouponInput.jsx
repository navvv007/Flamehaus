import { useState } from "react";
import api from "../../api/apiClient";

export default function CouponInput({ orderTotalInr, onApply, onRemove, appliedCoupon }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showList, setShowList] = useState(false);
  const [available, setAvailable] = useState([]);

  const token = localStorage.getItem("fh_customer_token");
  const customerId = (() => { try { const r = localStorage.getItem("fh_customer"); return r ? JSON.parse(r).id : null; } catch { return null; } })();

  const handleApply = async (e) => {
    e?.preventDefault();
    if (!code.trim()) { setError("Enter a coupon code"); return; }
    if (orderTotalInr < 700) { setError("Coupons available only on orders above ₹700"); return; }
    setLoading(true); setError("");
    try {
      const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.post("/coupons/validate", { code: code.trim().toUpperCase(), orderTotalInr, customerId }, cfg);
      onApply(res.data);
    } catch(err) { setError(err.response?.data?.error || "Invalid coupon code"); }
    finally { setLoading(false); }
  };

  const loadAvailable = async () => {
    if (available.length > 0) { setShowList(!showList); return; }
    try {
      const r = await api.get("/coupons/active");
      setAvailable(r.data.filter(c => orderTotalInr >= c.minimumOrderAmount));
      setShowList(true);
    } catch(_) {}
  };

  if (appliedCoupon) return (
    <div style={{ background:"rgba(87,204,153,0.08)", border:"1px solid rgba(87,204,153,0.25)", borderRadius:12, padding:"14px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:"1.3rem" }}>🎟</span>
          <div>
            <p style={{ fontWeight:700, color:"#57CC99", fontSize:"0.9rem" }}>
              <code style={{ background:"rgba(87,204,153,0.15)", padding:"2px 8px", borderRadius:6 }}>{appliedCoupon.couponCode}</code> applied!
            </p>
            <p style={{ color:"var(--muted)", fontSize:"0.78rem", marginTop:2 }}>{appliedCoupon.description}</p>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ color:"#57CC99", fontWeight:700, fontSize:"1rem" }}>−₹{Math.round(appliedCoupon.discountAmountInr)}</p>
          <button onClick={onRemove} style={{ background:"transparent", color:"var(--muted)", fontSize:"0.75rem", marginTop:2 }}>Remove ✕</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <form onSubmit={handleApply} style={{ display:"flex", gap:8 }}>
        <input type="text" value={code} onChange={e=>{ setCode(e.target.value.toUpperCase()); setError(""); }}
          placeholder="Enter coupon code" disabled={orderTotalInr < 700}
          style={{ flex:1, fontFamily:"monospace", letterSpacing:1, textTransform:"uppercase" }} />
        <button type="submit" className="btn-primary" style={{ padding:"10px 20px", opacity:loading||orderTotalInr<700?0.7:1 }} disabled={loading||orderTotalInr<700}>
          {loading?"…":"Apply"}
        </button>
      </form>

      {orderTotalInr < 700 && <p style={{ color:"var(--muted)", fontSize:"0.78rem", marginTop:6 }}>Add ₹{Math.ceil(700-orderTotalInr)} more to unlock coupons</p>}
      {error && <p style={{ color:"#E63946", fontSize:"0.82rem", marginTop:6 }}>{error}</p>}

      {orderTotalInr >= 700 && (
        <button type="button" onClick={loadAvailable} style={{ background:"transparent", color:"var(--flame)", fontSize:"0.8rem", marginTop:8, fontWeight:600 }}>
          🎟 {showList?"Hide":"View available coupons"}
        </button>
      )}

      {showList && available.length > 0 && (
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
          {available.map(c => (
            <button key={c.code} type="button" onClick={()=>{ setCode(c.code); setShowList(false); }}
              style={{ padding:"10px 14px", borderRadius:10, textAlign:"left", background:"var(--charcoal)", border:"1px solid var(--border)", cursor:"pointer", transition:"border-color 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--flame)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <code style={{ color:"var(--flame)", fontWeight:700 }}>{c.code}</code>
                <span style={{ color:"#57CC99", fontWeight:700, fontSize:"0.88rem" }}>{c.discountType==="PERCENTAGE"?`${c.discountValue}% off`:`₹${c.discountValue} off`}</span>
              </div>
              <p style={{ color:"var(--muted)", fontSize:"0.75rem", marginTop:3 }}>{c.description}</p>
            </button>
          ))}
        </div>
      )}
      {showList && available.length === 0 && <p style={{ color:"var(--muted)", fontSize:"0.8rem", marginTop:8 }}>No coupons available for this order amount.</p>}
    </div>
  );
}