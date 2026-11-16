package com.flamehaus.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (jwtUtil.isValid(token)) {
                String subject = jwtUtil.extractSubject(token);
                String type    = jwtUtil.extractType(token);
                String role    = jwtUtil.extractRole(token);

                // Build granted authority based on token type
                String authority = switch (type != null ? type : "") {
                    case "ADMIN"    -> {
                        String r = role != null ? role : "STAFF";
                        yield "ROLE_" + r;          // ROLE_SUPERADMIN or ROLE_STAFF → maps to ADMIN via hierarchy
                    }
                    case "CUSTOMER" -> "ROLE_CUSTOMER";
                    case "DELIVERY" -> "ROLE_DELIVERY";
                    default         -> "ROLE_USER";
                };

                // For ADMIN tokens, also grant ROLE_ADMIN so hasRole("ADMIN") works
                List<SimpleGrantedAuthority> authorities;
                if ("ADMIN".equals(type)) {
                    authorities = "SUPERADMIN".equals(role)
                        ? List.of(new SimpleGrantedAuthority("ROLE_SUPERADMIN"),
                                  new SimpleGrantedAuthority("ROLE_ADMIN"))
                        : List.of(new SimpleGrantedAuthority("ROLE_STAFF"),
                                  new SimpleGrantedAuthority("ROLE_ADMIN"));
                } else {
                    authorities = List.of(new SimpleGrantedAuthority(authority));
                }

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(subject, token, authorities);

                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
