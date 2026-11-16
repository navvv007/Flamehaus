package com.flamehaus.api.service;

import com.flamehaus.api.dto.DashboardStats;
import com.flamehaus.api.dto.OrderRequest;
import com.flamehaus.api.entity.Order;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.repository.MenuItemRepository;
import com.flamehaus.api.repository.OrderRepository;
import org.springframework.context.annotation.Lazy;
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
        "Pending",    "We received your order and it is queued for the kitchen.",
        "Preparing",  "Your order is being freshly prepared by our chefs.",
        "On the Way", "Your order has left the kitchen and is on its way!",
        "Delivered",  "Order delivered. Enjoy your meal!"
    );
    private static final Map<String, Integer> STATUS_ETA = Map.of(
        "Pending",    35,
        "Preparing",  25,
        "On the Way", 12,
        "Delivered",  0
    );
    private static final DateTimeFormatter ETA_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    private final OrderRepository    orderRepo;
    private final MenuItemRepository menuRepo;
    private final CustomerRepository customerRepo;
    private final SmsService         smsService;

    // @Lazy breaks the circular dependency: OrderService → DeliveryService → OrderRepository → OrderService
    private final DeliveryService deliveryService;

    public OrderService(OrderRepository orderRepo,
                        MenuItemRepository menuRepo,
                        CustomerRepository customerRepo,
                        SmsService smsService,
                        @Lazy DeliveryService deliveryService) {
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
        order.setEstimatedDelivery(LocalDateTime.now().plusMinutes(STATUS_ETA.get("Pending")));
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

    public Order advanceStatus(Long id) {
        Order order = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));

        String next = NEXT_STATUS.get(order.getStatus());
        if (next == null) throw new RuntimeException("Order already delivered");

        order.setStatus(next);
        order.setTrackingNote(STATUS_NOTES.get(next));
        order.setUpdatedAt(LocalDateTime.now());

        int etaMins = STATUS_ETA.getOrDefault(next, 0);
        LocalDateTime eta = etaMins > 0
            ? LocalDateTime.now().plusMinutes(etaMins)
            : LocalDateTime.now();
        order.setEstimatedDelivery(eta);

        Order saved = orderRepo.save(order);

        // ── Auto-assign delivery partner when order enters "Preparing" ──────
        // Only assign if an ONLINE partner is available — otherwise skipped silently.
        if ("Preparing".equals(next)) {
            try {
                deliveryService.autoAssign(saved.getId()).ifPresent(a ->
                    System.out.println("[AUTO-ASSIGN] Order #" + saved.getId() +
                        " assigned to " + a.getPartner().getName()));
            } catch (Exception e) {
                // Auto-assign failure must not break order status update
                System.err.println("[AUTO-ASSIGN] Failed for order #" + saved.getId() + ": " + e.getMessage());
            }
        }

        // SMS to customer
        String etaStr = etaMins > 0 ? eta.format(ETA_FMT) : "now";
        smsService.sendOrderStatusUpdate(saved.getCustomerPhone(), saved.getId(),
            saved.getCustomerName(), next, etaStr);

        return saved;
    }

    public List<Order> getAll()          { return orderRepo.findAllByOrderByCreatedAtDesc(); }
    public Order       getById(Long id)  { return orderRepo.findById(id).orElseThrow(() -> new RuntimeException("Order not found: " + id)); }

    public List<Order> getByCustomerId(Long customerId) {
        return orderRepo.findByCustomerId(customerId);
    }

    public Order getByIdForCustomer(Long id, Long customerId) {
        Order order = getById(id);
        if (order.getCustomer() != null && !order.getCustomer().getId().equals(customerId))
            throw new RuntimeException("Access denied");
        return order;
    }

    public DashboardStats getStats() {
        long totalOrders = orderRepo.count();
        long menuItems   = menuRepo.count();
        long pending     = orderRepo.countByStatus("Pending");
        Double revenue   = orderRepo.sumTotalRevenue();
        return new DashboardStats(totalOrders, menuItems, pending, revenue != null ? revenue : 0.0);
    }
}
