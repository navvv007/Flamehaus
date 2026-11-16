import axios from "axios";

// ── Base instance — DEFAULT export so `import api from './apiClient'` works ──
const api = axios.create({ baseURL: "/api" });

// Auto-attach token from localStorage
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("fh_admin_token") ||
    localStorage.getItem("fh_customer_token") ||
    localStorage.getItem("fh_delivery_token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ── Admin auth ────────────────────────────────────────────────────────────────
export const adminLogin          = (u, p) => api.post("/auth/login", { username: u, password: p });
export const adminLogout         = ()      => api.post("/auth/logout");
export const adminOtpSend        = (u)     => api.post("/auth/otp/send",   { identifier: u });
export const adminOtpVerify      = (u, o)  => api.post("/auth/otp/verify", { identifier: u, otp: o });
export const adminForgotPassword = (u)     => api.post("/auth/forgot-password", { username: u });
export const adminResetPassword  = (d)     => api.post("/auth/reset-password", d);
export const adminChangePassword = (d)     => api.post("/auth/change-password", d);

// ── Customer auth ─────────────────────────────────────────────────────────────
export const customerRegister    = (d)     => api.post("/customer/auth/register", d);
export const customerLogin       = (d)     => api.post("/customer/auth/login", d);
export const customerLogout      = ()      => api.post("/customer/auth/logout");
export const customerOtpSend     = (phone) => api.post("/customer/auth/otp/send",   { identifier: phone });
export const customerOtpVerify   = (p, o)  => api.post("/customer/auth/otp/verify", { identifier: p, otp: o });
export const customerForgotSend  = (email) => api.post("/customer/auth/forgot-password/send",  { email });
export const customerForgotReset = (d)     => api.post("/customer/auth/forgot-password/reset", d);

// ── Menu ──────────────────────────────────────────────────────────────────────
export const fetchPublicMenu = ()       => api.get("/menu");
export const fetchAdminMenu  = ()       => api.get("/admin/menu");
export const createMenuItem  = (d)      => api.post("/admin/menu", d);
export const updateMenuItem  = (id, d)  => api.put(`/admin/menu/${id}`, d);
export const deleteMenuItem  = (id)     => api.delete(`/admin/menu/${id}`);
export const toggleMenuItem  = (id)     => api.patch(`/admin/menu/${id}/toggle`);

// ── Orders ────────────────────────────────────────────────────────────────────
export const placeOrder         = (d)   => api.post("/orders", d);
export const trackOrder         = (id)  => api.get(`/orders/${id}/track`);
export const fetchMyOrders      = ()    => api.get("/customer/orders");
export const fetchAdminOrders   = ()    => api.get("/admin/orders");
export const fetchAdminOrder    = (id)  => api.get(`/admin/orders/${id}`);
export const advanceOrderStatus = (id)  => api.patch(`/admin/orders/${id}/advance`);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const fetchDashboard      = ()   => api.get("/admin/dashboard");
export const fetchDashboardStats = ()   => api.get("/admin/dashboard/stats");

// ── Payments ──────────────────────────────────────────────────────────────────
export const createPayment = (d) => api.post("/payment/create", d);
export const verifyPayment = (d) => api.post("/payment/verify", d);

// ── Ratings ───────────────────────────────────────────────────────────────────
export const submitRating      = (d) => api.post("/customer/ratings", d);
export const fetchAdminRatings = ()  => api.get("/admin/ratings");

// ── Admin users ───────────────────────────────────────────────────────────────
export const fetchAdminUsers  = ()    => api.get("/admin/users");
export const createAdminUser  = (d)   => api.post("/admin/users", d);
export const toggleAdminUser  = (id)  => api.patch(`/admin/users/${id}/toggle`);
export const deleteAdminUser  = (id)  => api.delete(`/admin/users/${id}`);

// ── Cancellations ─────────────────────────────────────────────────────────────
export const customerCancelOrder = (orderId, reason) =>
  api.post(`/customer/orders/${orderId}/cancel`, { reason });
export const fetchCancellations  = ()    => api.get("/admin/cancellations");
export const adminCancelOrder    = (orderId, reason) =>
  api.post(`/admin/orders/${orderId}/cancel`, { reason });

// ── Delivery — admin ──────────────────────────────────────────────────────────
export const fetchDeliveryPartners = ()    => api.get("/delivery/admin/partners");
export const fetchPendingPartners  = ()    => api.get("/delivery/admin/partners/pending");
export const approvePartner        = (id)  => api.patch(`/delivery/admin/partners/${id}/approve`);
export const rejectPartnerAccount  = (id)  => api.patch(`/delivery/admin/partners/${id}/reject`);
export const togglePartner         = (id)  => api.patch(`/delivery/admin/partners/${id}/toggle`);
export const fetchDeliveryOrders   = ()    => api.get("/delivery/admin/assignments");
export const autoAssignOrder       = (id)  => api.post(`/delivery/admin/assign/${id}`);
export const adminReassignOrder    = (orderId, partnerId) =>
  api.post(`/delivery/admin/reassign/${orderId}`, partnerId ? { partnerId } : {});
