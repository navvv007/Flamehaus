package com.flamehaus.api.controller;

import com.flamehaus.api.service.OrderTimeoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * TEST ONLY — remove before production.
 * Lets you manually trigger timeout for any order.
 */
@RestController
@RequestMapping("/api/admin/test")
public class TimeoutTestController {

    private final OrderTimeoutService timeoutService;

    public TimeoutTestController(OrderTimeoutService timeoutService) {
        this.timeoutService = timeoutService;
    }

    /** Manually trigger auto-cancel for a specific order (for testing) */
    @PostMapping("/timeout/{orderId}")
    public ResponseEntity<?> triggerTimeout(@PathVariable Long orderId) {
        String result = timeoutService.manualTimeoutCheck(orderId);
        return ResponseEntity.ok(Map.of("result", result));
    }

    /** Trigger the scheduler manually — processes ALL timed-out orders now */
    @PostMapping("/timeout/run-all")
    public ResponseEntity<?> runAll() {
        timeoutService.checkTimeouts();
        return ResponseEntity.ok(Map.of("result", "Timeout check completed — see backend logs"));
    }
}
