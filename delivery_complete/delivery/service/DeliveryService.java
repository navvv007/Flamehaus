package com.flamehaus.api.service;

import com.flamehaus.api.dto.*;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DeliveryService {

    private final DeliveryPartnerRepository    partnerRepo;
    private final DeliveryAssignmentRepository assignmentRepo;
    private final OrderRepository              orderRepo;
    private final PasswordEncoder              encoder;
    private final JwtUtil                      jwtUtil;
    private final SmsService                   smsService;

    public DeliveryService(DeliveryPartnerRepository partnerRepo,
                           DeliveryAssignmentRepository assignmentRepo,
                           OrderRepository orderRepo,
                           PasswordEncoder encoder,
                           JwtUtil jwtUtil,
                           SmsService smsService) {
        this.partnerRepo    = partnerRepo;
        this.assignmentRepo = assignmentRepo;
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
        p.setVehicleNumber(req.getVehicleNumber());
        p.setVehicleType(req.getVehicleType() != null ? req.getVehicleType() : "Bike");
        p.setStatus("PENDING");
        p.setAvailability("OFFLINE");
        DeliveryPartner saved = partnerRepo.save(p);

        // SMS to partner confirming registration
        smsService.send(saved.getPhone(),
            "Welcome to Flamehaus Delivery! Your registration is under review. " +
            "You'll be notified once approved. Team Flamehaus.");
        return saved;
    }

    public Map<String, Object> login(String email, String password) {
        DeliveryPartner p = partnerRepo.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        if (!encoder.matches(password, p.getPassword()))
            throw new RuntimeException("Invalid email or password");
        if ("PENDING".equals(p.getStatus()))
            throw new RuntimeException("Your account is pending admin approval");
        if ("REJECTED".equals(p.getStatus()))
            throw new RuntimeException("Your registration was rejected. Contact support.");
        if ("INACTIVE".equals(p.getStatus()))
            throw new RuntimeException("Your account has been deactivated");

        String token = jwtUtil.generateDeliveryToken(p.getEmail(), p.getId());
        return Map.of(
            "token",  token,
            "id",     p.getId(),
            "name",   p.getName(),
            "email",  p.getEmail(),
            "phone",  p.getPhone(),
            "status", p.getStatus(),
            "availability", p.getAvailability(),
            "rating", p.getRating(),
            "totalDeliveries", p.getTotalDeliveries()
        );
    }

    // ── Admin: partner management ─────────────────────────────────────────────

    public List<DeliveryPartner> getAllPartners() {
        return partnerRepo.findAll();
    }

    public List<DeliveryPartner> getPendingPartners() {
        return partnerRepo.findByStatus("PENDING");
    }

    public DeliveryPartner approvePartner(Long id) {
        DeliveryPartner p = partnerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
        p.setStatus("ACTIVE");
        p.setApprovedAt(LocalDateTime.now());
        DeliveryPartner saved = partnerRepo.save(p);
        smsService.send(saved.getPhone(),
            "Great news " + saved.getName() + "! Your Flamehaus delivery account is approved. " +
            "Login at flamehaus.in/delivery to start accepting orders.");
        return saved;
    }

    public DeliveryPartner rejectPartner(Long id) {
        DeliveryPartner p = partnerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
        p.setStatus("REJECTED");
        partnerRepo.save(p);
        smsService.send(p.getPhone(),
            "Your Flamehaus delivery registration was not approved. " +
            "Contact support@flamehaus.in for more information.");
        return p;
    }

    public DeliveryPartner togglePartnerActive(Long id) {
        DeliveryPartner p = partnerRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
        p.setStatus("ACTIVE".equals(p.getStatus()) ? "INACTIVE" : "ACTIVE");
        return partnerRepo.save(p);
    }

    // ── Auto-assign ───────────────────────────────────────────────────────────

    /**
     * Auto-assign the order to the nearest available delivery partner.
     * Called after order status advances to "On the Way".
     * Falls back to least-busy partner if GPS unavailable.
     */
    public Optional<DeliveryAssignment> autoAssign(Long orderId) {
        if (assignmentRepo.existsByOrderId(orderId)) return Optional.empty(); // already assigned

        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        Optional<DeliveryPartner> partnerOpt;

        // Try nearest if order has GPS coords
        if (order.getDeliveryLat() != null && order.getDeliveryLng() != null) {
            partnerOpt = partnerRepo.findNearestAvailable(
                order.getDeliveryLat(), order.getDeliveryLng());
        } else {
            partnerOpt = partnerRepo.findAvailableByLeastBusy().stream().findFirst();
        }

        if (partnerOpt.isEmpty()) return Optional.empty(); // no partner available

        DeliveryPartner partner = partnerOpt.get();
        partner.setAvailability("BUSY");
        partnerRepo.save(partner);

        DeliveryAssignment assignment = new DeliveryAssignment();
        assignment.setOrder(order);
        assignment.setPartner(partner);
        assignment.setStatus("ASSIGNED");
        assignment.setDeliveryOtp(generateOtp());
        DeliveryAssignment saved = assignmentRepo.save(assignment);

        // SMS partner with pickup details
        smsService.send(partner.getPhone(),
            String.format("New order #%d assigned! Pickup from Flamehaus Kitchen, Jubilee Hills. " +
                "Customer: %s. Delivery OTP: %s. Login to confirm.",
                order.getId(), order.getCustomerName(), saved.getDeliveryOtp()));

        // SMS customer with partner info
        smsService.send(order.getCustomerPhone(),
            String.format("Your Flamehaus order #%d is being picked up by %s (%s). " +
                "Delivery OTP: %s — share this with the partner on arrival.",
                order.getId(), partner.getName(), partner.getPhone(), saved.getDeliveryOtp()));

        return Optional.of(saved);
    }

    // ── Partner: update own status ────────────────────────────────────────────

    public DeliveryPartner updateAvailability(Long partnerId, String availability) {
        DeliveryPartner p = partnerRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
        if (!"BUSY".equals(p.getAvailability())) { // don't let partner go OFFLINE mid-delivery
            p.setAvailability(availability);
            partnerRepo.save(p);
        }
        return p;
    }

    public DeliveryPartner updateLocation(Long partnerId, Double lat, Double lng) {
        DeliveryPartner p = partnerRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Partner not found"));
        p.setCurrentLat(lat);
        p.setCurrentLng(lng);
        return partnerRepo.save(p);
    }

    // ── Partner: assignment actions ───────────────────────────────────────────

    public DeliveryAssignment acceptOrder(Long assignmentId, Long partnerId) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ASSIGNED".equals(a.getStatus()))
            throw new RuntimeException("Order is not in ASSIGNED state");
        a.setStatus("ACCEPTED");
        a.setAcceptedAt(LocalDateTime.now());
        return assignmentRepo.save(a);
    }

    public DeliveryAssignment markPickedUp(Long assignmentId, Long partnerId,
                                            Double lat, Double lng) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"ACCEPTED".equals(a.getStatus()))
            throw new RuntimeException("Order must be ACCEPTED before pickup");
        a.setStatus("PICKED_UP");
        a.setPickedUpAt(LocalDateTime.now());
        a.setPickupLat(lat);
        a.setPickupLng(lng);

        // Advance main order status to "On the Way"
        Order order = a.getOrder();
        order.setStatus("On the Way");
        order.setTrackingNote("Your order has been picked up and is on the way!");
        order.setUpdatedAt(LocalDateTime.now());
        order.setEstimatedDelivery(LocalDateTime.now().plusMinutes(15));
        orderRepo.save(order);

        smsService.send(order.getCustomerPhone(),
            String.format("Order #%d has been picked up! Your delivery partner %s is on the way. ETA ~15 min.",
                order.getId(), a.getPartner().getName()));

        return assignmentRepo.save(a);
    }

    public DeliveryAssignment markDelivered(Long assignmentId, Long partnerId, String otp) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);
        if (!"PICKED_UP".equals(a.getStatus()))
            throw new RuntimeException("Order must be PICKED_UP before marking delivered");
        if (!otp.equals(a.getDeliveryOtp()))
            throw new RuntimeException("Invalid delivery OTP");

        a.setStatus("DELIVERED");
        a.setDeliveredAt(LocalDateTime.now());

        // Advance main order status to "Delivered"
        Order order = a.getOrder();
        order.setStatus("Delivered");
        order.setTrackingNote("Order delivered! Enjoy your meal 🔥");
        order.setUpdatedAt(LocalDateTime.now());
        order.setEstimatedDelivery(LocalDateTime.now());
        orderRepo.save(order);

        // Update partner stats and free them up
        DeliveryPartner partner = a.getPartner();
        partner.setAvailability("ONLINE");
        partner.setTotalDeliveries(partner.getTotalDeliveries() + 1);
        partnerRepo.save(partner);

        smsService.send(order.getCustomerPhone(),
            String.format("Order #%d delivered! Rate your experience: flamehaus.in/orders/%d",
                order.getId(), order.getId()));

        return assignmentRepo.save(a);
    }

    public List<DeliveryAssignment> getPartnerAssignments(Long partnerId) {
        return assignmentRepo.findByPartnerIdOrderByAssignedAtDesc(partnerId);
    }

    // ── Rating ────────────────────────────────────────────────────────────────

    public DeliveryAssignment rateDelivery(Long assignmentId, DeliveryRatingRequest req) {
        DeliveryAssignment a = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!"DELIVERED".equals(a.getStatus()))
            throw new RuntimeException("Can only rate a delivered order");
        if (a.getPartnerRating() != null)
            throw new RuntimeException("Already rated");

        a.setPartnerRating(req.getRating());
        a.setRatingComment(req.getComment());
        a.setRatedAt(LocalDateTime.now());
        assignmentRepo.save(a);

        // Update partner aggregate rating
        DeliveryPartner partner = a.getPartner();
        int totalRatings = partner.getTotalRatings() + 1;
        double newRating = ((partner.getRating() * partner.getTotalRatings()) + req.getRating()) / totalRatings;
        partner.setRating(Math.round(newRating * 10.0) / 10.0);
        partner.setTotalRatings(totalRatings);
        partnerRepo.save(partner);

        return a;
    }

    public Optional<DeliveryAssignment> getAssignmentByOrderId(Long orderId) {
        return assignmentRepo.findByOrderId(orderId);
    }

    // ── Util ──────────────────────────────────────────────────────────────────

    private DeliveryAssignment getAssignmentForPartner(Long assignmentId, Long partnerId) {
        DeliveryAssignment a = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (!a.getPartner().getId().equals(partnerId))
            throw new RuntimeException("Access denied");
        return a;
    }

    private String generateOtp() {
        return String.format("%04d", new SecureRandom().nextInt(10000));
    }

    public Optional<DeliveryPartner> findByPhone(String phone) {
        return partnerRepo.findByPhone(phone);
    }

    public Map<String, Object> buildLoginResponse(DeliveryPartner p, String token) {
        return Map.of(
            "token",           token,
            "id",              p.getId(),
            "name",            p.getName(),
            "email",           p.getEmail(),
            "phone",           p.getPhone(),
            "status",          p.getStatus(),
            "availability",    p.getAvailability(),
            "rating",          p.getRating() != null ? p.getRating() : 0.0,
            "totalDeliveries", p.getTotalDeliveries() != null ? p.getTotalDeliveries() : 0
        );
    }

}