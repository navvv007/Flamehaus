package com.flamehaus.api.dto;

public class LoginResponse {
    private String token;
    private String username;
    private String role;
    private String displayName;

    public LoginResponse(String token, String username, String role) {
        this.token       = token;
        this.username    = username;
        this.role        = role;
        this.displayName = username; // fallback
    }

    public LoginResponse(String token, String username, String role, String displayName) {
        this.token       = token;
        this.username    = username;
        this.role        = role;
        this.displayName = displayName != null ? displayName : username;
    }

    public String getToken()       { return token; }
    public String getUsername()    { return username; }
    public String getRole()        { return role; }
    public String getDisplayName() { return displayName; }
}
