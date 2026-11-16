import { createContext, useContext, useState } from "react";
import axios from "axios";

// ── Standalone axios instance — does NOT depend on apiClient.js exports ──────
const http = axios.create({ baseURL: "/api" });

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  // ── Admin ──────────────────────────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const raw = localStorage.getItem("fh_admin_user");
      return raw && raw !== "undefined" ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const adminSignIn = async (username, password) => {
    const res = await http.post("/auth/login", { username, password });
    const d   = res.data;
    localStorage.setItem("fh_admin_token", d.token);
    localStorage.setItem("fh_admin_user",
      JSON.stringify({ username: d.username, role: d.role, displayName: d.displayName }));
    setAdminUser({ username: d.username, role: d.role, displayName: d.displayName });
  };

  const adminSignOut = async () => {
    try {
      const token = localStorage.getItem("fh_admin_token");
      if (token) await http.post("/auth/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
    localStorage.removeItem("fh_admin_token");
    localStorage.removeItem("fh_admin_user");
    setAdminUser(null);
  };

  const isAdmin      = !!adminUser;
  const isSuperAdmin = adminUser?.role === "SUPERADMIN";

  // ── Customer ───────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState(() => {
    try {
      const raw = localStorage.getItem("fh_customer");
      return raw && raw !== "undefined" ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const customerSignIn = async (email, password) => {
    const res = await http.post("/customer/auth/login", { email, password });
    const d   = res.data;
    localStorage.setItem("fh_customer_token", d.token);
    localStorage.setItem("fh_customer",
      JSON.stringify({ id: d.id, name: d.name, email: d.email, phone: d.phone }));
    setCustomer({ id: d.id, name: d.name, email: d.email, phone: d.phone });
  };

  const customerSignOut = async () => {
    try {
      const token = localStorage.getItem("fh_customer_token");
      if (token) await http.post("/customer/auth/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
    localStorage.removeItem("fh_customer_token");
    localStorage.removeItem("fh_customer");
    setCustomer(null);
  };

  const customerSetFromStorage = () => {
    try {
      const raw = localStorage.getItem("fh_customer");
      if (raw && raw !== "undefined") setCustomer(JSON.parse(raw));
    } catch (_) {}
  };

  const isCustomer = !!customer;

  // ── Delivery partner ───────────────────────────────────────────────────────
  const [deliveryPartner, setDeliveryPartner] = useState(() => {
    try {
      const raw = localStorage.getItem("fh_delivery_partner");
      return raw && raw !== "undefined" ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const deliverySignOut = async () => {
    try {
      const token = localStorage.getItem("fh_delivery_token");
      if (token) await http.post("/delivery/auth/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
    localStorage.removeItem("fh_delivery_token");
    localStorage.removeItem("fh_delivery_partner");
    setDeliveryPartner(null);
  };

  const isDelivery = !!deliveryPartner;

  return (
    <AuthContext.Provider value={{
      adminUser, adminSignIn, adminSignOut, isAdmin, isSuperAdmin,
      customer, customerSignIn, customerSignOut, customerSetFromStorage, isCustomer,
      deliveryPartner, setDeliveryPartner, deliverySignOut, isDelivery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
