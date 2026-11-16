import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../api/apiClient";

const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("fh_admin_token")}` } });

const STATE = {
  ON_TRACK: { color: "#57CC99", label: "On track" },
  WARNING:  { color: "#F4C842", label: "Running late" },
  OVERDUE:  { color: "#E63946", label: "Overdue" },
};
const REFUND = {
  INITIATED:      { color: "#57CC99", label: "Refund initiated" },
  COMPLETED:      { color: "#57CC99", label: "Refunded" },
  FAILED:         { color: "#E63946", label: "Refund failed" },
  NOT_APPLICABLE: { color: "#888",    label: "No payment" },
};

const fmtMin = (m) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);
const fmtLeft = (m) => (m <= 0 ? `Overdue by ${fmtMin(-m)}` : `${fmtMin(m)} left`);
const fmtDt = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function AdminTimeoutOrders() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("live");
  const [msg, setMsg] = useState(null);      // { ok: bool, text: string }
  const [busy, setBusy] = useState("");      // key of the action in progress
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.get("/admin/timeout/overview", cfg());
      setData(r.data);
      setError("");
    } catch (e) {
      const s = e.response?.status;
      setError(`Failed to load${s ? ` (HTTP ${s})` : ""}: ${e.response?.data?.error || e.message}`);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (key, confirmText, call) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key); setMsg(null);
    try {
      const r = await call();
      setMsg({ ok: true, text: r.data?.message || "Done" });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || e.message });
    } finally { setBusy(""); }
  };

  const live = data?.live || [];
  const overdue = live.filter(x => x.state === "OVERDUE");
  const warning = live.filter(x => x.state === "WARNING");
  const auto = data?.autoCancelled || [];
  const pending = data?.refundPending || [];
  const limit = data?.timeoutMinutes || 120;

  const tabBtn = (k, label, n) => (
    <button key={k} onClick={() => setTab(k)} style={{
      flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem",
      background: tab === k ? "var(--flame)" : "transparent", color: tab === k ? "#fff" : "var(--muted)",
    }}>{label} ({n})</button>
  );

  return (
    <div style={{ padding: "40px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 16 }}>
        <div>
          <div className="section-label">Delivery SLA</div>
          <h1 style={{ fontSize: "2rem" }}>Delivery Timeout Monitor</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 4 }}>
            Orders not delivered within <strong style={{ color: "var(--flame)" }}>{fmtMin(limit)}</strong> of assignment
            are cancelled automatically and refunded. The check runs every minute.
          </p>
        </div>
        <button disabled={busy === "run"} onClick={() => act("run", null, () => api.post("/admin/timeout/run-now", {}, cfg()))}
          style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(76,201,240,0.1)", border: "1px solid rgba(76,201,240,0.25)", color: "#4CC9F0", fontWeight: 700, cursor: "pointer" }}>
          {busy === "run" ? "Checking…" : "▶ Run check now"}
        </button>
      </div>

      {error && <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#E63946" }}>{error}</div>}
      {msg && (
        <div style={{ background: msg.ok ? "rgba(87,204,153,0.1)" : "rgba(230,57,70,0.1)", border: `1px solid ${msg.ok ? "rgba(87,204,153,0.3)" : "rgba(230,57,70,0.3)"}`,
                      borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: msg.ok ? "#57CC99" : "#E63946", display: "flex", justifyContent: "space-between" }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: "transparent", color: "inherit" }}>✕</button>
        </div>
      )}

      {overdue.length > 0 && (
        <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
          <strong style={{ color: "#E63946" }}>{overdue.length} order(s) past the deadline</strong>
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}> — they will be cancelled and refunded on the next check.</span>
        </div>
      )}
      {warning.length > 0 && (
        <div style={{ background: "rgba(244,200,66,0.08)", border: "1px solid rgba(244,200,66,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
          <strong style={{ color: "#F4C842" }}>{warning.length} order(s) approaching the deadline</strong>
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}> — consider reassigning now.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
        {[["Live deliveries", live.length, "var(--white)"], ["Running late", warning.length, "#F4C842"],
          ["Overdue", overdue.length, "#E63946"], ["Refunds to retry", pending.length, pending.length ? "#E63946" : "var(--muted)"]].map(([l, v, c]) => (
          <div key={l} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.5rem", color: c }}>{v}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", background: "var(--charcoal)", borderRadius: 10, padding: 4, marginBottom: 20, maxWidth: 560 }}>
        {tabBtn("live", "Live", live.length)}
        {tabBtn("auto", "Auto-cancelled", auto.length)}
        {tabBtn("refunds", "Refunds to retry", pending.length)}
      </div>

      {!data && !error && <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading…</div>}

      {/* ── LIVE ─────────────────────────────────────────────────────────── */}
      {data && tab === "live" && (live.length === 0
        ? <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>No orders are out for delivery right now.</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {live.map(x => {
              const st = STATE[x.state]; const pct = Math.min(100, Math.round((x.minutesElapsed / limit) * 100));
              const canReassign = ["ASSIGNED", "ACCEPTED"].includes(x.assignmentStatus);
              return (
                <div key={x.assignmentId} className="card" style={{ padding: "18px 20px", borderColor: x.state === "ON_TRACK" ? "var(--border)" : st.color + "66" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <Link to={`/admin/orders/${x.orderId}`} style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, color: "var(--flame)" }}>Order #{x.orderId}</Link>
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: "var(--charcoal)", color: "var(--muted)" }}>{x.assignmentStatus.replace("_", " ")}</span>
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: "rgba(0,0,0,0.3)", color: st.color }}>{st.label} · {fmtLeft(x.minutesLeft)}</span>
                      </div>
                      <p style={{ color: "var(--muted)", fontSize: "0.83rem" }}>{x.customerName} · {x.customerPhone}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 2 }}>📍 {x.address || "—"}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>🛵 {x.partnerName || "—"}{x.partnerPhone ? ` · ${x.partnerPhone}` : ""} · assigned {fmtDt(x.assignedAt)}</p>
                    </div>
                    <p style={{ fontWeight: 700, color: "var(--flame)", flexShrink: 0 }}>{inr(x.totalInr)}</p>
                  </div>
                  <div style={{ height: 6, background: "var(--charcoal)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: st.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {canReassign && (
                      <button disabled={!!busy} onClick={() => act(`re${x.orderId}`, `Move order #${x.orderId} to another partner?`, () => api.post(`/admin/timeout/${x.orderId}/reassign`, {}, cfg()))}
                        style={{ padding: "7px 13px", borderRadius: 8, fontSize: "0.8rem", background: "rgba(76,201,240,0.1)", border: "1px solid rgba(76,201,240,0.25)", color: "#4CC9F0", cursor: "pointer" }}>
                        {busy === `re${x.orderId}` ? "Reassigning…" : "🔄 Reassign"}
                      </button>
                    )}
                    <button disabled={!!busy} onClick={() => act(`ca${x.orderId}`, `Cancel order #${x.orderId} now and refund the customer?`, () => api.post(`/admin/timeout/${x.orderId}/cancel-now`, { reason: "Cancelled by admin — delivery running late" }, cfg()))}
                      style={{ padding: "7px 13px", borderRadius: 8, fontSize: "0.8rem", background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", color: "#E63946", cursor: "pointer" }}>
                      {busy === `ca${x.orderId}` ? "Cancelling…" : "✕ Cancel & refund"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
      )}

      {/* ── AUTO-CANCELLED ───────────────────────────────────────────────── */}
      {data && tab === "auto" && (auto.length === 0
        ? <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>No orders have been auto-cancelled yet.</div>
        : <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "var(--charcoal)" }}>
                {["Order", "Customer", "Cancelled", "Refund", "Amount", "Gateway / reference"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>))}
              </tr></thead>
              <tbody>
                {auto.map((r, i) => {
                  const rf = REFUND[r.refundStatus] || { color: "#888", label: r.refundStatus || "—" };
                  return (
                    <tr key={r.orderId} style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "12px 14px" }}><Link to={`/admin/orders/${r.orderId}`} style={{ color: "var(--flame)", fontWeight: 700 }}>#{r.orderId}</Link></td>
                      <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{r.customerName || "—"}<div style={{ color: "var(--muted)", fontSize: "0.74rem" }}>{r.customerPhone}</div></td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "var(--muted)" }}>{fmtDt(r.cancelledAt)}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ color: rf.color, fontWeight: 700, fontSize: "0.82rem" }}>{rf.label}</span></td>
                      <td style={{ padding: "12px 14px", fontWeight: 700 }}>{r.refundAmountInr ? inr(r.refundAmountInr) : "—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: "var(--muted)" }}>{r.refundGateway || "—"}{r.refundId ? ` · ${r.refundId}` : ""}{r.refundNote && r.refundStatus === "FAILED" ? <div style={{ color: "#E63946" }}>{r.refundNote}</div> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      )}

      {/* ── REFUNDS TO RETRY ─────────────────────────────────────────────── */}
      {data && tab === "refunds" && (pending.length === 0
        ? <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>No refunds are waiting. 🎉</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map(r => (
              <div key={r.orderId} className="card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderColor: "rgba(230,57,70,0.3)" }}>
                <div>
                  <Link to={`/admin/orders/${r.orderId}`} style={{ color: "var(--flame)", fontWeight: 700 }}>Order #{r.orderId}</Link>
                  <span style={{ marginLeft: 10, fontWeight: 700 }}>{inr(r.totalInr)}</span>
                  <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 2 }}>{r.customerName} · {r.customerPhone} · {r.gateway}</p>
                  {r.note && <p style={{ color: "#E63946", fontSize: "0.78rem", marginTop: 2 }}>{r.note}</p>}
                </div>
                <button disabled={!!busy} onClick={() => act(`rr${r.orderId}`, `Retry the ${inr(r.totalInr)} refund for order #${r.orderId}?`, () => api.post(`/admin/timeout/${r.orderId}/retry-refund`, {}, cfg()))}
                  className="btn-primary" style={{ padding: "9px 18px" }}>
                  {busy === `rr${r.orderId}` ? "Retrying…" : "Retry refund"}
                </button>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}
