package com.flamehaus.api.config;

import com.flamehaus.api.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Role model (set by JwtAuthFilter from the token):
 *   admin token    -> ROLE_ADMIN (+ ROLE_SUPERADMIN for super admins)
 *   customer token -> ROLE_CUSTOMER
 *   delivery token -> ROLE_DELIVERY
 *
 * Rules are checked top to bottom; the FIRST match wins, so specific rules come first.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // Falls back to the Vite dev server if the property is not set.
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(c -> c.configurationSource(corsSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // ── 1. CORS preflight + Spring's internal error page ──────────────
                // Without "/error" permitted, any server failure is rewritten to a 403.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/error").permitAll()

                // ── 2. Admin auth - public ────────────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/otp/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/reset-password").permitAll()

                // ── 3. Customer auth - public ─────────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/otp/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/forgot-password/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/forgot-password/reset").permitAll()

                // ── 4. Delivery partner auth - public ─────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/otp/verify").permitAll()

                // ── 5. Coupons - public ───────────────────────────────────────────
                .requestMatchers(HttpMethod.GET,  "/api/coupons/active").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/coupons/validate").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/coupons/apply").permitAll()

                // ── 6. Public menu + placing and tracking an order ────────────────
                .requestMatchers(HttpMethod.GET,  "/api/menu/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/orders").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/orders/*/track").permitAll()

                // ── 7. Logouts need a valid token ─────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/auth/logout").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/logout").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/logout").authenticated()

                // ── 8. Customer area (addresses, orders, ratings, cancel, refund-status, ...) ──
                .requestMatchers("/api/customer/**").hasRole("CUSTOMER")

                // ── 9. Delivery partner area ──────────────────────────────────────
                .requestMatchers("/api/delivery/partner/**").hasRole("DELIVERY")
                .requestMatchers(HttpMethod.POST, "/api/delivery/rate/**").hasAnyRole("CUSTOMER", "ADMIN")
                .requestMatchers("/api/delivery/admin/**").hasRole("ADMIN")

                // ── 10. Admin: SUPER ADMIN only (specific rules BEFORE the general one) ──
                .requestMatchers("/api/admin/users/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PATCH,  "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/admin/coupons").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/admin/coupons/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PATCH,  "/api/admin/coupons/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/admin/coupons/**").hasRole("SUPERADMIN")

                // ── 11. Admin: everything else under /api/admin needs an admin/staff token.
                // (orders, dashboard, ratings, cancellations, delivery SLA, coupon list, menu list, ...)
                // A customer or delivery token can no longer reach any admin endpoint.
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // ── 12. Anything not listed above (e.g. /api/payment/**) needs a valid login ──
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split("\\s*,\\s*")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
