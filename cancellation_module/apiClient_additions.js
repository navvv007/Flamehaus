// ── Add these lines to your existing apiClient.js ──────────────────────────

// Customer — cancel own order
export const customerCancelOrder  = (orderId, reason) =>
  api.post(`/customer/orders/${orderId}/cancel`, { reason },
    { headers: { Authorization: `Bearer ${localStorage.getItem("fh_customer_token")}` } });

export const customerGetCancellation = (orderId) =>
  api.get(`/customer/orders/${orderId}/cancellation`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("fh_customer_token")}` } });

// Admin — cancel any order + list all cancellations
export const adminCancelOrder     = (orderId, reason) =>
  api.post(`/admin/orders/${orderId}/cancel`, { reason },
    { headers: { Authorization: `Bearer ${localStorage.getItem("fh_admin_token")}` } });

export const fetchCancellations   = () =>
  api.get("/admin/cancellations",
    { headers: { Authorization: `Bearer ${localStorage.getItem("fh_admin_token")}` } });

export const adminGetCancellation = (orderId) =>
  api.get(`/admin/orders/${orderId}/cancellation`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("fh_admin_token")}` } });
