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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class DeliveryService {

    private static final int    MAX_REASSIGN_ATTEMPTS = 3;
    private static final String OTP_CHARS             = "0123456789";
    private final SecureRandom  random                = new SecureRandom();

    private final DeliveryAssignmentRepository assignmentRepo;
    private final DeliveryPartnerRepository    partnerRepo;
    private final OrderRepository              orderRepo;
    private final PasswordEncoder              encoder;
    private final JwtUtil                      jwtUtil;
    private final SmsService                   smsService;

    public DeliveryService(DeliveryAssignmentRepository assignmentRepo,
                           DeliveryPartnerRepository partnerRepo,
                           OrderRepository orderRepo,
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
            throw new RuntimeException(
                "PENDING".equals(p.getStatus())
                    ? "Account pending approval"
                    : "Account not active");
        String token = jwtUtil.generateDeliveryToken(p.getEmail(), p.getId());
        return buildLoginResponse(p, token);
    }

    public Map<String, Object> buildLoginResponse(DeliveryPartner p, String token) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("token",            token);
        map.put("id",               p.getId());
        map.put("name",             p.getName());
        map.put("email",            p.getEmail());
        map.put("phone",            p.getPhone());
        map.put("vehicleType",      p.getVehicleType() != null ? p.getVehicleType() : "");
        map.put("vehicleNumber",    p.getVehicleNumber() != null ? p.getVehicleNumber() : "");
        map.put("status",           p.getStatus());
        map.put("availability",     p.getAvailability());
        map.put("rating",           p.getRating() != null ? p.getRating() : 0.0);
        map.put("totalDeliveries",  p.getTotalDeliveries() != null ? p.getTotalDeliveries() : 0);
        map.put("totalRatings",     p.getTotalRatings() != null ? p.getTotalRatings() : 0);
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
            "Hi " + p.getName() + "! Your Flamehaus delivery partner account is approved. " +
            "Login now: flamehaus.in/delivery/login");
        return p;
    }

    public DeliveryPartner rejectPartner(Long id) {
        DeliveryPartner p = getPartner(id);
        p.setStatus("REJECTED");
        partnerRepo.save(p);
        smsService.send(p.getPhone(),
            "Hi " + p.getName() + ", your Flamehaus delivery partner application was not approved. " +
            "Contact support for details.");
        return p;
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

    // ── Auto-assign ───────────────────────────────────────────────────────────

    /**
     * Called automatically when an order advances to "Preparing".
     * Only assigns if an ONLINE partner is available.
     * Excludes partners who already rejected this order.
     */
    public Optional<DeliveryAssignment> autoAssign(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        // Skip if already has active assignment
        if (assignmentRepo.existsByOrderIdAndStatusIn(orderId,
                List.of("ASSIGNED", "ACCEPTED", "PICKED_UP"))) {
            System.out.println("[AUTO-ASSIGN] Order #" + orderId + " already has active assignment");
            return Optional.empty();
        }

        // Get partners who already rejected this order
        List<Long> excludedIds = assignmentRepo.findRejectedPartnerIdsByOrderId(orderId);
        if (excludedIds.isEmpty()) excludedIds = List.of(-1L); // avoid SQL IN () error

        long rejectionCount = assignmentRepo.countRejectedByOrderId(orderId);
        if (rejectionCount >= MAX_REASSIGN_ATTEMPTS) {
            System.out.println("[AUTO-ASSIGN] Order #" + orderId +
                " reached max rejections (" + MAX_REASSIGN_ATTEMPTS + "). Needs manual assignment.");
            notifyAdminNoPartner(orderId);
            return Optional.empty();
        }

        // Find nearest ONLINE partner
        Optional<DeliveryPartner> partnerOpt;
        if (order.getDeliveryLat() != null && order.getDeliveryLng() != null) {
            // Restaurant coords (Jubilee Hills) as pickup reference
            partnerOpt = partnerRepo.findNearestOnlinePartner(
                17.4326, 78.4071, excludedIds);
        } else {
            partnerOpt = partnerRepo.findLeastBusyOnlinePartner(excludedIds);
        }

        if (partnerOpt.isEmpty()) {
            System.out.println("[AUTO-ASSIGN] No ONLINE partners available for order #" + orderId);
            return Optional.empty();
        }

        return Optional.of(createAssignment(order, partnerOpt.get(), rejectionCount));
    }

    /**
     * Admin manually reassigns — optionally to a specific partner.
     * If partnerId is null, auto-assign picks the best available.
     */
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

        long rejectionCount = assignmentRepo.countRejectedByOrderId(orderId);
        return createAssignment(order, partner, rejectionCount);
    }

    private DeliveryAssignment createAssignment(Order order, DeliveryPartner partner, long previousRejections) {
        String otp = generateOtp();

        DeliveryAssignment a = new DeliveryAssignment();
        a.setOrder(partner.getId() != null ? order : order);
        a.setOrder(order);
        a.setPartner(partner);
        a.setStatus("ASSIGNED");
        a.setAssignedAt(LocalDateTime.now());
        a.setDeliveryOtp(otp);
        a.setReassignCount((int) previousRejections);
        DeliveryAssignment saved = assignmentRepo.save(a);

        // Partner goes BUSY
        partner.setAvailability("BUSY");
        partnerRepo.save(partner);

        // SMS to partner
        smsService.send(partner.getPhone(),
            "🔥 New delivery! Order #" + order.getId() +
            " | Drop: " + (order.getDeliveryAddress() != null ? order.getDeliveryAddress() : "see app") +
            " | Customer: " + order.getCustomerName() +
            " | Delivery OTP: " + otp +
            " | Accept/Reject in app: flamehaus.in/delivery/dashboard");

        // SMS to customer
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! 🛵 " + partner.getName() +
            " (" + partner.getPhone() + ") is delivering your Flamehaus order #" + order.getId() +
            ". Delivery OTP: " + otp + " (share only when they arrive).");

        return saved;
    }

    // ── Partner actions ───────────────────────────────────────────────────────

    public DeliveryAssignment acceptOrder(Long assignmentId, Long partnerId) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ASSIGNED".equals(a.getStatus()))
            throw new RuntimeException("Order is no longer available to accept");
        a.setStatus("ACCEPTED");
        a.setAcceptedAt(LocalDateTime.now());
        return assignmentRepo.save(a);
    }

    /**
     * Partner rejects an assigned order.
     * Sets status=REJECTED on current assignment,
     * frees partner back to ONLINE,
     * immediately triggers auto-reassign to next available partner.
     */
    public DeliveryAssignment rejectOrder(Long assignmentId, Long partnerId, String reason) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ASSIGNED".equals(a.getStatus()))
            throw new RuntimeException("Can only reject orders in ASSIGNED status");

        // Mark rejected
        a.setStatus("REJECTED");
        a.setRejectedAt(LocalDateTime.now());
        a.setRejectionReason(reason != null ? reason : "Partner declined");
        assignmentRepo.save(a);

        // Free partner back to ONLINE
        DeliveryPartner partner = a.getPartner();
        partner.setAvailability("ONLINE");
        partnerRepo.save(partner);

        // Notify admin SMS
        System.out.println("[REJECT] Partner " + partner.getName() +
            " rejected order #" + a.getOrder().getId() +
            ". Reason: " + a.getRejectionReason());

        // Immediately auto-reassign to next available partner
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
        if (!List.of("ONLINE", "OFFLINE", "BUSY").contains(availability))
            throw new RuntimeException("Invalid availability: " + availability);

        String old = p.getAvailability();
        p.setAvailability(availability);
        partnerRepo.save(p);

        // If partner just went ONLINE, try to assign any unassigned pending orders
        if ("ONLINE".equals(availability) && !"ONLINE".equals(old)) {
            System.out.println("[AVAILABILITY] Partner " + p.getName() +
                " went ONLINE — checking for unassigned orders");
            assignPendingOrdersToNewlyOnlinePartner(p);
        }

        return p;
    }

    /**
     * When a partner goes ONLINE, find any "Preparing" orders without an active
     * assignment and assign the first one to this partner.
     */
    private void assignPendingOrdersToNewlyOnlinePartner(DeliveryPartner partner) {
        // Use efficient JPQL query instead of loading all orders
        orderRepo.findUnassignedPreparingOrders().stream()
            .filter(o -> !assignmentRepo.findRejectedPartnerIdsByOrderId(o.getId())
                .contains(partner.getId()))
            .findFirst()
            .ifPresent(o -> {
                System.out.println("[AUTO-ASSIGN] Assigning pending order #" + o.getId() +
                    " to newly-online partner " + partner.getName());
                createAssignment(o, partner, assignmentRepo.countRejectedByOrderId(o.getId()));
            });
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
            throw new RuntimeException("Must accept order before marking picked up");
        a.setStatus("PICKED_UP");
        a.setPickedUpAt(LocalDateTime.now());
        if (lat != null) a.setPickupLat(lat);
        if (lng != null) a.setPickupLng(lng);

        // Advance order status
        Order order = a.getOrder();
        order.setStatus("On the Way");
        order.setTrackingNote("Your order has been picked up and is on the way!");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! 🛵 Your Flamehaus order #" + order.getId() +
            " has been picked up and is on the way. Delivery OTP: " + a.getDeliveryOtp());

        return assignmentRepo.save(a);
    }

    public DeliveryAssignment markDelivered(Long assignmentId, Long partnerId, String otp) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"PICKED_UP".equals(a.getStatus()))
            throw new RuntimeException("Order must be picked up before marking delivered");
        if (!a.getDeliveryOtp().equals(otp))
            throw new RuntimeException("Invalid delivery OTP");

        a.setStatus("DELIVERED");
        a.setDeliveredAt(LocalDateTime.now());

        // Free partner
        DeliveryPartner partner = a.getPartner();
        partner.setAvailability("ONLINE");
        partner.setTotalDeliveries(partner.getTotalDeliveries() != null
            ? partner.getTotalDeliveries() + 1 : 1);
        partnerRepo.save(partner);

        // Advance order
        Order order = a.getOrder();
        order.setStatus("Delivered");
        order.setTrackingNote("Order delivered successfully!");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! ✅ Your Flamehaus order #" + order.getId() +
            " has been delivered. Enjoy your meal! Rate your experience: flamehaus.in/orders/" + order.getId());

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

        // Update partner aggregate rating
        DeliveryPartner p = a.getPartner();
        int count = p.getTotalRatings() != null ? p.getTotalRatings() : 0;
        double avg = p.getRating() != null ? p.getRating() : 0.0;
        p.setRating((avg * count + req.getRating()) / (count + 1));
        p.setTotalRatings(count + 1);
        partnerRepo.save(p);

        return a;
    }

    public DeliveryAssignment rateOrderExperience(Long assignmentId, Long partnerId,
                                                   int rating, String comment) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"DELIVERED".equals(a.getStatus()))
            throw new RuntimeException("Can only rate after delivery");
        if (a.getPartnerOrderRating() != null)
            throw new RuntimeException("Already rated this delivery");
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
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!a.getPartner().getId().equals(partnerId))
            throw new RuntimeException("Access denied");
        return a;
    }

    private DeliveryPartner getPartner(Long id) {
        return partnerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found: " + id));
    }

    private String generateOtp() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 4; i++)
            sb.append(OTP_CHARS.charAt(random.nextInt(OTP_CHARS.length())));
        return sb.toString();
    }

    private void notifyAdminNoPartner(Long orderId) {
        System.out.println("[ALERT] Order #" + orderId +
            " has no available delivery partners after " + MAX_REASSIGN_ATTEMPTS +
            " rejections. Manual assignment required.");
    }
}
