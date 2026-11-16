package com.flamehaus.api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    // FIX: field named 'used' with isUsed() / setUsed() — matches AuthService calls
    @Column(nullable = false)
    private boolean used = false;

    public Long          getId()                    { return id; }
    public void          setId(Long id)             { this.id = id; }

    public String        getToken()                 { return token; }
    public void          setToken(String token)     { this.token = token; }

    public String        getUsername()              { return username; }
    public void          setUsername(String u)      { this.username = u; }

    public LocalDateTime getExpiresAt()             { return expiresAt; }
    public void          setExpiresAt(LocalDateTime e) { this.expiresAt = e; }

    public boolean       isUsed()                   { return used; }
    public void          setUsed(boolean used)      { this.used = used; }
}
