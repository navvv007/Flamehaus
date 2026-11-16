import axios from "axios";

// ── Base axios instance ───────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });

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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const adminLogin           = (u, p) => api.post("/auth/login", { username: u, password: p });
export const adminLogout          = ()      => api.post("/auth/logout");
export const adminOtpSend         = (u)     => api.post("/auth/otp/send",   { identifier: u });
export const adminOtpVerify       = (u, o)  => api.post("/auth/otp/verify", { identifier: u, otp: o });
export const adminForgotPassword  = (u)     => api.post("/auth/forgot-password", { username: u });
export const adminResetPassword   = (d)     => api.post("/auth/reset-password", d);
export const adminChangePassword  = (d)     => api.post("/auth/change-password", d);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const customerRegister     = (d)      => api.post("/customer/auth/register", d);
export const customerLogin        = (d)      => api.post("/customer/auth/login", d);
export const customerLogout       = ()       => api.post("/customer/auth/logout");
export const customerOtpSend      = (phone)  => api.post("/customer/auth/otp/send",   { identifier: phone });
export const customerOtpVerify    = (p, o)   => api.post("/customer/auth/otp/verify", { identifier: p, otp: o });
export const customerForgotSend   = (email)  => api.post("/customer/auth/forgot-password/send",  { email });
export const customerForgotReset  = (d)      => api.post("/customer/auth/forgot-password/reset", d);

// ─────────────────────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────────────────────
export const fetchPublicMenu  = ()       => api.get("/menu");
export const fetchMenu        = ()       => api.get("/menu");           // alias
export const fetchAdminMenu   = ()       => api.get("/admin/menu");
export const createMenuItem   = (d)      => api.post("/admin/menu", d);
export const updateMenuItem   = (id, d)  => api.put(`/admin/menu/${id}`, d);
export const deleteMenuItem   = (id)     => api.delete(`/admin/menu/${id}`);
export const toggleMenuItem   = (id)     => api.patch(`/admin/menu/${id}/toggle`);

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────
export const placeOrder           = (d)   => api.post("/orders", d);
export const trackOrder           = (id)  => api.get(`/orders/${id}/track`);
export const fetchMyOrders        = ()    => api.get("/customer/orders");
export const getMyOrders          = ()    => api.get("/customer/orders");          // alias
export const fetchCustomerOrders  = ()    => api.get("/customer/orders");          // alias
export const fetchAdminOrders     = ()    => api.get("/admin/orders");
export const getAdminOrders       = ()    => api.get("/admin/orders");             // alias
export const fetchOrders          = ()    => api.get("/admin/orders");             // alias
export const fetchAdminOrder      = (id)  => api.get(`/admin/orders/${id}`);
export const getOrderById         = (id)  => api.get(`/admin/orders/${id}`);       // alias

// Order status advancement — every naming variation ever used
export const advanceOrderStatus   = (id)  => api.patch(`/admin/orders/${id}/advance`);
export const advanceOrder         = (id)  => api.patch(`/admin/orders/${id}/advance`); // alias
export const updateOrderStatus    = (id)  => api.patch(`/admin/orders/${id}/advance`); // alias
export const advanceStatus        = (id)  => api.patch(`/admin/orders/${id}/advance`); // alias

// Customer cancel
export const customerCancelOrder  = (orderId, reason) =>
  api.post(`/customer/orders/${orderId}/cancel`, { reason });
export const cancelOrder          = (orderId, reason) =>
  api.post(`/customer/orders/${orderId}/cancel`, { reason });                      // alias

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export const fetchDashboard       = ()    => api.get("/admin/dashboard");
export const fetchDashboardStats  = ()    => api.get("/admin/dashboard/stats");
export const getDashboardStats    = ()    => api.get("/admin/dashboard/stats");    // alias
export const fetchStats           = ()    => api.get("/admin/dashboard/stats");    // alias

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────
export const createPayment        = (d)   => api.post("/payment/create", d);
export const verifyPayment        = (d)   => api.post("/payment/verify", d);
export const initiatePayment      = (d)   => api.post("/payment/create", d);      // alias
export const confirmPayment       = (d)   => api.post("/payment/verify", d);      // alias

// ─────────────────────────────────────────────────────────────────────────────
// RATINGS
// ─────────────────────────────────────────────────────────────────────────────
export const submitRating         = (d)   => api.post("/customer/ratings", d);
export const submitOrderRating    = (d)   => api.post("/customer/ratings", d);    // alias
export const fetchAdminRatings    = ()    => api.get("/admin/ratings");
export const getRatings           = ()    => api.get("/admin/ratings");            // alias
export const fetchRatings         = ()    => api.get("/admin/ratings");            // alias

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USERS
// ─────────────────────────────────────────────────────────────────────────────
export const fetchAdminUsers      = ()    => api.get("/admin/users");
export const getAdminUsers        = ()    => api.get("/admin/users");              // alias
export const createAdminUser      = (d)   => api.post("/admin/users", d);
export const addAdminUser         = (d)   => api.post("/admin/users", d);          // alias
export const toggleAdminUser      = (id)  => api.patch(`/admin/users/${id}/toggle`);
export const deleteAdminUser      = (id)  => api.delete(`/admin/users/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLATIONS
// ─────────────────────────────────────────────────────────────────────────────
export const fetchCancellations   = ()    => api.get("/admin/cancellations");
export const getCancellations     = ()    => api.get("/admin/cancellations");      // alias
export const adminCancelOrder     = (orderId, reason) =>
  api.post(`/admin/orders/${orderId}/cancel`, { reason });

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY — ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export const fetchDeliveryPartners  = ()    => api.get("/delivery/admin/partners");
export const getDeliveryPartners    = ()    => api.get("/delivery/admin/partners"); // alias
export const fetchPendingPartners   = ()    => api.get("/delivery/admin/partners/pending");
export const approvePartner         = (id)  => api.patch(`/delivery/admin/partners/${id}/approve`);
export const rejectPartnerAccount   = (id)  => api.patch(`/delivery/admin/partners/${id}/reject`);
export const togglePartner          = (id)  => api.patch(`/delivery/admin/partners/${id}/toggle`);
export const fetchDeliveryOrders    = ()    => api.get("/delivery/admin/assignments");
export const getDeliveryAssignments = ()    => api.get("/delivery/admin/assignments"); // alias
export const autoAssignOrder        = (id)  => api.post(`/delivery/admin/assign/${id}`);
export const adminReassignOrder     = (orderId, partnerId) =>
  api.post(`/delivery/admin/reassign/${orderId}`, partnerId ? { partnerId } : {});
export const reassignOrder          = (orderId, partnerId) =>
  api.post(`/delivery/admin/reassign/${orderId}`, partnerId ? { partnerId } : {}); // alias
