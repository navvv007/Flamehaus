package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

public class AdminUserRequest {

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    // Plain String: "SUPERADMIN" or "STAFF"
    private String role = "STAFF";

    private String displayName;
    private String phone;

    public String getUsername()              { return username; }
    public void   setUsername(String u)      { this.username = u; }

    public String getPassword()              { return password; }
    public void   setPassword(String p)      { this.password = p; }

    public String getRole()                  { return role; }
    public void   setRole(String r)          { this.role = r; }

    public String getDisplayName()           { return displayName; }
    public void   setDisplayName(String d)   { this.displayName = d; }

    public String getPhone()                 { return phone; }
    public void   setPhone(String p)         { this.phone = p; }
}
