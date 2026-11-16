import { useState, useEffect } from "react";
import { fetchAdminUsers, createAdminUser, toggleAdminUser, deleteAdminUser } from "../../api/apiClient";
import { adminChangePassword } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

export default function AdminUsers() {
  const { adminUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showChPw, setShowChPw] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "STAFF", displayName: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetchAdminUsers().then((r) => setUsers(r.data)).catch(() => setError("Failed to load users")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await createAdminUser(form);
      setShowForm(false);
      setForm({ username: "", password: "", role: "STAFF", displayName: "" });
      setSuccess("Admin user created");
      load();
    } catch (err) { setError(err.response?.data?.error || "Failed to create"); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    await toggleAdminUser(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this admin account?")) return;
    await deleteAdminUser(id);
    load();
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setError("Passwords do not match"); return; }
    setSaving(true); setError("");
    try {
      await adminChangePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setSuccess("Password changed successfully");
      setShowChPw(false);
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) { setError(err.response?.data?.error || "Failed to change password"); }
    finally { setSaving(false); }
  };

  const roleColor = (role) => role === "SUPERADMIN"
    ? { bg: "rgba(255,107,53,0.15)", color: "var(--flame)", border: "rgba(255,107,53,0.3)" }
    : { bg: "rgba(87,204,153,0.12)", color: "#57CC99", border: "rgba(87,204,153,0.3)" };

  return (
    <div style={{ padding: "40px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
        <div>
          <div className="section-label">Access Control</div>
          <h1 style={{ fontSize: "2rem" }}>Admin Users</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>Manage who can access this panel</p>
          {error   && <p style={{ color: "#E63946", fontSize: "0.88rem", marginTop: 8 }}>{error}</p>}
          {success && <p style={{ color: "#57CC99", fontSize: "0.88rem", marginTop: 8 }}>✓ {success}</p>}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-outline" style={{ padding: "10px 20px" }} onClick={() => { setShowChPw(true); setError(""); }}>
            🔒 Change My Password
          </button>
          <button className="btn-primary" onClick={() => { setShowForm(true); setError(""); }}>
            + Add Admin
          </button>
        </div>
      </div>

      {/* Role guide */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          { role: "SUPERADMIN", icon: "👑", perms: ["Full menu CRUD", "Manage admin accounts", "View all orders", "Dashboard access"] },
          { role: "STAFF",      icon: "👨‍🍳", perms: ["View orders", "Advance order status", "View menu", "Dashboard access"] },
        ].map(({ role, icon, perms }) => {
          const c = roleColor(role);
          return (
            <div key={role} className="card" style={{ padding: 20, borderColor: c.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: "1.4rem" }}>{icon}</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: c.color }}>{role}</span>
              </div>
              {perms.map((p) => (
                <p key={p} style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 4 }}>✓ {p}</p>
              ))}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--charcoal)", borderBottom: "1px solid var(--border)" }}>
                {["User", "Role", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "14px 16px", color: "var(--muted)", fontWeight: 600, fontSize: "0.8rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const c = roleColor(u.role);
                const isMe = u.username === adminUser?.username;
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,53,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: c.bg, border: `1.5px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontWeight: 700, color: c.color }}>
                          {(u.displayName || u.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{u.displayName || u.username}</p>
                          <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>@{u.username} {isMe && <span style={{ color: "var(--flame)" }}>(you)</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
                        background: u.active ? "rgba(87,204,153,0.12)" : "rgba(136,136,136,0.12)",
                        color: u.active ? "#57CC99" : "var(--muted)",
                      }}>
                        {u.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {!isMe && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleToggle(u.id)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "rgba(255,107,53,0.12)", color: "var(--flame)", border: "1px solid rgba(255,107,53,0.3)" }}>
                            {u.active ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => handleDelete(u.id)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "rgba(230,57,70,0.1)", color: "#E63946", border: "1px solid rgba(230,57,70,0.3)" }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create admin modal */}
      {showForm && (
        <Modal title="Add Admin User" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate}>
            {error && <p style={{ color: "#E63946", fontSize: "0.87rem", marginBottom: 16 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Username *", key: "username", type: "text", placeholder: "e.g. chef_john" },
                { label: "Display Name", key: "displayName", type: "text", placeholder: "e.g. John Smith" },
                { label: "Password *", key: "password", type: "password", placeholder: "Min. 6 characters" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={form[key]} placeholder={placeholder} required={label.endsWith("*")}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} style={{ width: "100%" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 6 }}>Role</label>
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} style={{ width: "100%" }}>
                  <option value="STAFF">STAFF — view orders &amp; menu</option>
                  <option value="SUPERADMIN">SUPERADMIN — full access</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }} disabled={saving}>
                {saving ? "Creating…" : "Create Admin"}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change password modal */}
      {showChPw && (
        <Modal title="Change My Password" onClose={() => setShowChPw(false)}>
          <form onSubmit={handleChangePw}>
            {error && <p style={{ color: "#E63946", fontSize: "0.87rem", marginBottom: 16 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Current Password", key: "currentPassword" },
                { label: "New Password (min 6 chars)", key: "newPassword" },
                { label: "Confirm New Password", key: "confirm" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, display: "block", marginBottom: 6 }}>{label}</label>
                  <input type="password" value={pwForm[key]} placeholder="••••••••"
                    onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))} style={{ width: "100%" }} required />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }} disabled={saving}>
                {saving ? "Changing…" : "Change Password"}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowChPw(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 480, padding: 36, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", color: "var(--muted)", fontSize: "1.3rem" }}>✕</button>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.3rem", marginBottom: 24 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
