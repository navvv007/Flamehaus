// Add these to src/api/apiClient.js

export const validateCoupon     = (data)    => api.post("/coupons/validate", data);
export const fetchActiveCoupons = ()        => api.get("/coupons/active");
export const applyCoupon        = (data)    => api.post("/coupons/apply", data);
export const fetchAdminCoupons  = ()        => api.get("/admin/coupons");
export const createCoupon       = (d)       => api.post("/admin/coupons", d);
export const updateCoupon       = (id, d)   => api.put(`/admin/coupons/${id}`, d);
export const toggleCoupon       = (id)      => api.patch(`/admin/coupons/${id}/toggle`);
export const deleteCoupon       = (id)      => api.delete(`/admin/coupons/${id}`);