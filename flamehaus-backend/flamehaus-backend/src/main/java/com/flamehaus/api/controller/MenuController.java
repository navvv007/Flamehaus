package com.flamehaus.api.controller;

import com.flamehaus.api.dto.MenuItemRequest;
import com.flamehaus.api.entity.MenuItem;
import com.flamehaus.api.service.MenuService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    // ── Public ────────────────────────────────────────────────────────────────

    /** Public menu — only available items */
    @GetMapping("/menu")
    public List<MenuItem> getAvailableMenu() {
        return menuService.getAllAvailable();
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /** Admin — all items including unavailable */
    @GetMapping("/admin/menu")
    public List<MenuItem> getAllMenu() {
        return menuService.getAll();
    }

    @PostMapping("/admin/menu")
    public ResponseEntity<MenuItem> create(@Valid @RequestBody MenuItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(menuService.create(req));
    }

    @PutMapping("/admin/menu/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody MenuItemRequest req) {
        try {
            return ResponseEntity.ok(menuService.update(id, req));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/admin/menu/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            menuService.delete(id);
            return ResponseEntity.ok(Map.of("message", "Deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/admin/menu/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(menuService.toggleAvailability(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
