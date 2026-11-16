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

    // ── Auto-assign ───────────────────────────────────────────────────────────

    public Optional<DeliveryAssignment> autoAssign(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        // Skip if already has an active assignment
        if (assignmentRepo.existsByOrderIdAndStatusIn(orderId,
                List.of("ASSIGNED", "ACCEPTED", "PICKED_UP"))) {
            System.out.println("[AUTO-ASSIGN] Order #" + orderId + " already assigned");
            return Optional.empty();
        }

        List<Long> excluded = assignmentRepo.findRejectedPartnerIdsByOrderId(orderId);
        if (excluded.isEmpty()) excluded = List.of(-1L);

        long rejections = assignmentRepo.countRejectedByOrderId(orderId);
        if (rejections >= MAX_REASSIGN) {
            System.out.println("[AUTO-ASSIGN] Order #" + orderId + " max rejections reached");
            return Optional.empty();
        }

        Optional<DeliveryPartner> partner =
            order.getDeliveryLat() != null && order.getDeliveryLng() != null
                ? partnerRepo.findNearestOnlinePartner(17.4326, 78.4071, excluded)
                : partnerRepo.findLeastBusyOnlinePartner(excluded);

        if (partner.isEmpty()) {
            System.out.println("[AUTO-ASSIGN] No ONLINE partner for order #" + orderId);
            return Optional.empty();
        }

        return Optional.of(createAssignment(order, partner.get(), (int) rejections));
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

        partner.setAvailability("BUSY");
        partnerRepo.save(partner);

        smsService.send(partner.getPhone(),
            "New delivery! Order #" + order.getId() +
            " | " + order.getCustomerName() + " | " + order.getDeliveryAddress() +
            " | OTP: " + otp);
        smsService.send(order.getCustomerPhone(),
            "Hi " + order.getCustomerName() + "! " + partner.getName() +
            " is your delivery partner for order #" + order.getId() +
            ". OTP: " + otp + " (share only on arrival).");
        return saved;
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
     * FIX: allows rejection of both ASSIGNED and ACCEPTED status.
     * Immediately auto-reassigns to next available ONLINE partner.
     */
    public DeliveryAssignment rejectOrder(Long assignmentId, Long partnerId, String reason) {
        DeliveryAssignment a = getAssignmentForPartner(assignmentId, partnerId);

        // FIX: allow rejection of ASSIGNED or ACCEPTED — not just ASSIGNED
        if (!List.of("ASSIGNED", "ACCEPTED").contains(a.getStatus())) {
            throw new RuntimeException(
                "Cannot reject order in status: " + a.getStatus() +
                ". Can only reject ASSIGNED or ACCEPTED orders.");
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
