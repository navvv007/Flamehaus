import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp }  from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/apiClient";
import CouponInput from "../components/CouponInput";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useApp();
  const { customer, isCustomer } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name:customer?.name||"", phone:customer?.phone||"", address:"" });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const totalInr    = Math.round((cartTotal||0)*84);
  const discountInr = appliedCoupon ? Math.round(appliedCoupon.discountAmountInr) : 0;
  const finalInr    = totalInr - discountInr;

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!form.name.trim()||!form.phone.trim()||!form.address.trim()) { setError("Please fill all delivery details"); return; }
    setPlacing(true); setError("");
    try {
      const token = localStorage.getItem("fh_customer_token");
      const headers = token ? { Authorization:`Bearer ${token}` } : {};
      const res = await api.post("/orders", {
        customerName:    form.name,
        customerPhone:   form.phone,
        deliveryAddress: form.address,
        total:           finalInr/84,
        itemsSummary:    cart.map(i=>`${i.name} x${i.qty}`).join(", "),
      }, { headers });
      const orderId = res.data.id;
      if (appliedCoupon?.couponCode) {
        await api.post("/coupons/apply", { code:appliedCoupon.couponCode, orderId, customerId:customer?.id||null }, { headers }).catch(()=>{});
      }
      clearCart();
      navigate(`/payment/${orderId}`);
    } catch(err) { setError(err.response?.data?.error||"Failed to place order"); }
    finally { setPlacing(false); }
  };

  if (cart.length === 0) return (
    <div style={{ minHeight:"70vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, padding:40 }}>
      <div style={{ fontSize:"3rem" }}>🛒</div>
      <h2 style={{ fontFamily:"Syne,sans-serif" }}>Your cart is empty</h2>
      <Link to="/menu" className="btn-primary" style={{ marginTop:8 }}>Browse Menu</Link>
    </div>
  );

  return (
    <div style={{ padding:"60px 5%", maxWidth:1100, margin:"0 auto" }}>
      <div className="section-label" style={{ marginBottom:8 }}>Your Order</div>
      <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"2.2rem", marginBottom:36 }}>Cart</h1>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 400px", gap:32, alignItems:"start" }}>

        {/* Items */}
        <div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
            {cart.map(item => (
              <div key={item.id} className="card" style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ fontSize:"2rem", width:52, height:52, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--charcoal)", borderRadius:10, flexShrink:0 }}>{item.image}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, marginBottom:2 }}>{item.name}</p>
                  <p style={{ color:"var(--flame)", fontWeight:700 }}>₹{Math.round(item.price*84)}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <button onClick={()=>updateQuantity(item.id,item.qty-1)} style={{ width:30, height:30, borderRadius:"50%", background:"var(--charcoal)", border:"1px solid var(--border)", fontWeight:700 }}>−</button>
                  <span style={{ fontWeight:700, minWidth:20, textAlign:"center" }}>{item.qty}</span>
                  <button onClick={()=>updateQuantity(item.id,item.qty+1)} style={{ width:30, height:30, borderRadius:"50%", background:"var(--charcoal)", border:"1px solid var(--border)", fontWeight:700 }}>+</button>
                </div>
                <p style={{ fontWeight:700, minWidth:70, textAlign:"right" }}>₹{Math.round(item.price*84*item.qty)}</p>
                <button onClick={()=>removeFromCart(item.id)} style={{ background:"transparent", color:"#E63946", fontSize:"1.1rem", padding:"4px 8px" }}>✕</button>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="card" style={{ padding:"20px 22px", marginBottom:24 }}>
            <p style={{ fontFamily:"Syne,sans-serif", fontWeight:700, marginBottom:14 }}>
              🎟 Discount Coupon
              {totalInr < 700 && <span style={{ color:"var(--muted)", fontSize:"0.8rem", fontWeight:400 }}> — available on orders above ₹700</span>}
            </p>
            <CouponInput orderTotalInr={totalInr} appliedCoupon={appliedCoupon} onApply={setAppliedCoupon} onRemove={()=>setAppliedCoupon(null)} />
          </div>
        </div>

        {/* Summary + form */}
        <div style={{ position:"sticky", top:100 }}>
          <div className="card" style={{ padding:"24px", marginBottom:20 }}>
            <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.1rem", marginBottom:18 }}>Order Summary</h3>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:"0.9rem" }}><span style={{ color:"var(--muted)" }}>Subtotal</span><span>₹{totalInr}</span></div>
            {discountInr > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:"0.9rem" }}><span style={{ color:"#57CC99" }}>Coupon ({appliedCoupon.couponCode})</span><span style={{ color:"#57CC99", fontWeight:700 }}>−₹{discountInr}</span></div>}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:"0.9rem" }}><span style={{ color:"var(--muted)" }}>Delivery</span><span style={{ color:"#57CC99" }}>Free</span></div>
            <div style={{ borderTop:"1px solid var(--border)", paddingTop:14, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700 }}>Total</span>
              <div style={{ textAlign:"right" }}>
                {discountInr > 0 && <p style={{ color:"var(--muted)", fontSize:"0.8rem", textDecoration:"line-through" }}>₹{totalInr}</p>}
                <p style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:"1.3rem", color:"var(--flame)" }}>₹{finalInr}</p>
              </div>
            </div>
            {discountInr > 0 && <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(87,204,153,0.08)", borderRadius:8, textAlign:"center", fontSize:"0.82rem", color:"#57CC99" }}>🎉 You save ₹{discountInr} with {appliedCoupon.couponCode}!</div>}
          </div>

          <div className="card" style={{ padding:"24px" }}>
            <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.1rem", marginBottom:18 }}>Delivery Details</h3>
            {error && <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:14, color:"#E63946", fontSize:"0.85rem" }}>{error}</div>}
            <form onSubmit={handlePlaceOrder}>
              {[["name","NAME","Your full name","text"],["phone","PHONE","+91XXXXXXXXXX","tel"],["address","DELIVERY ADDRESS","House/Flat, Street, Area","text"]].map(([k,l,ph,t]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>{l} *</label>
                  {k==="address"
                    ? <textarea value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} rows={3} style={{ width:"100%", resize:"none" }} required />
                    : <input type={t} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} style={{ width:"100%" }} required />}
                </div>
              ))}
              <button type="submit" className="btn-primary" style={{ width:"100%", justifyContent:"center", padding:"14px 0", fontSize:"1rem", opacity:placing?0.7:1 }} disabled={placing}>
                {placing?"Placing Order…":`Place Order · ₹${finalInr}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}