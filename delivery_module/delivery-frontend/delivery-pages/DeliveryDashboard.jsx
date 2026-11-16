import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

const STEP_MAP = {
  ASSIGNED:  { label: "New Order",    icon: "📦", color: "#4CC9F0", next: "accept",   nextLabel: "Accept Order" },
  ACCEPTED:  { label: "Accepted",     icon: "✅", color: "#C77DFF", next: "pickup",   nextLabel: "Mark Picked Up" },
  PICKED_UP: { label: "On the Way",   icon: "🛵", color: "#F4C842", next: "deliver",  nextLabel: "Mark Delivered" },
  DELIVERED: { label: "Delivered",    icon: "🎉", color: "#57CC99", next: null,       nextLabel: null },
  FAILED:    { label: "Failed",       icon: "❌", color: "#E63946", next: null,       nextLabel: null },
};

function useDeliveryAuth() {
  const navigate = useNavigate();
  const token   = localStorage.getItem("fh_delivery_token");
  const partner = (() => { try { return JSON.parse(localStorage.getItem("fh_delivery_partner")); } catch { return null; } })();

  useEffect(() => {
    if (!token || !partner) navigate("/delivery/login");
  }, [token, partner, navigate]);

  return { token, partner };
}

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { partner } = useDeliveryAuth();
  const [assignments,  setAssignments]  = useState([]);
  const [active,       setActive]       = useState(null); // current active assignment
  const [availability, setAvailability] = useState(partner?.availability || "OFFLINE");
  const [otpInput,     setOtpInput]     = useState("");
  const [loading,      setLoading]      = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,        setError]        = useState("");
  const locationRef = useRef(null);

  const deliveryApi = useCallback((path, method = "get", data = null) => {
    const token = localStorage.getItem("fh_delivery_token");
    const cfg   = { headers: { Authorization: `Bearer ${token}` } };
    return method === "get" ? api.get(path, cfg)
         : method === "patch" ? api.patch(path, data, cfg)
         : api.post(path, data, cfg);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await deliveryApi("/delivery/partner/assignments");
      const all  = res.data;
      setAssignments(all);
      const current = all.find((a) => ["ASSIGNED","ACCEPTED","PICKED_UP"].includes(a.status));
      setActive(current || null);
    } catch { setError("Failed to load assignments"); }
    finally { setLoading(false); }
  }, [deliveryApi]);

  useEffect(() => { load(); }, [load]);

  // Send GPS location every 30 seconds when online
  useEffect(() => {
    if (availability !== "ONLINE" && availability !== "BUSY") return;
    const sendLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        deliveryApi("/delivery/partner/location", "patch", {
          lat: coords.latitude, lng: coords.longitude,
        }).catch(() => {});
      });
    };
    sendLocation();
    locationRef.current = setInterval(sendLocation, 30000);
    return () => clearInterval(locationRef.current);
  }, [availability, deliveryApi]);

  const toggleAvailability = async () => {
    const next = availability === "ONLINE" ? "OFFLINE" : "ONLINE";
    try {
      await deliveryApi("/delivery/partner/availability", "patch", { availability: next });
      setAvailability(next);
      localStorage.setItem("fh_delivery_partner",
        JSON.stringify({ ...partner, availability: next }));
    } catch (e) { setError(e.response?.data?.error || "Failed to update availability"); }
  };

  const handleAction = async (assignment) => {
    const step = STEP_MAP[assignment.status];
    if (!step?.next) return;
    setActionLoading(true); setError("");
    try {
      const coords = await getCoords();
      if (step.next === "accept") {
        await deliveryApi(`/delivery/partner/assignments/${assignment.id}/accept`, "patch");
      } else if (step.next === "pickup") {
        await deliveryApi(`/delivery/partner/assignments/${assignment.id}/pickup`, "patch",
          { lat: coords?.lat, lng: coords?.lng });
      } else if (step.next === "deliver") {
        if (!otpInput.trim()) { setError("Enter the delivery OTP"); setActionLoading(false); return; }
        await deliveryApi(`/delivery/partner/assignments/${assignment.id}/deliver`, "patch",
          { otp: otpInput.trim() });
        setOtpInput("");
      }
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Action failed");
    } finally { setActionLoading(false); }
  };

  const getCoords = () =>
    new Promise((res) => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => res({ lat: coords.latitude, lng: coords.longitude }),
        () => res(null),
        { timeout: 5000 }
      );
    });

  const handleLogout = async () => {
    try { await deliveryApi("/delivery/auth/logout", "post"); } catch (_) {}
    localStorage.removeItem("fh_delivery_token");
    localStorage.removeItem("fh_delivery_partner");
    navigate("/delivery/login");
  };

  const completedToday = assignments.filter((a) => {
    if (a.status !== "DELIVERED" || !a.deliveredAt) return false;
    return new Date(a.deliveredAt).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.5rem" }}>🛵</span>
          <div>
            <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1rem" }}>{partner?.name}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{partner?.vehicleType} · {partner?.vehicleNumber}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Availability toggle */}
          <button onClick={toggleAvailability} style={{
            padding: "8px 18px", borderRadius: 50, fontWeight: 700, fontSize: "0.85rem",
            background: availability === "ONLINE" ? "rgba(87,204,153,0.15)" : "rgba(136,136,136,0.12)",
            color:      availability === "ONLINE" ? "#57CC99"               : "#888",
            border:     `1.5px solid ${availability === "ONLINE" ? "rgba(87,204,153,0.4)" : "var(--border)"}`,
            transition: "all 0.2s",
          }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: availability === "ONLINE" ? "#57CC99" : "#888", marginRight: 7, verticalAlign: "middle" }} />
            {availability === "ONLINE" ? "Online" : "Go Online"}
          </button>
          <button onClick={handleLogout} style={{ background: "transparent", color: "var(--muted)", fontSize: "0.85rem", padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 20px", maxWidth: 640, margin: "0 auto", width: "100%" }}>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 10, padding: "11px 14px", marginBottom: 20, color: "#E63946", fontSize: "0.87rem" }}>
            {error}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Today", value: completedToday, icon: "📦" },
            { label: "Total Deliveries", value: partner?.totalDeliveries || 0, icon: "🎯" },
            { label: "Rating", value: partner?.totalRatings > 0 ? `★ ${Number(partner.rating).toFixed(1)}` : "—", icon: "⭐" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{icon}</div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", marginBottom: 2 }}>{value}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Active assignment */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Loading assignments…</div>
        ) : active ? (
          <div className="card" style={{ padding: "24px", marginBottom: 24 }}>
            {(() => {
              const step = STEP_MAP[active.status];
              const order = active.order;
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: "2rem" }}>{step.icon}</span>
                    <div>
                      <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.1rem", color: step.color }}>
                        {step.label}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Order #{order?.id}</div>
                    </div>
                  </div>

                  {/* Order details */}
                  <div style={{ background: "var(--charcoal)", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>📍 Pickup</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.83rem", marginBottom: 14 }}>
                      Flamehaus Kitchen, 12 Jubilee Hills, Hyderabad
                    </p>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>🏠 Deliver to</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.83rem", marginBottom: 4 }}>{order?.customerName}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.83rem", marginBottom: 4 }}>📞 {order?.customerPhone}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.83rem" }}>{order?.deliveryAddress}</p>
                  </div>

                  <div style={{ background: "var(--charcoal)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: "0.83rem" }}>
                    <span style={{ color: "var(--muted)" }}>Items: </span>
                    <span>{order?.itemsSummary}</span>
                  </div>

                  {/* OTP input for delivery */}
                  {active.status === "PICKED_UP" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>
                        Ask customer for delivery OTP
                      </label>
                      <input
                        type="text" inputMode="numeric" maxLength={4}
                        value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="_ _ _ _"
                        style={{ width: "100%", fontSize: "1.8rem", letterSpacing: 12, textAlign: "center" }}
                      />
                    </div>
                  )}

                  {/* Action button */}
                  {step.next && (
                    <button
                      onClick={() => handleAction(active)}
                      disabled={actionLoading}
                      className="btn-primary"
                      style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: "1rem", opacity: actionLoading ? 0.7 : 1 }}>
                      {actionLoading ? "Updating…" : step.nextLabel}
                    </button>
                  )}

                  {/* Delivery OTP for ASSIGNED/ACCEPTED */}
                  {["ASSIGNED","ACCEPTED"].includes(active.status) && active.deliveryOtp && (
                    <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,107,53,0.08)", borderRadius: 8, textAlign: "center" }}>
                      <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: 4 }}>Your Delivery OTP (give to customer on arrival)</p>
                      <p style={{ fontFamily: "monospace", fontSize: "1.6rem", fontWeight: 800, color: "var(--flame)", letterSpacing: 6 }}>
                        {active.deliveryOtp}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="card" style={{ padding: "40px 24px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>
              {availability === "ONLINE" ? "⏳" : "😴"}
            </div>
            <p style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
              {availability === "ONLINE" ? "Waiting for orders…" : "You're Offline"}
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              {availability === "ONLINE"
                ? "Stay online — new orders will appear here automatically"
                : "Go Online above to start receiving delivery assignments"}
            </p>
          </div>
        )}

        {/* Recent deliveries */}
        {assignments.filter((a) => a.status === "DELIVERED").length > 0 && (
          <div>
            <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: "1rem", marginBottom: 14, color: "var(--muted)" }}>
              Recent Deliveries
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {assignments
                .filter((a) => a.status === "DELIVERED")
                .slice(0, 5)
                .map((a) => (
                  <div key={a.id} className="card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>Order #{a.order?.id}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{a.order?.customerName}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", background: "rgba(87,204,153,0.15)", color: "#57CC99", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>✓ Delivered</span>
                      {a.partnerRating && (
                        <p style={{ color: "#F4C842", fontSize: "0.75rem", marginTop: 4 }}>{"★".repeat(a.partnerRating)}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
