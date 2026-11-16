import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp }  from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/apiClient";
import CouponInput   from "../components/CouponInput";
import SavedAddresses from "../components/SavedAddresses";
import AddressForm   from "../components/AddressForm";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useApp();
  const { customer, isCustomer } = useAuth();
  const navigate = useNavigate();

  const [addrMode, setAddrMode]   = useState(isCustomer ? "saved" : "new"); // "saved" | "new"
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [newAddr,  setNewAddr]    = useState({ label:"Home", addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", pincode:"", country:"India", latitude:null, longitude:null });
  const [name,     setName]       = useState(customer?.name  || "");
  const [phone,    setPhone]      = useState(customer?.phone || "");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [placing,  setPlacing]    = useState(false);
  const [error,    setError]      = useState("");

  const totalInr    = Math.round((cartTotal || 0) * 84);
  const discountInr = appliedCoupon ? Math.round(appliedCoupon.discountAmountInr) : 0;
  const finalInr    = totalInr - discountInr;

  const getDeliveryAddress = () => {
    if (addrMode === "saved" && selectedAddr) {
      return [selectedAddr.addressLine1, selectedAddr.addressLine2, selectedAddr.landmark,
              selectedAddr.city, selectedAddr.state, selectedAddr.pincode]
             .filter(Boolean).join(", ");
    }
    return [newAddr.addressLine1, newAddr.addressLine2, newAddr.landmark,
            newAddr.city, newAddr.state, newAddr.pincode]
           .filter(Boolean).join(", ");
  };

  const getCoords = () => {
    if (addrMode === "saved" && selectedAddr) return { lat: selectedAddr.latitude, lng: selectedAddr.longitude };
    return { lat: newAddr.latitude, lng: newAddr.longitude };
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError("Please enter your name and phone"); return; }
    const deliveryAddress = getDeliveryAddress();
    if (!deliveryAddress.trim()) { setError("Please select or enter a delivery address"); return; }

    setPlacing(true); setError("");
    try {
      const token   = localStorage.getItem("fh_customer_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const coords  = getCoords();
      const addr    = addrMode === "saved" && selectedAddr ? selectedAddr : newAddr;

      const res = await api.post("/orders", {
        customerName:    name,
        customerPhone:   phone,
        deliveryAddress,
        addressLine1:    addr.addressLine1,
        addressLine2:    addr.addressLine2,
        landmark:        addr.landmark,
        city:            addr.city,
        state:           addr.state,
        pincode:         addr.pincode,
        total:           finalInr / 84,
        itemsSummary:    cart.map(i => `${i.name} x${i.qty}`).join(", "),
        deliveryLat:     coords.lat,
        deliveryLng:     coords.lng,
      }, { headers });

      const orderId = res.data.id;
      if (appliedCoupon?.couponCode)
        await api.post("/coupons/apply", { code: appliedCoupon.couponCode, orderId, customerId: customer?.id || null }, { headers }).catch(() => {});

      clearCart();
      navigate(`/payment/${orderId}`);
    } catch(err) { setError(err.response?.data?.error || "Failed to place order"); }
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
        {/* Left — items + coupon */}
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
            <p style={{ fontFamily:"Syne,sans-serif", fontWeight:700, marginBottom:14 }}>🎟 Discount Coupon</p>
            <CouponInput orderTotalInr={totalInr} appliedCoupon={appliedCoupon} onApply={setAppliedCoupon} onRemove={()=>setAppliedCoupon(null)} />
          </div>
        </div>

        {/* Right — summary + delivery */}
        <div style={{ position:"sticky", top:100 }}>
          {/* Summary */}
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
            {discountInr > 0 && <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(87,204,153,0.08)", borderRadius:8, textAlign:"center", fontSize:"0.82rem", color:"#57CC99" }}>🎉 You save ₹{discountInr}!</div>}
          </div>

          {/* Delivery */}
          <div className="card" style={{ padding:"24px" }}>
            <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:"1.1rem", marginBottom:18 }}>Delivery Details</h3>

            {error && <div style={{ background:"rgba(230,57,70,0.1)", border:"1px solid rgba(230,57,70,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:14, color:"#E63946", fontSize:"0.85rem" }}>{error}</div>}

            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>NAME *</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={{ width:"100%" }} required />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:"0.78rem", color:"var(--muted)", fontWeight:600, marginBottom:6 }}>PHONE *</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" style={{ width:"100%" }} required />
            </div>

            {/* Address mode tabs */}
            {isCustomer && (
              <div style={{ display:"flex", background:"var(--charcoal)", borderRadius:10, padding:4, marginBottom:16 }}>
                {[["saved","📍 Saved"],["new","✏️ New"]].map(([k,l]) => (
                  <button key={k} type="button" onClick={()=>setAddrMode(k)} style={{
                    flex:1, padding:"8px 0", borderRadius:8, fontWeight:600, fontSize:"0.85rem",
                    background: addrMode===k ? "var(--flame)" : "transparent",
                    color:      addrMode===k ? "#fff"         : "var(--muted)",
                  }}>{l}</button>
                ))}
              </div>
            )}

            {addrMode === "saved" && isCustomer ? (
              <SavedAddresses onSelect={setSelectedAddr} selectedId={selectedAddr?.id} />
            ) : (
              <AddressForm initial={newAddr} onSave={addr => setNewAddr(addr)} saving={false} />
            )}

            <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary"
              style={{ width:"100%", justifyContent:"center", padding:"14px 0", fontSize:"1rem", marginTop:20, opacity:placing?0.7:1 }}>
              {placing ? "Placing Order…" : `Place Order · ₹${finalInr}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}