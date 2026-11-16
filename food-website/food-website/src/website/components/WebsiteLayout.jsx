import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useApp }  from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

export default function WebsiteLayout() {
  const { cartCount }                                    = useApp();
  const { customer, customerSignOut, isCustomer }        = useAuth();
  const { pathname }                                     = useLocation();
  const navigate                                         = useNavigate();
  const [dropOpen, setDropOpen]                          = useState(false);

  const navLinks = [
    { to: "/",      label: "Home"  },
    { to: "/menu",  label: "Menu"  },
    { to: "/about", label: "About" },
  ];

  const handleSignOut = async () => {
    await customerSignOut();
    setDropOpen(false);
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(15,15,15,0.95)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #2E2E2E", padding: "0 5%",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between", height: 70,
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.6rem" }}>🔥</span>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem" }}>
              Flamehaus
            </span>
          </Link>

          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                fontWeight: 500, fontSize: "0.95rem", position: "relative",
                color: pathname === to ? "var(--flame)" : "var(--muted)",
                transition: "color 0.2s",
              }}>
                {label}
                {pathname === to && (
                  <span style={{
                    position: "absolute", bottom: -4, left: 0, right: 0,
                    height: 2, background: "var(--flame)", borderRadius: 2,
                  }} />
                )}
              </Link>
            ))}
          </div>

          {/* Right — Cart + Auth */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Cart button */}
            <Link to="/cart" style={{
              position: "relative", background: "var(--flame)", borderRadius: 50,
              padding: "8px 18px", fontWeight: 600, fontSize: "0.9rem",
              display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s",
            }}>
              🛒 Cart
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -6,
                  background: "#fff", color: "var(--flame)", borderRadius: "50%",
                  width: 20, height: 20, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "0.7rem", fontWeight: 700,
                }}>{cartCount}</span>
              )}
            </Link>

            {/* Customer auth area */}
            {isCustomer ? (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 14px", borderRadius: 50,
                    border: "1.5px solid var(--border)", background: "transparent",
                    color: "var(--white)", fontWeight: 500, fontSize: "0.88rem",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--flame)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%", background: "var(--flame)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700,
                  }}>
                    {customer?.name?.charAt(0).toUpperCase()}
                  </span>
                  {customer?.name?.split(" ")[0]}
                  <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                    {dropOpen ? "▲" : "▼"}
                  </span>
                </button>

                {dropOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: 8, minWidth: 200, zIndex: 200,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}>
                    {/* User info */}
                    <div style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)", marginBottom: 6,
                    }}>
                      <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>{customer?.name}</p>
                      <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>
                        {customer?.email}
                      </p>
                      {customer?.phone && (
                        <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>
                          📱 {customer.phone}
                        </p>
                      )}
                    </div>

                    {/* My Orders */}
                    <Link
                      to="/my-orders"
                      onClick={() => setDropOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 8,
                        fontSize: "0.88rem", color: "var(--muted)", transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--charcoal)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
                    >
                      📦 My Orders
                    </Link>
                    {/* Manage Addresses */}

                    <Link to="/my-addresses" onClick={() => setDropOpen(false)}>
                      📍 My Addresses
                    </Link>

                    {/* Sign Out — always visible, prominent */}
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: "100%", textAlign: "left",
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 8, fontSize: "0.88rem",
                        color: "#E63946", background: "transparent", transition: "background 0.2s",
                        marginTop: 2,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(230,57,70,0.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Guest — show Sign In + Register */
              <div style={{ display: "flex", gap: 8 }}>
                <Link to="/login" style={{
                  padding: "8px 16px", borderRadius: 50,
                  border: "1.5px solid var(--border)",
                  fontSize: "0.88rem", fontWeight: 500, color: "var(--muted)",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--flame)"; e.currentTarget.style.color = "var(--flame)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
                >
                  Sign In
                </Link>
                <Link to="/register" style={{
                  padding: "8px 16px", borderRadius: 50,
                  background: "var(--flame)", fontSize: "0.88rem", fontWeight: 600, color: "#fff",
                }}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Click-outside closes dropdown */}
      {dropOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setDropOpen(false)}
        />
      )}

      <main style={{ flex: 1 }}><Outlet /></main>

      <footer style={{ background: "var(--charcoal)", borderTop: "1px solid var(--border)", padding: "48px 5% 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: "1.4rem" }}>🔥</span>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.3rem" }}>Flamehaus</span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: 280 }}>
                Premium food crafted with bold flavours. Order online, delivered in 30 minutes.
              </p>
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 16, fontFamily: "Syne,sans-serif" }}>Quick Links</p>
              {[...navLinks, { to: "/my-orders", label: "My Orders" }].map(({ to, label }) => (
                <div key={to} style={{ marginBottom: 10 }}>
                  <Link to={to} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{label}</Link>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 16, fontFamily: "Syne,sans-serif" }}>Contact</p>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 2 }}>
                📍 12 Jubilee Hills, Hyderabad<br />
                📞 +91 98765 43210<br />
                ✉️ hello@flamehaus.in
              </p>
            </div>
          </div>
          <div style={{
            borderTop: "1px solid var(--border)", paddingTop: 24,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 12,
          }}>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              © 2025 Flamehaus. Made with 🔥 in Hyderabad.
            </p>
            {/* Admin link in footer only — not cluttering the main nav */}
            <Link to="/admin/login" style={{
              fontSize: "0.78rem", color: "var(--muted)",
              padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border)",
              transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--flame)"; e.currentTarget.style.borderColor = "var(--flame)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
