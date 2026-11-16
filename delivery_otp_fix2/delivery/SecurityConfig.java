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

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins}")
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

                // ── 1. Always permit CORS preflight ──────────────────────
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ── 2. Admin auth — public ────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/otp/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/reset-password").permitAll()

                // ── 3. Customer auth — public ─────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/otp/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/forgot-password/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/forgot-password/reset").permitAll()

                // ── 4. Delivery auth — public ─────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/otp/verify").permitAll()

                // ── 5. Public menu + order tracking ───────────────────────
                .requestMatchers(HttpMethod.GET,  "/api/menu/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/orders").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/orders/*/track").permitAll()

                // ── 6. Authenticated logouts ──────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/auth/logout").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/logout").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/logout").authenticated()

                // ── 7. Customer role ──────────────────────────────────────
                .requestMatchers("/api/customer/**").hasRole("CUSTOMER")

                // ── 8. Delivery partner role ──────────────────────────────
                .requestMatchers("/api/delivery/partner/**").hasRole("DELIVERY")

                // ── 9. Delivery rating (customer or admin) ────────────────
                .requestMatchers(HttpMethod.POST, "/api/delivery/rate/**")
                    .hasAnyRole("CUSTOMER", "ADMIN")

                // ── 10. Admin delivery management ─────────────────────────
                .requestMatchers("/api/delivery/admin/**").hasRole("ADMIN")

                // ── 11. Admin — any ADMIN role ────────────────────────────
                .requestMatchers(HttpMethod.GET,   "/api/admin/orders/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/admin/orders/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/admin/menu/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/admin/dashboard/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/admin/ratings/**").hasRole("ADMIN")

                // ── 12. SUPERADMIN only ───────────────────────────────────
                .requestMatchers("/api/admin/users/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PATCH,  "/api/admin/menu/**").hasRole("SUPERADMIN")

                // ── 13. Everything else needs authentication ───────────────
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
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
