package com.flamehaus.api.service;

import com.flamehaus.api.dto.*;
import com.flamehaus.api.entity.Customer;
import com.flamehaus.api.repository.CustomerRepository;
import com.flamehaus.api.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class CustomerAuthService {

    private final CustomerRepository customerRepo;
    private final PasswordEncoder    encoder;
    private final JwtUtil            jwtUtil;
    private final SmsService         smsService;

    public CustomerAuthService(CustomerRepository customerRepo, PasswordEncoder encoder,
                                JwtUtil jwtUtil, SmsService smsService) {
        this.customerRepo = customerRepo;
        this.encoder      = encoder;
        this.jwtUtil      = jwtUtil;
        this.smsService   = smsService;
    }

    public CustomerResponse register(RegisterRequest req) {
        if (customerRepo.existsByEmail(req.getEmail()))
            throw new RuntimeException("Email already registered");

        Customer c = new Customer();
        c.setName(req.getName());
        c.setEmail(req.getEmail().toLowerCase());
        c.setPassword(encoder.encode(req.getPassword()));
        c.setPhone(req.getPhone());
        Customer saved = customerRepo.save(c);

        // SMS: welcome message
        smsService.sendWelcome(saved.getPhone(), saved.getName());

        String token = jwtUtil.generateCustomerToken(saved.getEmail(), saved.getId());
        return new CustomerResponse(saved.getId(), saved.getName(), saved.getEmail(),
                                     saved.getPhone(), token);
    }

    public CustomerResponse login(CustomerLoginRequest req) {
        Customer c = customerRepo.findByEmail(req.getEmail().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        if (!encoder.matches(req.getPassword(), c.getPassword()))
            throw new RuntimeException("Invalid email or password");

        String token = jwtUtil.generateCustomerToken(c.getEmail(), c.getId());
        return new CustomerResponse(c.getId(), c.getName(), c.getEmail(), c.getPhone(), token);
    }

    public Customer getByEmail(String email) {
        return customerRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
    }
}
