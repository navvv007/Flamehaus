import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { trackOrder, createPayment, verifyPayment } from "../../api/apiClient";

/* ── Stripe inner form ────────────────────────────────────────────────────── */
function StripeForm({ clientSecret, gatewayOrderId, orderId, amount, onSuccess, onFail }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setCardError("");
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });
      if (error) {
        // Payment failed inside Stripe → stay on page with error shown
        setCardError(error.message);
        onFail(error.message);
        return;
      }
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
      const msg = err.response?.data?.error || err.message;
      setCardError(msg);
      onFail(msg);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handlePay}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)", fontWeight: 600, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>
          Card Details
        </label>
        <div style={{ background: "var(--charcoal)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
          <CardElement options={{
            style: {
              base:    { color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "15px", "::placeholder": { color: "#555" } },
              invalid: { color: "#E63946" },
            },
          }} />
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 8 }}>
          Test card: 4242 4242 4242 4242 · Any future date · Any CVC
        </p>
      </div>

      {/* Stripe card error shown inline — no redirect */}
      {cardError && (
        <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#E63946", fontSize: "0.87rem" }}>
          ⚠️ {cardError}
        </div>
      )}

      <button type="submit" className="btn-primary"
        style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: "1rem", opacity: loading || !stripe ? 0.7 : 1 }}
        disabled={loading || !stripe}>
        {loading ? "Processing…" : `Pay ₹${amount}`}
      </button>
    </form>
  );
}

/* ── Main Payment Page ────────────────────────────────────────────────────── */
export default function PaymentPage() {
  const { orderId } = useParams();

  const [order,   setOrder]   = useState(null);
  const [gateway, setGateway] = useState("RAZORPAY");
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState("");

  // Stripe state
  const [stripePromise,      setStripePromise]      = useState(null);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeGwOrderId,    setStripeGwOrderId]    = useState("");
  const [showStripeForm,     setShowStripeForm]      = useState(false);

  useEffect(() => {
    trackOrder(orderId)
      .then(r  => setOrder(r.data))
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const amountINR   = order ? Math.round(order.total * 84) : 0;
  const amountPaise = amountINR * 100;

  // ── Navigate after payment ─────────────────────────────────────────────────
  // On SUCCESS → /payment/success (with countdown to order detail)
  const goSuccess = () => {
    window.location.href = `/payment/success?orderId=${orderId}&gateway=${gateway}`;
  };

  // On FAILURE → STAY ON THIS PAGE (payment gateway page) so customer can retry
  // Show the error inline — do NOT redirect away from the payment page
  const goFailed = (reason = "Payment was not completed.") => {
    setError(`Payment failed: ${reason}. Please try again or use a different payment method.`);
    setPaying(false);
    setShowStripeForm(false); // reset stripe form so they can retry
  };

  // ── Razorpay ───────────────────────────────────────────────────────────────
  const handleRazorpay = async () => {
    setPaying(true); setError("");
    try {
      const res = await createPayment({ orderId: Number(orderId), gateway: "RAZORPAY" });
      const d   = res.data;

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const options = {
        key:         d.razorpayKeyId,
        amount:      d.amount,
        currency:    d.currency,
        name:        "Flamehaus",
        description: `Order #${orderId}`,
        order_id:    d.gatewayOrderId,
        prefill:     { name: d.customerName, contact: d.customerPhone },
        theme:       { color: "#FF6B35" },

        // ✅ SUCCESS → redirect to success page
        handler: async (response) => {
          try {
            await verifyPayment({
              gateway:          "RAZORPAY",
              gatewayOrderId:   response.razorpay_order_id,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature,
            });
            goSuccess();
          } catch {
            goFailed("Payment verification failed. Your money is safe — contact support.");
          }
        },

        // ✅ DISMISS — user closed modal without paying → stay on page
        "modal.ondismiss": () => {
          setPaying(false);
          setError("Payment cancelled. You can try again below.");
        },
      };

      const rzp = new window.Razorpay(options);

      // ✅ FAILURE → show error inline on this page, do NOT redirect away
      rzp.on("payment.failed", (response) => {
        const reason = response.error?.description || response.error?.reason || "Payment failed";
        goFailed(reason);
      });

      rzp.open();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to initialise Razorpay");
      setPaying(false);
    }
  };

  // ── Stripe ─────────────────────────────────────────────────────────────────
  const handleStripeInit = async () => {
    setPaying(true); setError("");
    try {
      const res = await createPayment({ orderId: Number(orderId), gateway: "STRIPE" });
      const d   = res.data;
      setStripeClientSecret(d.clientSecret);
      setStripeGwOrderId(d.gatewayOrderId);
      setStripePromise(loadStripe(d.stripePublishableKey));
      setShowStripeForm(true);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to initialise Stripe");
    } finally { setPaying(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "var(--muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
        <p>Loading order…</p>
      </div>
    </div>
  );

  if (!order && error) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>❌</div>
        <p style={{ color: "var(--muted)" }}>{error}</p>
        <Link to="/menu" className="btn-primary" style={{ marginTop: 24, display: "inline-flex" }}>
          Back to Menu
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "60px 5%", maxWidth: 560, margin: "0 auto" }}>
      <Link to={`/orders/${orderId}`} style={{ color: "var(--muted)", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
        ← Back to Order
      </Link>

      <div className="section-label" style={{ marginBottom: 8 }}>Secure Checkout</div>
      <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "2rem", marginBottom: 6 }}>
        Pay for Order <span style={{ color: "var(--flame)" }}>#{orderId}</span>
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 36, fontSize: "0.9rem" }}>
        {order?.itemsSummary}
      </p>

      {/* Amount */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: "rgba(255,107,53,0.25)" }}>
        <div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Due</p>
          <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "2rem", color: "var(--flame)" }}>₹{amountINR}</p>
        </div>
        <span style={{ fontSize: "2rem" }}>💳</span>
      </div>

      {/* Error banner — shown inline on this page instead of redirecting */}
      {error && (
        <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ color: "#E63946", fontWeight: 600, marginBottom: 6 }}>⚠️ Payment Failed</p>
          <p style={{ color: "var(--muted)", fontSize: "0.87rem" }}>{error}</p>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 8 }}>
            No charge was made. Choose a payment method below to try again.
          </p>
        </div>
      )}

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
              <button key={key} onClick={() => { setGateway(key); setError(""); }} style={{
                padding: "16px 18px", borderRadius: 12, textAlign: "left",
                background: gateway === key ? "rgba(255,107,53,0.1)" : "var(--card)",
                border: `1.5px solid ${gateway === key ? "var(--flame)" : "var(--border)"}`,
                transition: "all 0.2s", cursor: "pointer",
              }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{icon}</div>
                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>{label}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{sub}</div>
              </button>
            ))}
          </div>

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

      {/* Stripe form */}
      {showStripeForm && stripePromise && stripeClientSecret && (
        <div className="card" style={{ padding: "28px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <span style={{ fontSize: "1.4rem" }}>💳</span>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700 }}>Pay with Stripe</span>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
            <StripeForm
              clientSecret={stripeClientSecret}
              gatewayOrderId={stripeGwOrderId}
              orderId={orderId}
              amount={amountINR}
              onSuccess={goSuccess}
              onFail={goFailed}
            />
          </Elements>
          <button onClick={() => { setShowStripeForm(false); setError(""); }}
            style={{ width: "100%", marginTop: 14, background: "transparent", color: "var(--muted)", fontSize: "0.85rem", padding: "10px 0" }}>
            ← Try a different payment method
          </button>
        </div>
      )}

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.78rem", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        🔒 256-bit SSL encrypted · PCI DSS compliant
      </p>
    </div>
  );
}
