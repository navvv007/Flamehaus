FIX: "Order not found" after payment
===================================
1. Replace  src/main/java/com/flamehaus/api/service/OrderService.java        with be/OrderService.java
2. Replace  src/main/java/com/flamehaus/api/controller/OrderController.java  with be/OrderController.java
3. Replace  src/website/pages/OrderDetail.jsx                                with fe/OrderDetail.jsx
4. Restart the backend (mvn spring-boot:run). The frontend hot-reloads.

OrderService.java already contains the earlier payment_status fix
(order.setPaymentStatus("PENDING") and setUpdatedAt in placeOrder) - do not add those lines twice.

IF IT STILL FAILS
 - The page now prints the real reason, e.g. "Could not load this order (HTTP 500)".
 - The backend console prints:  [ORDER] failed to load order #NN: <exception>   plus a stack trace.
 - Send me that [ORDER] line.

WHAT THE PUBLIC TRACK URL RETURNS NOW (GET /api/orders/{id}/track - no login needed)
 id, status, trackingNote, itemsSummary, total, coupon, paymentStatus, city, timestamps.
 NOT returned any more: customer phone, full address, delivery OTP, payment ids.
 Logged-in owner (GET /api/customer/orders/{id}) and admin (GET /api/admin/orders/{id})
 get the full detail.
