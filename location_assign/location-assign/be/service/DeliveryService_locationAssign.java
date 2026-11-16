// REPLACE autoAssign() and createAssignment() in your DeliveryService.java with these:

    // Restaurant location (Flamehaus kitchen coordinates — update to your actual coords)
    private static final double RESTAURANT_LAT = 17.4326;
    private static final double RESTAURANT_LNG = 78.4071;

    /**
     * Auto-assigns the nearest ONLINE partner to the order.
     * Priority:
     *   1. Nearest partner by GPS (Haversine) — within any distance
     *   2. Fallback: least-busy ONLINE partner (when no GPS available)
     * Excludes partners who already rejected this order.
     */
    public Optional<DeliveryAssignment> autoAssign(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        // Skip if already has an active assignment
        if (assignmentRepo.existsByOrderIdAndStatusIn(orderId,
                List.of("ASSIGNED", "ACCEPTED", "PICKED_UP"))) {
            System.out.println("[AUTO-ASSIGN] Order #" + orderId + " already has active assignment");
            return Optional.empty();
        }

        List<Long> excluded = assignmentRepo.findRejectedPartnerIdsByOrderId(orderId);
        if (excluded.isEmpty()) excluded = List.of(-1L);

        long rejections = assignmentRepo.countRejectedByOrderId(orderId);
        if (rejections >= MAX_REASSIGN) {
            System.out.println("[AUTO-ASSIGN] Order #" + orderId + " reached max rejections (" + MAX_REASSIGN + ")");
            notifyAdminNoPartner(orderId);
            return Optional.empty();
        }

        Optional<DeliveryPartner> partnerOpt;

        // Use delivery GPS if available, otherwise use restaurant as reference point
        double refLat = order.getDeliveryLat() != null ? order.getDeliveryLat() : RESTAURANT_LAT;
        double refLng = order.getDeliveryLng() != null ? order.getDeliveryLng() : RESTAURANT_LNG;

        // Try nearest partner by GPS
        partnerOpt = partnerRepo.findNearestOnlinePartner(refLat, refLng, excluded);

        // Fallback: least-busy if no GPS-located partner found
        if (partnerOpt.isEmpty()) {
            System.out.println("[AUTO-ASSIGN] No GPS-located partner — using least-busy fallback");
            partnerOpt = partnerRepo.findLeastBusyOnlinePartner(excluded);
        }

        if (partnerOpt.isEmpty()) {
            System.out.println("[AUTO-ASSIGN] No ONLINE partner available for order #" + orderId);
            return Optional.empty();
        }

        DeliveryPartner partner = partnerOpt.get();

        // Log distance if GPS available
        if (partner.getCurrentLat() != null) {
            double dist = haversineKm(refLat, refLng, partner.getCurrentLat(), partner.getCurrentLng());
            System.out.printf("[AUTO-ASSIGN] Assigning order #%d to %s (%.2f km away)%n",
                orderId, partner.getName(), dist);
        }

        return Optional.of(createAssignment(order, partner, (int) rejections));
    }

    /** Haversine distance in km between two GPS coordinates */
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    private DeliveryAssignment createAssignment(Order order, DeliveryPartner partner, int prevRejections) {
        String otp = String.format("%04d", random.nextInt(10000));
        DeliveryAssignment a = new DeliveryAssignment();
        a.setOrder(order);
        a.setPartner(partner);
        a.setStatus("ASSIGNED");
        a.setAssignedAt(LocalDateTime.now());
        a.setDeliveryOtp(otp);
        a.setReassignCount(prevRejections);
        DeliveryAssignment saved = assignmentRepo.save(a);

        // Partner goes BUSY
        partner.setAvailability("BUSY");
        partnerRepo.save(partner);

        // SMS to partner
        smsService.send(partner.getPhone(),
            "New delivery! Order #" + order.getId() +
            " | Customer: " + order.getCustomerName() +
            " | Address: " + (order.getDeliveryAddress() != null ? order.getDeliveryAddress() : "see app") +
            " | OTP: " + otp +
            " | Accept in app: flamehaus.in/delivery/dashboard");

        // SMS to customer
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! " + partner.getName() +
            " (" + partner.getVehicleType() + ") is delivering your order #" + order.getId() +
            ". Delivery OTP: " + otp + " (share only on arrival).");

        return saved;
    }
