1. Replace  src/main/java/com/flamehaus/api/service/OrderService.java        with be/OrderService.java
2. Replace  src/main/java/com/flamehaus/api/controller/OrderController.java  with be/OrderController.java
3. Replace  src/admin/pages/Dashboard.jsx                                    with fe/Dashboard.jsx
4. Restart the backend (mvn spring-boot:run). The frontend hot-reloads.

Still shows an error? The page now prints the HTTP status, e.g.
  "Failed to load dashboard data (HTTP 403): ..."
Send me that exact line.
If the BACKEND fails to start with "Ambiguous mapping ... /api/admin/dashboard",
another controller already maps that URL. Delete that mapping there.
