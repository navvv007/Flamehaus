import SavedAddresses from "../components/SavedAddresses";
import { Link } from "react-router-dom";

export default function AddressPage() {
  return (
    <div style={{ padding:"60px 5%", maxWidth:640, margin:"0 auto" }}>
      <div className="section-label" style={{ marginBottom:8 }}>Account</div>
      <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:"2rem", marginBottom:8 }}>My Addresses</h1>
      <p style={{ color:"var(--muted)", fontSize:"0.9rem", marginBottom:36 }}>
        Saved addresses for faster checkout
      </p>
      <SavedAddresses />
      <div style={{ marginTop:32 }}>
        <Link to="/my-orders" style={{ color:"var(--muted)", fontSize:"0.88rem" }}>← Back to My Orders</Link>
      </div>
    </div>
  );
}