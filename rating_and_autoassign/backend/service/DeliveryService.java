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
import com.flamehaus.api.security.OtpStore;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DeliveryService {

    private final DeliveryPartnerRepository   partnerRepo;
    private final DeliveryAssignmentRepository assignmentRepo;
    private final OrderRepository             orderRepo;
    private final PasswordEncoder             encoder;
    private final JwtUtil                     jwtUtil;
    private final SmsService                  smsService;
    private final OtpStore                    otpStore;

    // Restaurant coordinates (Jubilee Hills, Hyderabad)
    private static final double RESTAURANT_LAT = 17.4326;
    private static final double RESTAURANT_LNG = 78.4071;

    public DeliveryService(DeliveryPartnerRepository partnerRepo,
                           DeliveryAssignmentRepository assignmentRepo,
                           OrderRepository orderRepo,
                           PasswordEncoder encoder,
                           JwtUtil jwtUtil,
                           SmsService smsService,
                           OtpStore otpStore) {
        this.partnerRepo    = partnerRepo;
        this.assignmentRepo = assignmentRepo;
        this.orderRepo      = orderRepo;
        this.encoder        = encoder;
        this.jwtUtil        = jwtUtil;
        this.smsService     = smsService;
        this.otpStore       = otpStore;
    }

    // ── Registration ──────────────────────────────────────────────────────────

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
        p.setRating(0.0);
        p.setTotalDeliveries(0);
        p.setTotalRatings(0);

        DeliveryPartner saved = partnerRepo.save(p);

        // Notify admin (SMS to restaurant phone if configured)
        System.out.println("[DELIVERY-REG] New partner registered: " + saved.getName()
            + " (" + saved.getPhone() + ") — awaiting admin approval");

        return saved;
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    public Map<String, Object> login(String email, String password) {
        DeliveryPartner p = partnerRepo.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        if (!encoder.matches(password, p.getPassword()))
            throw new RuntimeException("Invalid email or password");
        if ("PENDING".equals(p.getStatus()))
            throw new RuntimeException("Your account is pending admin approval");
        if ("REJECTED".equals(p.getStatus()))
            throw new RuntimeException("Your account has been rejected. Contact support.");
        if ("INACTIVE".equals(p.getStatus()))
            throw new RuntimeException("Your account is inactive. Contact support.");

        String token = jwtUtil.generateDeliveryToken(p.getEmail(), p.getId());
        return buildLoginResponse(p, token);
    }

    public Map<String, Object> buildLoginResponse(DeliveryPartner p, String token) {
        return Map.of(
            "token",           token,
            "id",              p.getId(),
            "name",            p.getName(),
            "email",           p.getEmail(),
            "phone",           p.getPhone(),
            "vehicleType",     p.getVehicleType() != null ? p.getVehicleType() : "",
            "vehicleNumber",   p.getVehicleNumber() != null ? p.getVehicleNumber() : "",
            "status",          p.getStatus(),
            "availability",    p.getAvailability(),
            "rating",          p.getRating() != null ? p.getRating() : 0.0,
            "totalDeliveries", p.getTotalDeliveries() != null ? p.getTotalDeliveries() : 0
        );
    }

    // ── OTP Lookup ────────────────────────────────────────────────────────────

    public Optional<DeliveryPartner> findByPhone(String phone) {
        return partnerRepo.findByPhone(phone);
    }

    public Optional<DeliveryPartner> findByEmail(String email) {
        return partnerRepo.findByEmail(email);
    }

    // ── Admin: partner management ─────────────────────────────────────────────

    public List<DeliveryPartner> getAllPartners() {
        return partnerRepo.findAll();
    }

    public List<DeliveryPartner> getPendingPartners() {
        return partnerRepo.findByStatus("PENDING");
    }

    public DeliveryPartner approvePartner(Long id) {
        DeliveryPartner p = getPartnerById(id);
        p.setStatus("ACTIVE");
        p.setApprovedAt(LocalDateTime.now());
        DeliveryPartner saved = partnerRepo.save(p);

        // SMS: notify partner of approval
        smsService.sendOtp(p.getPhone(),
            "Approved!",
            "Your Flamehaus delivery partner account has been approved. You can now log in and go online.");
        System.out.println("[DELIVERY-APPROVE] Partner approved: " + p.getName());
        return saved;
    }

    public DeliveryPartner rejectPartner(Long id) {
        DeliveryPartner p = getPartnerById(id);
        p.setStatus("REJECTED");
        partnerRepo.save(p);
        smsService.send(p.getPhone(),
            "Hi " + p.getName() + ", your Flamehaus delivery partner application was not approved. Contact support for more info.");
        return p;
    }

    public DeliveryPartner togglePartner(Long id) {
        DeliveryPartner p = getPartnerById(id);
        p.setStatus("ACTIVE".equals(p.getStatus()) ? "INACTIVE" : "ACTIVE");
        return partnerRepo.save(p);
    }

    // ── Auto-assign ───────────────────────────────────────────────────────────

    /**
     * Auto-assign the nearest available delivery partner to an order.
     *
     * Strategy:
     *   1. If order has delivery GPS coords → find nearest partner by Haversine distance
     *   2. Fallback: pick the ONLINE partner with fewest total deliveries (fair distribution)
     *   3. If no ONLINE partners → log and skip (order stays unassigned until a partner comes online)
     *
     * Called automatically by OrderService when order status advances to "On the Way".
     */
    public Optional<DeliveryAssignment> autoAssign(Long orderId) {
        // Skip if already assigned
        if (assignmentRepo.existsByOrderId(orderId)) {
            System.out.println("[AUTO-ASSIGN] Order #" + orderId + " already has an assignment");
            return assignmentRepo.findByOrderId(orderId);
        }

        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        // Find nearest available partner
        DeliveryPartner partner = null;

        if (order.getDeliveryLat() != null && order.getDeliveryLng() != null) {
            // Use restaurant coords as the "from" point (partner needs to go to restaurant first)
            List<DeliveryPartner> nearest = partnerRepo.findNearestAvailable(
                RESTAURANT_LAT, RESTAURANT_LNG, 1
            );
            if (!nearest.isEmpty()) partner = nearest.get(0);
        }

        // Fallback: least deliveries
        if (partner == null) {
            List<DeliveryPartner> available = partnerRepo.findAvailableByLeastDeliveries();
            if (!available.isEmpty()) partner = available.get(0);
        }

        if (partner == null) {
            System.out.println("[AUTO-ASSIGN] No available partners for order #" + orderId);
            return Optional.empty();
        }

        // Create assignment
        String deliveryOtp = String.format("%04d", new SecureRandom().nextInt(10000));

        DeliveryAssignment assignment = new DeliveryAssignment();
        assignment.setOrder(order);
        assignment.setPartner(partner);
        assignment.setStatus("ASSIGNED");
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setDeliveryOtp(deliveryOtp);

        // Set pickup coords = restaurant location
        assignment.setPickupLat(RESTAURANT_LAT);
        assignment.setPickupLng(RESTAURANT_LNG);

        assignmentRepo.save(assignment);

        // Mark partner as BUSY
        partner.setAvailability("BUSY");
        partnerRepo.save(partner);

        // SMS: notify partner
        smsService.send(partner.getPhone(), String.format(
            "🛵 New delivery! Order #%d from Flamehaus Kitchen. " +
            "Customer: %s | Phone: %s | Address: %s | Delivery OTP: %s. " +
            "Open the app to accept.",
            order.getId(), order.getCustomerName(), order.getCustomerPhone(),
            order.getDeliveryAddress(), deliveryOtp
        ));

        // SMS: notify customer
        smsService.send(order.getCustomerPhone(), String.format(
            "Hi %s! Your Flamehaus order #%d has been assigned to %s (📞 %s). " +
            "Delivery OTP: %s — share this when your order arrives.",
            order.getCustomerName(), order.getId(),
            partner.getName(), partner.getPhone(), deliveryOtp
        ));

        System.out.println("[AUTO-ASSIGN] Order #" + orderId
            + " assigned to " + partner.getName() + " (OTP: " + deliveryOtp + ")");

        return Optional.of(assignment);
    }

    // ── Partner actions ───────────────────────────────────────────────────────

    public DeliveryPartner updateAvailability(Long partnerId, String availability) {
        DeliveryPartner p = getPartnerById(partnerId);
        // Don't allow going ONLINE when BUSY (has active delivery)
        if ("ONLINE".equals(availability) && "BUSY".equals(p.getAvailability())) {
            throw new RuntimeException("Cannot go online while handling a delivery");
        }
        p.setAvailability(availability);
        return partnerRepo.save(p);
    }

    public DeliveryPartner updateLocation(Long partnerId, double lat, double lng) {
        DeliveryPartner p = getPartnerById(partnerId);
        p.setCurrentLat(lat);
        p.setCurrentLng(lng);
        return partnerRepo.save(p);
    }

    public List<DeliveryAssignment> getPartnerAssignments(Long partnerId) {
        return assignmentRepo.findByPartnerIdOrderByAssignedAtDesc(partnerId);
    }

    public DeliveryAssignment getAssignmentForPartner(Long assignmentId, Long partnerId) {
        DeliveryAssignment a = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!a.getPartner().getId().equals(partnerId))
            throw new RuntimeException("Not your assignment");
        return a;
    }

    public DeliveryAssignment acceptAssignment(Long assignmentId, Long partnerId) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ASSIGNED".equals(a.getStatus()))
            throw new RuntimeException("Assignment is not in ASSIGNED state");
        a.setStatus("ACCEPTED");
        a.setAcceptedAt(LocalDateTime.now());
        return assignmentRepo.save(a);
    }

    public DeliveryAssignment markPickedUp(Long assignmentId, Long partnerId,
                                            Double lat, Double lng) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ACCEPTED".equals(a.getStatus()))
            throw new RuntimeException("Must accept first");
        a.setStatus("PICKED_UP");
        a.setPickedUpAt(LocalDateTime.now());
        if (lat != null) a.setPickupLat(lat);
        if (lng != null) a.setPickupLng(lng);

        // Also advance the order status to "On the Way"
        Order order = a.getOrder();
        order.setStatus("On the Way");
        order.setTrackingNote("Your order has been picked up and is on the way!");
        order.setEstimatedDelivery(LocalDateTime.now().plusMinutes(15));
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        smsService.send(order.getCustomerPhone(), String.format(
            "Hi %s! 🛵 Your Flamehaus order #%d has been picked up by %s and is on the way! ETA ~15 min.",
            order.getCustomerName(), order.getId(), a.getPartner().getName()
        ));

        return assignmentRepo.save(a);
    }

    public DeliveryAssignment markDelivered(Long assignmentId, Long partnerId, String otp) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"PICKED_UP".equals(a.getStatus()))
            throw new RuntimeException("Must be picked up first");
        if (!otp.equals(a.getDeliveryOtp()))
            throw new RuntimeException("Incorrect delivery OTP");

        a.setStatus("DELIVERED");
        a.setDeliveredAt(LocalDateTime.now());

        // Advance order to Delivered
        Order order = a.getOrder();
        order.setStatus("Delivered");
        order.setTrackingNote("Order delivered successfully! Enjoy your meal 🎉");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        // Update partner stats
        DeliveryPartner partner = a.getPartner();
        partner.setAvailability("ONLINE"); // back to available
        partner.setTotalDeliveries(partner.getTotalDeliveries() + 1);
        partnerRepo.save(partner);

        // SMS customer
        smsService.send(order.getCustomerPhone(), String.format(
            "Hi %s! ✅ Your Flamehaus order #%d has been delivered. Enjoy! " +
            "Please rate your experience: flamehaus.in/orders/%d",
            order.getCustomerName(), order.getId(), order.getId()
        ));

        // SMS partner
        smsService.send(partner.getPhone(), String.format(
            "✅ Delivery #%d completed! Great job, %s. " +
            "Total deliveries today. Check the app for your next assignment.",
            order.getId(), partner.getName()
        ));

        return assignmentRepo.save(a);
    }

    // ── Ratings ───────────────────────────────────────────────────────────────

    /** Customer rates the delivery partner */
    public DeliveryAssignment rateDelivery(Long assignmentId, DeliveryRatingRequest req) {
        DeliveryAssignment a = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!"DELIVERED".equals(a.getStatus()))
            throw new RuntimeException("Can only rate a delivered assignment");
        if (a.getPartnerRating() != null)
            throw new RuntimeException("Already rated this delivery partner");

        a.setPartnerRating(req.getRating());
        a.setRatingComment(req.getComment());
        a.setRatedAt(LocalDateTime.now());
        assignmentRepo.save(a);

        // Update partner aggregate rating
        DeliveryPartner partner = a.getPartner();
        int    total    = partner.getTotalRatings() + 1;
        double newRating = ((partner.getRating() * partner.getTotalRatings()) + req.getRating()) / total;
        partner.setRating(Math.round(newRating * 10.0) / 10.0);
        partner.setTotalRatings(total);
        partnerRepo.save(partner);

        return a;
    }

    /** Delivery partner rates the order/customer experience */
    public DeliveryAssignment rateOrderExperience(Long assignmentId, Long partnerId,
                                                   int rating, String comment) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"DELIVERED".equals(a.getStatus()))
            throw new RuntimeException("Can only rate after delivery is completed");
        if (a.getPartnerOrderRating() != null)
            throw new RuntimeException("Already rated this delivery");
        if (rating < 1 || rating > 5)
            throw new RuntimeException("Rating must be between 1 and 5");

        a.setPartnerOrderRating(rating);
        a.setPartnerOrderComment(comment);
        a.setPartnerRatedAt(LocalDateTime.now());
        return assignmentRepo.save(a);
    }

    // ── Admin: assignment management ──────────────────────────────────────────

    public List<DeliveryAssignment> getAllAssignments() {
        return assignmentRepo.findAll();
    }

    public Optional<DeliveryAssignment> getAssignmentByOrderId(Long orderId) {
        return assignmentRepo.findByOrderId(orderId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private DeliveryPartner getPartnerById(Long id) {
        return partnerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found: " + id));
    }
}
