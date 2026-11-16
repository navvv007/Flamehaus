// Add to src/api/apiClient.js

// ── Customer Addresses ────────────────────────────────────────────────────────
export const fetchAddresses   = ()        => api.get("/customer/addresses");
export const saveAddress      = (d)       => api.post("/customer/addresses", d);
export const updateAddress    = (id, d)   => api.put(`/customer/addresses/${id}`, d);
export const deleteAddress    = (id)      => api.delete(`/customer/addresses/${id}`);
export const setDefaultAddress= (id)      => api.patch(`/customer/addresses/${id}/default`);