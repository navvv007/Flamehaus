import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { trackOrder, createPayment, verifyPayment } from "../../api/apiClient";

// ── Stripe Elements inner form ────────────────────────────────────────────────
function StripeForm({ clientSecret, gatewayOrderId, orderId, amount, onSuccess, onFail }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });
      if (error) { onFail(error.message); return; }
      if (paymentIntent.status === "succeeded") {
        await verifyPayment({
          gateway:          "STRIPE",
          gatewayOrderId,
          gatewayPaymentId: paymentIntent.id,
          gatewaySignature: "",
        });
        onSuccess();
      }
    } catch (err) {
      onFail(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>
          Card Details
        </label>
        <div style={{ background: "var(--charcoal)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
          <CardElement options={{
            style: {
              base:    { color: "#ffffff", fontFamily: "Inter, sans-serif", fontSize: "15px", "::placeholder": { color: "#555" } },
              invalid: { color: "#E63946" },
            },
          }} />
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 8 }}>
          Test card: 4242 4242 4242 4242 · Any future date · Any CVC
        </p>
      </div>
      <button type="submit" className="btn-primary"
        style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: "1rem", opacity: loading || !stripe ? 0.7 : 1 }}
        disabled={loading || !stripe}>
        {loading ? "Processing…" : `Pay ₹${amount}`}
      </button>
    </form>
  );
}

// ── Main Payment Page ─────────────────────────────────────────────────────────
export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate    = useNavigate();

  const [order,   setOrder]   = useState(null);
  const [gateway, setGateway] = useState("RAZORPAY");
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState("");

  // Stripe state
  const [stripePromise,        setStripePromise]        = useState(null);
  const [stripeClientSecret,   setStripeClientSecret]   = useState("");
  const [stripeGatewayOrderId, setStripeGatewayOrderId] = useState("");
  const [showStripeForm,       setShowStripeForm]       = useState(false);

  useEffect(() => {
    trackOrder(orderId)
      .then(r => setOrder(r.data))
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const amountINR   = order ? Math.round(order.total * 84) : 0;
  const amountPaise = amountINR * 100;

  // Use window.location for Razorpay callbacks — they run outside React's
  // render cycle so React Router's navigate() silently does nothing there.
  // For Stripe (which runs inside React), navigate() works fine but
  // window.location.href is equally correct and consistent.
  const goSuccess = () => {
    window.location.href = `/payment/success?orderId=${orderId}&gateway=${gateway}`;
  };

  const goFailed = (reason = "Payment was not completed.") => {
    window.location.href = `/payment/failed?orderId=${orderId}&gateway=${gateway}&reason=${encodeURIComponent(reason)}`;
  };

  // ── Razorpay ────────────────────────────────────────────────────────────────
  const handleRazorpay = async () => {
    setPaying(true); setError("");
    try {
      const res = await createPayment({ orderId: Number(orderId), gateway: "RAZORPAY" });
      const d   = res.data;

      const options = {
        key:         d.razorpayKeyId,
        amount:      d.amount,
        currency:    d.currency,
        name:        "Flamehaus",
        description: `Order #${orderId}`,
        order_id:    d.gatewayOrderId,
        prefill:     { name: d.customerName, contact: d.customerPhone },
        theme:       { color: "#FF6B35" },

        // ✅ SUCCESS — called by Razorpay after confirmed payment
        handler: async (response) => {
          try {
            await verifyPayment({
              gateway:          "RAZORPAY",
              gatewayOrderId:   response.razorpay_order_id,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature,
            });
            goSuccess();          // → /payment/success
          } catch (e) {
            goFailed("Payment verification failed. Your money is safe — contact support.");
          }
        },

        // ✅ FAILURE — Razorpay calls this when payment fails inside the modal
        "modal.ondismiss": () => {
          setPaying(false);       // user just closed — don't navigate away
        },
      };

      // Attach the payment failure callback
      // Razorpay v1 exposes this via the options object
      options.config = {
        display: { language: "en" },
      };

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const rzp = new window.Razorpay(options);

      // ✅ This event fires when Razorpay payment FAILS inside the modal
      rzp.on("payment.failed", (response) => {
        const reason = response.error?.description || response.error?.reason || "Payment failed";
        goFailed(reason);
      });

      rzp.open();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Failed to initialise Razorpay";
      setError(msg);
      setPaying(false);
    }
  };

  // ── Stripe ──────────────────────────────────────────────────────────────────
  const handleStripeInit = async () => {
    setPaying(true); setError("");
    try {
      const res = await createPayment({ orderId: Number(orderId), gateway: "STRIPE" });
      const d   = res.data;
      setStripeClientSecret(d.clientSecret);
      setStripeGatewayOrderId(d.gatewayOrderId);
      setStripePromise(loadStripe(d.stripePublishableKey));
      setShowStripeForm(true);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to initialise Stripe");
    } finally {
      setPaying(false);
    }
  };

  const onStripeSuccess = () => goSuccess();
  const onStripeFail    = (msg) => goFailed(msg);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
        <p>Loading order…</p>
      </div>
    </div>
  );

  if (error && !order) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>❌</div>
        <p style={{ color: "var(--muted)" }}>{error}</p>
        <Link to="/menu" className="btn-primary" style={{ marginTop: 24, display: "inline-flex" }}>Back to Menu</Link>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "60px 5%", maxWidth: 560, margin: "0 auto" }}>
      <Link to={`/orders/${orderId}`} style={{ color: "var(--muted)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
        ← Back to Order
      </Link>

      <div className="section-label" style={{ marginBottom: 8 }}>Secure Checkout</div>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "2rem", marginBottom: 6 }}>
        Pay for Order <span style={{ color: "var(--flame)" }}>#{orderId}</span>
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 36, fontSize: "0.9rem" }}>
        {order?.itemsSummary}
      </p>

      {/* Amount card */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: "rgba(255,107,53,0.25)" }}>
        <div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Due</p>
          <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "2rem", color: "var(--flame)" }}>₹{amountINR}</p>
        </div>
        <span style={{ fontSize: "2rem" }}>💳</span>
      </div>

      {/* Gateway selector */}
      {!showStripeForm && (
        <>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
            Choose Payment Method
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {[
              { key: "RAZORPAY", label: "Razorpay", sub: "UPI · Cards · Netbanking · Wallets", icon: "⚡" },
              { key: "STRIPE",   label: "Stripe",   sub: "International Cards",                 icon: "💳" },
            ].map(({ key, label, sub, icon }) => (
              <button key={key} onClick={() => setGateway(key)} style={{
                padding: "16px 18px", borderRadius: 12, textAlign: "left",
                background: gateway === key ? "rgba(255,107,53,0.1)" : "var(--card)",
                border: `1.5px solid ${gateway === key ? "var(--flame)" : "var(--border)"}`,
                transition: "all 0.2s", cursor: "pointer",
              }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{icon}</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>{label}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{sub}</div>
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#E63946", fontSize: "0.88rem" }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: "1rem", opacity: paying ? 0.7 : 1 }}
            onClick={gateway === "RAZORPAY" ? handleRazorpay : handleStripeInit}
            disabled={paying}>
            {paying
              ? "Initialising…"
              : `Pay ₹${amountINR} with ${gateway === "RAZORPAY" ? "Razorpay" : "Stripe"}`}
          </button>
        </>
      )}

      {/* Stripe card form */}
      {showStripeForm && stripePromise && stripeClientSecret && (
        <div className="card" style={{ padding: "28px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <span style={{ fontSize: "1.4rem" }}>💳</span>
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}>Pay with Stripe</span>
          </div>
          {error && (
            <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#E63946", fontSize: "0.88rem" }}>
              ⚠️ {error}
            </div>
          )}
          <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
            <StripeForm
              clientSecret={stripeClientSecret}
              gatewayOrderId={stripeGatewayOrderId}
              orderId={orderId}
              amount={amountINR}
              onSuccess={onStripeSuccess}
              onFail={onStripeFail}
            />
          </Elements>
          <button onClick={() => { setShowStripeForm(false); setError(""); }}
            style={{ width: "100%", marginTop: 12, background: "transparent", color: "var(--muted)", fontSize: "0.85rem", padding: "10px 0" }}>
            ← Choose different method
          </button>
        </div>
      )}

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.78rem", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        🔒 256-bit SSL encrypted · PCI DSS compliant
      </p>
    </div>
  );
}
