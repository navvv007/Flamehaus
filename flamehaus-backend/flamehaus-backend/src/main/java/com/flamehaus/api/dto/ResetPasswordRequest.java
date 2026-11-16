package com.flamehaus.api.dto;

import jakarta.validation.constraints.NotBlank;

public class ResetPasswordRequest {

    // FIX: field named 'username' with getUsername() — matches AuthService calls
    @NotBlank
    private String username;

    @NotBlank
    private String token;

    @NotBlank
    private String newPassword;

    public String getUsername()               { return username; }
    public void   setUsername(String u)       { this.username = u; }

    public String getToken()                  { return token; }
    public void   setToken(String t)          { this.token = t; }

    public String getNewPassword()            { return newPassword; }
    public void   setNewPassword(String p)    { this.newPassword = p; }
}
