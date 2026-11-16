import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/admin",                    label: "Dashboard",        icon: "📊", exact: true },
  { to: "/admin/menu",               label: "Menu",             icon: "🍽" },
  { to: "/admin/orders",             label: "Orders",           icon: "📦" },
  { to: "/admin/ratings",            label: "Ratings",          icon: "⭐" },
  { to: "/admin/delivery/partners",  label: "Delivery Partners",icon: "🛵" },
  { to: "/admin/delivery/orders",    label: "Delivery Orders",  icon: "📍" },
  { to: "/admin/users",              label: "Users",            icon: "👥", superAdminOnly: true },
  { to: "/admin/settings",           label: "Settings",         icon: "⚙️" },
];

export default function AdminLayout() {
  const { pathname }                               = useLocation();
  const { adminUser, adminSignOut, isSuperAdmin }  = useAuth();
  const navigate                                   = useNavigate();

  const handleLogout = async () => {
    await adminSignOut();
    navigate("/admin/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: "var(--charcoal)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: "1.4rem" }}>🔥</span>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.2rem" }}>
              Flamehaus
            </span>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)" }}>
            Admin Panel
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 10px" }}>
          {navItems.map(({ to, label, icon, exact, superAdminOnly }) => {
            if (superAdminOnly && !isSuperAdmin) return null;
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link key={to} to={to} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, marginBottom: 3,
                fontWeight: 500, fontSize: "0.88rem", transition: "all 0.2s",
                background:  active ? "rgba(255,107,53,0.15)" : "transparent",
                color:       active ? "var(--flame)"          : "var(--muted)",
                borderLeft: `3px solid ${active ? "var(--flame)" : "transparent"}`,
              }}>
                <span style={{ fontSize: "1rem" }}>{icon}</span>
                {label}
              </Link>
            );
          })}

          {/* Delivery portal link */}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
            <a href="/delivery/dashboard" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              fontWeight: 500, fontSize: "0.88rem", color: "var(--muted)",
              transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#4CC9F0"; e.currentTarget.style.background = "rgba(76,201,240,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: "1rem" }}>🛵</span>
              Delivery Portal ↗
            </a>
          </div>
        </nav>

        {/* Bottom — user + logout */}
        <div style={{ padding: "14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          {adminUser && (
            <div style={{ padding: "10px 12px", marginBottom: 6, background: "rgba(255,107,53,0.08)", borderRadius: 10 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 2 }}>
                👤 {adminUser.displayName || adminUser.username}
              </p>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {adminUser.role === "SUPERADMIN" ? "⚡ Super Admin" : "🧑‍🍳 Staff"}
              </p>
            </div>
          )}
          {adminUser && (
            <button onClick={handleLogout} style={{
              width: "100%", padding: "9px 12px", borderRadius: 10, textAlign: "left",
              background: "transparent", color: "var(--muted)", fontSize: "0.86rem",
              fontWeight: 500, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E63946"; e.currentTarget.style.background = "rgba(230,57,70,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "transparent"; }}
            >
              🚪 Sign Out
            </button>
          )}
          <Link to="/" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
            borderRadius: 10, color: "var(--muted)", fontSize: "0.86rem", fontWeight: 500, marginTop: 3,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--white)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}
          >
            ← Website
          </Link>
        </div>
      </aside>

      <main style={{ flex: 1, background: "var(--dark)", overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
