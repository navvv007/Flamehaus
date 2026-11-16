package com.flamehaus.api.dto;

public class CustomerResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String token;

    public CustomerResponse(Long id, String name, String email, String phone, String token) {
        this.id = id; this.name = name; this.email = email;
        this.phone = phone; this.token = token;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getToken() { return token; }
}
