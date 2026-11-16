package com.flamehaus.api.service;

import com.flamehaus.api.dto.MenuItemRequest;
import com.flamehaus.api.entity.MenuItem;
import com.flamehaus.api.repository.MenuItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MenuService {

    private final MenuItemRepository menuRepo;

    public MenuService(MenuItemRepository menuRepo) {
        this.menuRepo = menuRepo;
    }

    public List<MenuItem> getAllAvailable() {
        return menuRepo.findByAvailableTrue();
    }

    public List<MenuItem> getAll() {
        return menuRepo.findAll();
    }

    public MenuItem create(MenuItemRequest req) {
        MenuItem item = new MenuItem();
        applyRequest(item, req);
        return menuRepo.save(item);
    }

    public MenuItem update(Long id, MenuItemRequest req) {
        MenuItem item = menuRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        applyRequest(item, req);
        return menuRepo.save(item);
    }

    public void delete(Long id) {
        if (!menuRepo.existsById(id)) {
            throw new RuntimeException("Menu item not found: " + id);
        }
        menuRepo.deleteById(id);
    }

    public MenuItem toggleAvailability(Long id) {
        MenuItem item = menuRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        item.setAvailable(!item.getAvailable());
        return menuRepo.save(item);
    }

    private void applyRequest(MenuItem item, MenuItemRequest req) {
        item.setName(req.getName());
        item.setCategory(req.getCategory());
        item.setPrice(req.getPrice());
        if (req.getDescription() != null) item.setDescription(req.getDescription());
        if (req.getImage() != null) item.setImage(req.getImage());
        if (req.getBadge() != null) item.setBadge(req.getBadge());
        if (req.getAvailable() != null) item.setAvailable(req.getAvailable());
        if (req.getPrepTime() != null) item.setPrepTime(req.getPrepTime());
    }
}
