import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
} from "recharts";
import api from "../../api/apiClient";

const STATUS_COLORS = {
  "Pending":    "#4CC9F0",
  "Confirmed":  "#C77DFF",
  "Preparing":  "#F4C842",
  "On the Way": "#FF6B35",
  "Delivered":  "#57CC99",
  "Cancelled":  "#E63946",
};

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

const tooltipStyle = {
  background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 13,
};

function StatCard({ icon, label, value, sub, color = "var(--white)" }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.6rem", color }}>{value}</div>
      <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const token = localStorage.getItem("fh_admin_token");
      const r = await api.get("/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(r.data);
    } catch (e) {
      // Show the real HTTP status so a remaining problem is visible, not hidden
      const status = e.response?.status;
      const msg    = e.response?.data?.error || e.message;
      setError(`Failed to load dashboard data${status ? ` (HTTP ${status})` : ""}: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const statuses = ["Pending", "Confirmed", "Preparing", "On the Way", "Delivered", "Cancelled"];
  const keyOf    = { "Pending": "pending", "Confirmed": "confirmed", "Preparing": "preparing",
                     "On the Way": "onTheWay", "Delivered": "delivered", "Cancelled": "cancelled" };
  const maxCount = data ? Math.max(1, ...statuses.map(s => data[keyOf[s]] || 0)) : 1;

  return (
    <div style={{ padding: "40px 36px" }}>
      <div className="section-label">Admin Dashboard</div>
      <h1 style={{ fontSize: "2.4rem", marginBottom: 24 }}>Overview</h1>

      {error && (
        <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 12,
                      padding: "14px 18px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#E63946", fontSize: "0.9rem" }}>{error}</span>
          <button onClick={() => { setLoading(true); load(); }}
            style={{ padding: "7px 16px", borderRadius: 8, background: "var(--charcoal)", border: "1px solid var(--border)", color: "var(--white)", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading dashboard…</div>
      ) : data && (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
            <StatCard icon="💰" label="Total Revenue"  value={inr(data.totalRevenueInr)} sub="Delivered orders" color="#57CC99" />
            <StatCard icon="📦" label="Total Orders"   value={data.totalOrders}          sub="All time" />
            <StatCard icon="👥" label="Customers"      value={data.totalCustomers}       sub="Registered" />
            <StatCard icon="⏳" label="Needs Attention" value={(data.pending || 0) + (data.confirmed || 0)}
                      sub="Pending + Confirmed" color="#F4C842" />
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
            <div className="card" style={{ padding: "24px 26px" }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", marginBottom: 18 }}>Monthly Revenue</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="month" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
                  <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(v), "Revenue"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="revenue" fill="#FF6B35" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: "24px 26px" }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", marginBottom: 18 }}>Monthly Orders</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.monthlyOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="month" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
                  <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Orders"]} />
                  <Line type="monotone" dataKey="orders" stroke="#57CC99" strokeWidth={3}
                        dot={{ r: 5, fill: "#57CC99" }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status breakdown + recent orders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
            <div className="card" style={{ padding: "24px 26px" }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", marginBottom: 18 }}>Orders by Status</h3>
              {statuses.map(s => {
                const count = data[keyOf[s]] || 0;
                return (
                  <div key={s} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 5 }}>
                      <span style={{ color: STATUS_COLORS[s], fontWeight: 600 }}>{s}</span>
                      <span style={{ fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--charcoal)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, background: STATUS_COLORS[s], borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontFamily: "Syne,sans-serif" }}>Recent Orders</h3>
                <Link to="/admin/orders" style={{ color: "var(--flame)", fontSize: "0.82rem", fontWeight: 600 }}>View all →</Link>
              </div>
              {(!data.recentOrders || data.recentOrders.length === 0) ? (
                <p style={{ padding: "0 24px 24px", color: "var(--muted)" }}>No orders yet.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--charcoal)" }}>
                      {["Order", "Customer", "Amount", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map(o => (
                      <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <Link to={`/admin/orders/${o.id}`} style={{ color: "var(--flame)", fontWeight: 700 }}>#{o.id}</Link>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "0.86rem" }}>{o.customerName}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>{inr(o.totalInr)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: STATUS_COLORS[o.status] || "var(--muted)", fontWeight: 600, fontSize: "0.82rem" }}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
