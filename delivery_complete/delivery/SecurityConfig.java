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

                // ── ALWAYS permit OPTIONS preflight (CORS) ────────────────
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ── Admin auth — public ───────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/otp/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/reset-password").permitAll()

                // ── Customer auth — public ────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/otp/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/forgot-password/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/forgot-password/reset").permitAll()

                // ── Delivery auth — public ────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/otp/send").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/otp/verify").permitAll()

                // ── Public menu + orders ──────────────────────────────────
                .requestMatchers(HttpMethod.GET,  "/api/menu/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/orders").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/orders/*/track").permitAll()

                // ── Authenticated logouts ─────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/auth/logout").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/customer/auth/logout").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/delivery/auth/logout").authenticated()

                // ── Customer (CUSTOMER role) ──────────────────────────────
                .requestMatchers("/api/customer/**").hasRole("CUSTOMER")

                // ── Delivery partner (DELIVERY role) ──────────────────────
                .requestMatchers("/api/delivery/partner/**").hasRole("DELIVERY")

                // ── Delivery rating (customer or admin) ───────────────────
                .requestMatchers(HttpMethod.POST, "/api/delivery/rate/**")
                    .hasAnyRole("CUSTOMER", "ADMIN")

                // ── Admin delivery management ─────────────────────────────
                .requestMatchers("/api/delivery/admin/**").hasRole("ADMIN")

                // ── Admin — any ADMIN role ────────────────────────────────
                .requestMatchers(HttpMethod.GET,   "/api/admin/orders/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/admin/orders/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/admin/menu/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/admin/dashboard/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/admin/ratings/**").hasRole("ADMIN")

                // ── Admin — SUPERADMIN only ───────────────────────────────
                .requestMatchers("/api/admin/users/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/admin/menu/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.PATCH,  "/api/admin/menu/**").hasRole("SUPERADMIN")

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
        config.setMaxAge(3600L); // cache preflight for 1 hour
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
