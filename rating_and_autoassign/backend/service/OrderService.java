package com.flamehaus.api.service;

import com.flamehaus.api.dto.DashboardStats;
import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.repository.MenuItemRepository;
import com.flamehaus.api.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {

    private static final Map<String, String> NEXT_STATUS = Map.of(
        "Pending",    "Preparing",
        "Preparing",  "On the Way",
        "On the Way", "Delivered"
    );
    private static final Map<String, String> STATUS_NOTES = Map.of(
        "Pending",    "We received your order and it's queued for the kitchen.",
        "Preparing",  "Your order is being freshly prepared by our chefs.",
        "On the Way", "Your order has left the kitchen and is on its way to you!",
        "Delivered",  "Order delivered. Enjoy your meal!"
    );
    private static final Map<String, Integer> ETA_MINS = Map.of(
        "Pending", 35, "Preparing", 25, "On the Way", 12, "Delivered", 0
    );
    private static final DateTimeFormatter ETA_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    private final OrderRepository    orderRepo;
    private final MenuItemRepository menuRepo;
    private final CustomerRepository customerRepo;
    private final SmsService         smsService;
    private final DeliveryService    deliveryService;

    public OrderService(OrderRepository orderRepo,
                        MenuItemRepository menuRepo,
                        CustomerRepository customerRepo,
                        SmsService smsService,
                        DeliveryService deliveryService) {
        this.orderRepo       = orderRepo;
        this.menuRepo        = menuRepo;
        this.customerRepo    = customerRepo;
        this.smsService      = smsService;
        this.deliveryService = deliveryService;
    }

    public Order placeOrder(OrderRequest req, String customerEmail) {
        Order order = new Order();
        order.setCustomerName(req.getCustomerName());
        order.setCustomerPhone(req.getCustomerPhone());
        order.setDeliveryAddress(req.getDeliveryAddress());
        order.setTotal(req.getTotal());
        order.setItemsSummary(req.getItemsSummary());
        order.setStatus("Pending");
        order.setTrackingNote(STATUS_NOTES.get("Pending"));
        order.setEstimatedDelivery(LocalDateTime.now().plusMinutes(ETA_MINS.get("Pending")));
        order.setUpdatedAt(LocalDateTime.now());
        if (req.getDeliveryLat() != null) order.setDeliveryLat(req.getDeliveryLat());
        if (req.getDeliveryLng() != null) order.setDeliveryLng(req.getDeliveryLng());
        if (customerEmail != null) {
            customerRepo.findByEmail(customerEmail).ifPresent(order::setCustomer);
        }
        Order saved = orderRepo.save(order);
        smsService.sendOrderPlaced(saved.getCustomerPhone(), saved.getId(),
                                    saved.getCustomerName(), saved.getTotal() * 84);
        return saved;
    }

    public List<Order> getAll() { return orderRepo.findAllByOrderByCreatedAtDesc(); }

    public Order getById(Long id) {
        return orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
    }

    public List<Order> getByCustomerId(Long customerId) {
        return orderRepo.findByCustomerId(customerId);
    }

    public Order getByIdForCustomer(Long id, Long customerId) {
        Order order = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        if (order.getCustomer() != null && !order.getCustomer().getId().equals(customerId))
            throw new RuntimeException("Access denied");
        return order;
    }

    public Order advanceStatus(Long id) {
        Order order = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));

        String next = NEXT_STATUS.get(order.getStatus());
        if (next == null) throw new RuntimeException("Order already delivered");

        order.setStatus(next);
        order.setTrackingNote(STATUS_NOTES.get(next));
        order.setUpdatedAt(LocalDateTime.now());

        int etaMins = ETA_MINS.getOrDefault(next, 0);
        LocalDateTime eta = etaMins > 0
            ? LocalDateTime.now().plusMinutes(etaMins)
            : LocalDateTime.now();
        order.setEstimatedDelivery(eta);

        Order saved = orderRepo.save(order);

        // AUTO-ASSIGN: when status advances to "Preparing", find nearest delivery partner
        if ("Preparing".equals(next)) {
            try {
                var assignment = deliveryService.autoAssign(saved.getId());
                if (assignment.isPresent()) {
                    System.out.println("[AUTO-ASSIGN] Order #" + saved.getId()
                        + " assigned to partner #" + assignment.get().getPartner().getId());
                } else {
                    System.out.println("[AUTO-ASSIGN] No available partner for order #" + saved.getId());
                }
            } catch (Exception e) {
                System.err.println("[AUTO-ASSIGN] Failed for order #" + saved.getId() + ": " + e.getMessage());
            }
        }

        String etaStr = etaMins > 0 ? eta.format(ETA_FMT) : "now";
        smsService.sendOrderStatusUpdate(saved.getCustomerPhone(), saved.getId(),
                                          saved.getCustomerName(), next, etaStr);
        return saved;
    }

    public DashboardStats getStats() {
        long total   = orderRepo.count();
        long menu    = menuRepo.count();
        long pending = orderRepo.countByStatus("Pending");
        Double rev   = orderRepo.sumTotalRevenue();
        return new DashboardStats(total, menu, pending, rev != null ? rev : 0.0);
    }
}
