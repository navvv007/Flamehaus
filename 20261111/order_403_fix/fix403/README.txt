FIX: "Could not load this order (HTTP 403)" after payment
========================================================

STEP 1 - make sure the NEW backend is the one running (most likely culprit)
  Old backend still answering = the raw-payment-record bug is still live.
  a) In Command Prompt:   netstat -ano | findstr :8080
     If a process is listed, note its PID (last column), then:   taskkill /PID <pid> /F
  b) Start fresh:         mvn spring-boot:run
     Watch for a startup error such as "Port 8080 was already in use" - that means
     the old process was still running and the new one never started.
  c) Check the version: open  http://localhost:5173/api/orders/26/track  in the browser.
       - NEW backend: JSON with id, status, itemsSummary, total, paymentStatus, city ...
                      and NO "payment" or "customerPhone" keys.
       - OLD backend: contains a "payment": { ... } block, or an error.

STEP 2 - apply the two small changes in this zip
  be/SecurityConfig_error_dispatch.txt        -> one line in SecurityConfig.java
  be/application_properties_addition.txt      -> two lines in application.properties
  fe/OrderDetail.jsx                          -> src/website/pages/OrderDetail.jsx
  Restart the backend again after editing SecurityConfig / properties.

STEP 3 - reload /orders/26
  If it still fails, the page now shows the real status AND the server's message, and the
  backend console prints the exception. Send me:
       [ORDER] failed to load order #26: ...
  or whatever stack trace appears at that moment.

WHAT CHANGED IN THE PAGE
  - The public fallback call now sends no login token (a stale token can no longer break it).
  - Error text includes the server's message when there is one.
