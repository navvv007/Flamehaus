package com.flamehaus.api.config;

import com.flamehaus.api.entity.AdminUser;
import com.flamehaus.api.entity.MenuItem;
import com.flamehaus.api.repository.AdminUserRepository;
import com.flamehaus.api.repository.MenuItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedData(AdminUserRepository adminRepo,
                                      MenuItemRepository menuRepo,
                                      PasswordEncoder encoder) {
        return args -> {

            // FIX: role is a plain String — no AdminUser.Role enum reference
            if (!adminRepo.existsByUsername("admin")) {
                AdminUser admin = new AdminUser("admin", encoder.encode("admin123"), "SUPERADMIN");
                admin.setDisplayName("Super Admin");
                admin.setActive(true);
                adminRepo.save(admin);
                System.out.println("✅ Default admin created: admin / admin123");
            }

            if (!adminRepo.existsByUsername("staff")) {
                AdminUser staff = new AdminUser("staff", encoder.encode("staff123"), "STAFF");
                staff.setDisplayName("Kitchen Staff");
                staff.setActive(true);
                adminRepo.save(staff);
                System.out.println("✅ Default staff created: staff / staff123");
            }

            if (menuRepo.count() == 0) {
                Object[][] items = {
                    {"Classic Smash Burger",  "Burgers",  12.99, "Double smash patty, aged cheddar, caramelised onions, secret sauce", "🍔", "Best Seller", 4.8, 320, "12 min"},
                    {"BBQ Bacon Stack",        "Burgers",  14.99, "Triple stack, crispy bacon, BBQ glaze, jalapeños, coleslaw",          "🥓", "Spicy",       4.7, 210, "15 min"},
                    {"Margherita Royale",      "Pizza",    13.99, "San Marzano tomatoes, buffalo mozzarella, fresh basil, EVOO",         "🍕", "Chef's Pick", 4.9, 480, "18 min"},
                    {"Truffle Mushroom Pizza", "Pizza",    17.99, "Black truffle oil, wild mushrooms, fontina, thyme",                    "🍄", "Premium",     4.8, 195, "20 min"},
                    {"Dragon Roll",            "Sushi",    18.99, "Shrimp tempura, cucumber, avocado, spicy mayo, tobiko",               "🍣", "Fan Fav",     4.9, 267, "20 min"},
                    {"Rainbow Platter",        "Sushi",    24.99, "8-piece assorted nigiri with chef's seasonal selection",              "🐟", "Premium",     4.8, 189, "25 min"},
                    {"Carbonara Classica",     "Pasta",    15.99, "Guanciale, pecorino romano, egg yolk, black pepper",                  "🍝", "Best Seller", 4.7, 312, "16 min"},
                    {"Lobster Linguine",       "Pasta",    28.99, "Fresh lobster, cherry tomatoes, garlic, white wine, parsley",         "🦞", "Premium",     4.9, 145, "25 min"},
                    {"Mediterranean Bowl",     "Salads",   11.99, "Quinoa, falafel, hummus, roasted veg, lemon tahini dressing",         "🥗", "Vegan",       4.6, 230, "10 min"},
                    {"Tiramisu",               "Desserts",  7.99, "Savoiardi, mascarpone cream, espresso, cocoa dusting",               "🍰", "Best Seller", 4.9, 410,  "5 min"},
                    {"Mango Lassi",            "Drinks",    5.99, "Fresh Alphonso mango, yoghurt, cardamom, rose water",                 "🥭", "Refreshing",  4.7, 290,  "5 min"},
                    {"Fish Tacos",             "Tacos",    13.99, "Battered cod, mango salsa, chipotle crema, pickled cabbage",          "🌮", "New",         4.7, 178, "14 min"},
                };
                for (Object[] row : items) {
                    MenuItem m = new MenuItem();
                    m.setName((String) row[0]);
                    m.setCategory((String) row[1]);
                    m.setPrice((Double) row[2]);
                    m.setDescription((String) row[3]);
                    m.setImage((String) row[4]);
                    m.setBadge((String) row[5]);
                    m.setRating((Double) row[6]);
                    m.setReviews((Integer) row[7]);
                    m.setPrepTime((String) row[8]);
                    m.setAvailable(true);
                    menuRepo.save(m);
                }
                System.out.println("✅ Menu seeded with " + items.length + " items");
            }
        };
    }
}
