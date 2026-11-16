package com.flamehaus.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "admin_users")
public class AdminUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false)
    private String password;

    // FIX: store role as plain VARCHAR string — avoids enum/String conversion errors
    // Values: "SUPERADMIN" or "STAFF"
    @Column(nullable = false, length = 50)
    private String role = "STAFF";

    @Column(length = 20)
    private String phone;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(length = 150)
    private String displayName;

    public AdminUser() {}

    public AdminUser(String username, String password, String role) {
        this.username = username;
        this.password = password;
        this.role     = role;
    }

    public Long    getId()          { return id; }
    public void    setId(Long id)   { this.id = id; }

    public String  getUsername()             { return username; }
    public void    setUsername(String u)     { this.username = u; }

    public String  getPassword()             { return password; }
    public void    setPassword(String p)     { this.password = p; }

    // role is a plain String — no enum, no conversion needed
    public String  getRole()                 { return role; }
    public void    setRole(String r)         { this.role = r; }

    public String  getPhone()                { return phone; }
    public void    setPhone(String p)        { this.phone = p; }

    public Boolean getActive()               { return active; }
    public void    setActive(Boolean a)      { this.active = a; }

    public String  getDisplayName()          { return displayName; }
    public void    setDisplayName(String d)  { this.displayName = d; }
}
