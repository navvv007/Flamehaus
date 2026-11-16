package com.flamehaus.api.service;

import com.flamehaus.api.dto.DeliveryPartnerRegisterRequest;
import com.flamehaus.api.dto.DeliveryRatingRequest;
import com.flamehaus.api.entity.DeliveryAssignment;
import com.flamehaus.api.entity.DeliveryPartner;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.DeliveryAssignmentRepository;
import com.flamehaus.api.repository.DeliveryPartnerRepository;
import com.flamehaus.api.repository.OrderRepository;
import com.flamehaus.api.security.JwtUtil;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class DeliveryService {

    private static final int    MAX_REASSIGN = 3;
    private final SecureRandom  random       = new SecureRandom();

    private final DeliveryAssignmentRepository assignmentRepo;
    private final DeliveryPartnerRepository    partnerRepo;
    private final OrderRepository              orderRepo;
    private final PasswordEncoder              encoder;
    private final JwtUtil                      jwtUtil;
    private final SmsService                   smsService;

    public DeliveryService(DeliveryAssignmentRepository assignmentRepo,
                           DeliveryPartnerRepository partnerRepo,
                           @Lazy OrderRepository orderRepo,
                           PasswordEncoder encoder,
                           JwtUtil jwtUtil,
                           SmsService smsService) {
        this.assignmentRepo = assignmentRepo;
        this.partnerRepo    = partnerRepo;
        this.orderRepo      = orderRepo;
        this.encoder        = encoder;
        this.jwtUtil        = jwtUtil;
        this.smsService     = smsService;
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    public DeliveryPartner register(DeliveryPartnerRegisterRequest req) {
        if (partnerRepo.existsByEmail(req.getEmail()))
            throw new RuntimeException("Email already registered");
        if (partnerRepo.existsByPhone(req.getPhone()))
            throw new RuntimeException("Phone already registered");

        DeliveryPartner p = new DeliveryPartner();
        p.setName(req.getName());
        p.setEmail(req.getEmail().toLowerCase());
        p.setPassword(encoder.encode(req.getPassword()));
        p.setPhone(req.getPhone());
        p.setVehicleType(req.getVehicleType() != null ? req.getVehicleType() : "Bike");
        p.setVehicleNumber(req.getVehicleNumber());
        p.setStatus("PENDING");
        p.setAvailability("OFFLINE");
        return partnerRepo.save(p);
    }

    public Map<String, Object> login(String email, String password) {
        DeliveryPartner p = partnerRepo.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        if (!encoder.matches(password, p.getPassword()))
            throw new RuntimeException("Invalid email or password");
        if (!"ACTIVE".equals(p.getStatus()))
            throw new RuntimeException("PENDING".equals(p.getStatus())
                ? "Account pending admin approval" : "Account not active");
        return buildLoginResponse(p, jwtUtil.generateDeliveryToken(p.getEmail(), p.getId()));
    }

    public Map<String, Object> buildLoginResponse(DeliveryPartner p, String token) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("token",           token);
        map.put("id",              p.getId());
        map.put("name",            p.getName());
        map.put("email",           p.getEmail());
        map.put("phone",           p.getPhone());
        map.put("vehicleType",     p.getVehicleType()   != null ? p.getVehicleType()   : "");
        map.put("vehicleNumber",   p.getVehicleNumber() != null ? p.getVehicleNumber() : "");
        map.put("status",          p.getStatus());
        map.put("availability",    p.getAvailability());
        map.put("rating",          p.getRating()          != null ? p.getRating()          : 0.0);
        map.put("totalDeliveries", p.getTotalDeliveries() != null ? p.getTotalDeliveries() : 0);
        map.put("totalRatings",    p.getTotalRatings()    != null ? p.getTotalRatings()    : 0);
        return map;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public List<DeliveryPartner> getAllPartners()     { return partnerRepo.findAll(); }
    public List<DeliveryPartner> getPendingPartners() { return partnerRepo.findByStatus("PENDING"); }

    public DeliveryPartner approvePartner(Long id) {
        DeliveryPartner p = getPartner(id);
        p.setStatus("ACTIVE");
        p.setApprovedAt(LocalDateTime.now());
        partnerRepo.save(p);
        smsService.send(p.getPhone(),
            "Hi " + p.getName() + "! Your Flamehaus delivery account is approved. " +
            "Login: flamehaus.in/delivery/login");
        return p;
    }

    public DeliveryPartner rejectPartner(Long id) {
        DeliveryPartner p = getPartner(id);
        p.setStatus("REJECTED");
        return partnerRepo.save(p);
    }

    public DeliveryPartner togglePartnerActive(Long id) {
        DeliveryPartner p = getPartner(id);
        p.setStatus("ACTIVE".equals(p.getStatus()) ? "INACTIVE" : "ACTIVE");
        return partnerRepo.save(p);
    }

    public List<DeliveryAssignment> getAllAssignments() {
        return assignmentRepo.findAllByOrderByAssignedAtDesc();
    }

    public Optional<DeliveryAssignment> getAssignmentByOrderId(Long orderId) {
        return assignmentRepo.findActiveByOrderId(orderId);
    }

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

    public DeliveryAssignment adminReassign(Long orderId, Long partnerId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        DeliveryPartner partner;
        if (partnerId != null) {
            partner = getPartner(partnerId);
            if (!"ACTIVE".equals(partner.getStatus()))
                throw new RuntimeException("Partner is not active");
        } else {
            List<Long> excluded = assignmentRepo.findRejectedPartnerIdsByOrderId(orderId);
            if (excluded.isEmpty()) excluded = List.of(-1L);
            partner = partnerRepo.findLeastBusyOnlinePartner(excluded)
                    .orElseThrow(() -> new RuntimeException("No ONLINE partner available"));
        }
        return createAssignment(order, partner, (int) assignmentRepo.countRejectedByOrderId(orderId));
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

    // private void notifyAdminNoPartner(Long orderId) {
    //     Order order = orderRepo.findById(orderId)
    //             .orElseThrow(() -> new RuntimeException("Order not found"));
    //     smsService.send("ADMIN_PHONE_NUMBER", // Replace with actual admin phone number
    //         "No delivery partner available for order #" + orderId +
    //         " | Customer: " + order.getCustomerName() +
    //         " | Address: " + (order.getDeliveryAddress() != null ? order.getDeliveryAddress() : "see app") +
    //         ". Please assign manually.");
    // }
    
    
    private void notifyAdminNoPartner(Long orderId) {
        System.out.println("[ALERT] Order #" + orderId +
        " has no available delivery partner after " + MAX_REASSIGN +
        " rejections. Manual assignment required.");
    }

    // ── Partner actions ───────────────────────────────────────────────────────

    public DeliveryAssignment acceptOrder(Long assignmentId, Long partnerId) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ASSIGNED".equals(a.getStatus()))
            throw new RuntimeException("Order is no longer in ASSIGNED status (current: " + a.getStatus() + ")");
        a.setStatus("ACCEPTED");
        a.setAcceptedAt(LocalDateTime.now());
        return assignmentRepo.save(a);
    }

    /**
     * Partner rejects an order.
     * Allows rejection of ASSIGNED or ACCEPTED status.
     * Immediately auto-reassigns to next available ONLINE partner.
     */
    public DeliveryAssignment rejectOrder(Long assignmentId, Long partnerId, String reason) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);

        // Terminal states — cannot reject
        if (List.of("DELIVERED", "FAILED").contains(a.getStatus())) {
            throw new RuntimeException(
                "This order is already " + a.getStatus().toLowerCase() +
                " and cannot be rejected.");
        }
        if ("REJECTED".equals(a.getStatus())) {
            throw new RuntimeException("This order was already rejected.");
        }
        if ("PICKED_UP".equals(a.getStatus())) {
            throw new RuntimeException(
                "Cannot reject after picking up. Contact admin for assistance.");
        }
        // Only ASSIGNED or ACCEPTED can be rejected
        if (!List.of("ASSIGNED", "ACCEPTED").contains(a.getStatus())) {
            throw new RuntimeException(
                "Cannot reject order in current status: " + a.getStatus());
        }

        a.setStatus("REJECTED");
        a.setRejectedAt(LocalDateTime.now());
        a.setRejectionReason(reason != null ? reason : "Partner declined");
        assignmentRepo.save(a);

        // Free partner back to ONLINE
        DeliveryPartner partner = a.getPartner();
        partner.setAvailability("ONLINE");
        partnerRepo.save(partner);

        System.out.println("[REJECT] " + partner.getName() +
            " rejected order #" + a.getOrder().getId() + " — " + a.getRejectionReason());

        // Immediately auto-reassign
        Long orderId = a.getOrder().getId();
        autoAssign(orderId).ifPresentOrElse(
            next -> System.out.println("[REASSIGN] Order #" + orderId +
                " reassigned to " + next.getPartner().getName()),
            () -> System.out.println("[REASSIGN] No partner available for order #" + orderId)
        );

        return a;
    }

    public DeliveryPartner updateAvailability(Long partnerId, String availability) {
        DeliveryPartner p = getPartner(partnerId);
        if (!List.of("ONLINE","OFFLINE","BUSY").contains(availability))
            throw new RuntimeException("Invalid availability: " + availability);
        String old = p.getAvailability();
        p.setAvailability(availability);
        partnerRepo.save(p);
        if ("ONLINE".equals(availability) && !"ONLINE".equals(old))
            assignPendingOrdersToNewlyOnlinePartner(p);
        return p;
    }

    private void assignPendingOrdersToNewlyOnlinePartner(DeliveryPartner partner) {
        orderRepo.findUnassignedPreparingOrders().stream()
            .filter(o -> !assignmentRepo.findRejectedPartnerIdsByOrderId(o.getId())
                .contains(partner.getId()))
            .findFirst()
            .ifPresent(o -> createAssignment(o, partner,
                (int) assignmentRepo.countRejectedByOrderId(o.getId())));
    }

    public DeliveryPartner updateLocation(Long partnerId, double lat, double lng) {
        DeliveryPartner p = getPartner(partnerId);
        p.setCurrentLat(lat);
        p.setCurrentLng(lng);
        return partnerRepo.save(p);
    }

    public List<DeliveryAssignment> getPartnerAssignments(Long partnerId) {
        return assignmentRepo.findByPartnerIdOrderByAssignedAtDesc(partnerId);
    }

    public DeliveryAssignment markPickedUp(Long assignmentId, Long partnerId,
                                           Double lat, Double lng) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ACCEPTED".equals(a.getStatus()))
            throw new RuntimeException("Must accept order before pickup");
        a.setStatus("PICKED_UP");
        a.setPickedUpAt(LocalDateTime.now());
        if (lat != null) a.setPickupLat(lat);
        if (lng != null) a.setPickupLng(lng);
        Order order = a.getOrder();
        order.setStatus("On the Way");
        order.setTrackingNote("Your order has been picked up and is on the way!");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! Order #" + order.getId() +
            " is on the way. OTP: " + a.getDeliveryOtp() + " (share on arrival).");
        return assignmentRepo.save(a);
    }

    public DeliveryAssignment markDelivered(Long assignmentId, Long partnerId, String otp) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"PICKED_UP".equals(a.getStatus()))
            throw new RuntimeException("Order must be picked up first");
        if (!a.getDeliveryOtp().equals(otp))
            throw new RuntimeException("Invalid delivery OTP. Please check with the customer.");
        a.setStatus("DELIVERED");
        a.setDeliveredAt(LocalDateTime.now());
        DeliveryPartner partner = a.getPartner();
        partner.setAvailability("ONLINE");
        partner.setTotalDeliveries(partner.getTotalDeliveries() != null
            ? partner.getTotalDeliveries() + 1 : 1);
        partnerRepo.save(partner);
        Order order = a.getOrder();
        order.setStatus("Delivered");
        order.setTrackingNote("Delivered successfully!");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! Order #" + order.getId() +
            " delivered. Enjoy! Rate: flamehaus.in/orders/" + order.getId());
        return assignmentRepo.save(a);
    }

    // ── Rating ────────────────────────────────────────────────────────────────

    public DeliveryAssignment rateDelivery(Long assignmentId, DeliveryRatingRequest req) {
        DeliveryAssignment a = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!"DELIVERED".equals(a.getStatus()))
            throw new RuntimeException("Can only rate after delivery");
        if (a.getPartnerRating() != null)
            throw new RuntimeException("Already rated");
        a.setPartnerRating(req.getRating());
        a.setRatingComment(req.getComment());
        a.setRatedAt(LocalDateTime.now());
        assignmentRepo.save(a);
        DeliveryPartner p = a.getPartner();
        int cnt   = p.getTotalRatings()  != null ? p.getTotalRatings()  : 0;
        double avg= p.getRating()        != null ? p.getRating()        : 0.0;
        p.setRating((avg * cnt + req.getRating()) / (cnt + 1));
        p.setTotalRatings(cnt + 1);
        partnerRepo.save(p);
        return a;
    }

    public DeliveryAssignment rateOrderExperience(Long assignmentId, Long partnerId,
                                                   int rating, String comment) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"DELIVERED".equals(a.getStatus()))
            throw new RuntimeException("Can only rate after delivery");
        if (a.getPartnerOrderRating() != null)
            throw new RuntimeException("Already rated");
        a.setPartnerOrderRating(rating);
        a.setPartnerOrderComment(comment);
        a.setPartnerRatedAt(LocalDateTime.now());
        return assignmentRepo.save(a);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public Optional<DeliveryPartner> findByPhone(String phone) {
        return partnerRepo.findByPhone(phone);
    }

    public DeliveryAssignment getAssignmentForPartner(Long assignmentId, Long partnerId) {
        DeliveryAssignment a = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found: " + assignmentId));
        if (!a.getPartner().getId().equals(partnerId))
            throw new RuntimeException("Access denied");
        return a;
    }

    private DeliveryPartner getPartner(Long id) {
        return partnerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found: " + id));
    }
}
