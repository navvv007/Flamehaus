import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach the right JWT to every request
api.interceptors.request.use((config) => {
  const adminToken    = localStorage.getItem("fh_admin_token");
  const customerToken = localStorage.getItem("fh_customer_token");
  // Admin token takes priority on /admin routes, customer token elsewhere
  const isAdminRoute = config.url?.startsWith("/admin") || config.url?.startsWith("/auth");
  const token = isAdminRoute ? (adminToken || customerToken) : (customerToken || adminToken);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: clear storage and redirect — but NEVER redirect on logout calls
// (logout POSTs a blacklisted or expired token on purpose — that's not an error)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isLogoutCall = url.includes("/auth/logout");

    if (err.response?.status === 401 && !isLogoutCall) {
      const isAdminRoute = window.location.pathname.startsWith("/admin");
      if (isAdminRoute) {
        localStorage.removeItem("fh_admin_token");
        localStorage.removeItem("fh_admin_user");
        window.location.href = "/admin/login";
      } else {
        localStorage.removeItem("fh_customer_token");
        localStorage.removeItem("fh_customer");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Admin Auth ────────────────────────────────────────────────────────────────
export const adminLogin          = (u, p) => api.post("/auth/login", { username: u, password: p });
export const adminOtpSend        = (username) => api.post("/auth/otp/send", { identifier: username });
export const adminOtpVerify      = (username, otp) => api.post("/auth/otp/verify", { identifier: username, otp });
export const adminLogout         = ()     => api.post("/auth/logout");
export const adminForgotPassword = (username) => api.post("/auth/forgot-password", { username });
export const adminResetPassword  = (d)   => api.post("/auth/reset-password", d);
export const adminChangePassword = (d)   => api.post("/auth/change-password", d);
export const fetchAdminUsers     = ()    => api.get("/admin/users");
export const createAdminUser     = (d)   => api.post("/admin/users", d);
export const toggleAdminUser     = (id)  => api.patch(`/admin/users/${id}/toggle`);
export const deleteAdminUser     = (id)  => api.delete(`/admin/users/${id}`);

// ── Customer Auth ─────────────────────────────────────────────────────────────
export const customerRegister   = (d)          => api.post("/customer/auth/register", d);
export const customerLogin      = (d)          => api.post("/customer/auth/login", d);
export const customerLogout     = ()           => api.post("/customer/auth/logout");
export const customerOtpSend    = (phone)      => api.post("/customer/auth/otp/send", { identifier: phone });
export const customerOtpVerify  = (phone, otp) => api.post("/customer/auth/otp/verify", { identifier: phone, otp });
export const fetchMyOrders    = ()   => api.get("/customer/orders");
export const fetchMe          = ()   => api.get("/customer/me");

// ── Menu ──────────────────────────────────────────────────────────────────────
export const fetchPublicMenu  = ()        => api.get("/menu");
export const fetchAdminMenu   = ()        => api.get("/admin/menu");
export const createMenuItem   = (d)       => api.post("/admin/menu", d);
export const updateMenuItem   = (id, d)   => api.put(`/admin/menu/${id}`, d);
export const deleteMenuItem   = (id)      => api.delete(`/admin/menu/${id}`);
export const toggleMenuItem   = (id)      => api.patch(`/admin/menu/${id}/toggle`);

// ── Orders ────────────────────────────────────────────────────────────────────
export const placeOrder            = (d)  => api.post("/orders", d);
export const trackOrder            = (id) => api.get(`/orders/${id}/track`);
export const fetchCustomerOrder    = (id) => api.get(`/customer/orders/${id}`);
export const fetchAdminOrders      = ()   => api.get("/admin/orders");
export const fetchAdminOrderDetail = (id) => api.get(`/admin/orders/${id}`);
export const advanceOrder          = (id) => api.patch(`/admin/orders/${id}/advance`);
export const fetchDashboard        = ()   => api.get("/admin/dashboard/stats");

// ── Payment ───────────────────────────────────────────────────────────────────
export const createPayment      = (d)  => api.post("/payment/create", d);
export const verifyPayment      = (d)  => api.post("/payment/verify", d);
export const getOrderPayment    = (id) => api.get(`/payment/order/${id}`);

// ── Ratings ───────────────────────────────────────────────────────────────────
export const submitRating       = (d)  => api.post("/customer/ratings", d);
export const checkRating        = (id) => api.get(`/customer/ratings/order/${id}/check`);
export const getOrderRatings    = (id) => api.get(`/customer/ratings/order/${id}`);
export const getAdminRatings    = ()   => api.get("/admin/ratings");
export const getMenuItemRatings = (id) => api.get(`/menu/${id}/ratings`);
