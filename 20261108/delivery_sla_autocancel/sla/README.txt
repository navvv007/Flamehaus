DELIVERY SLA — AUTO-CANCEL + REFUND
===================================

DO THIS IN ORDER
 1. Run  db/migrate_timeout_v2.sql  in phpMyAdmin (database flamehaus_db).
 2. Copy the backend files (table below).
 3. Add the lines from  be/application_properties_addition.txt  to application.properties.
 4. Delete these if you have them (replaced / no longer needed):
      - the OLD OrderTimeoutService.java  (the new one overwrites it)
      - TimeoutTestController.java        (optional: it still compiles, but it is a
                                           test-only endpoint - remove before production)
 5. Restart the backend:  mvn spring-boot:run
 6. Copy the frontend files, then wire the admin route + nav (below).

ADMIN ROUTE + NAV
  App.jsx      import AdminTimeoutOrders from "./admin/pages/AdminTimeoutOrders";
               <Route path="timeout-orders" element={<AdminTimeoutOrders />} />   (inside /admin routes)
  AdminLayout  { to: "/admin/timeout-orders", label: "Delivery SLA", icon: "⏱" }

OPTIONAL (defence in depth) — SecurityConfig.java, before .anyRequest().authenticated():
  .requestMatchers("/api/admin/timeout/**").hasRole("ADMIN")
  The controller already rejects non-admins with 403, so this is not required.

TEST IT (5 minutes)
  A. application.properties:  app.delivery.timeout-minutes=2   -> restart
  B. Place an order, advance it to Preparing, make sure a partner is ONLINE (it gets assigned).
  C. Wait ~3 minutes. Expected:
       - backend log:   [TIMEOUT] Order #N cancelled. Refund: ...
       - admin > Delivery SLA > Auto-cancelled tab shows the order
       - customer's order page shows Cancelled + the refund card
       - SMS (or console log if twilio.sms.enabled=false)
  D. Put timeout-minutes back to 120 and restart.
  Alternative to A: backdate one assignment with the UPDATE in the SQL file.

IF A REFUND SHOWS "Refund failed"
  Read the note on the admin screen. Most common: the key property names in
  application.properties differ from razorpay.key.id / razorpay.key.secret / stripe.secret.key.
  Fix the names, restart, then press "Retry refund" (Refunds to retry tab).

WHAT "AUTO-CANCELLED" DOES
  assignment -> FAILED, partner freed, order -> Cancelled, refund issued (full amount),
  payment -> REFUNDED (or REFUND_PENDING if the gateway call failed), row written to
  order_cancellations (cancelled_by = SYSTEM), SMS to customer and partner.
