package com.flamehaus.api.service;
import com.flamehaus.api.dto.AddressRequest;
import com.flamehaus.api.entity.Customer;
import com.flamehaus.api.entity.CustomerAddress;
import com.flamehaus.api.repository.CustomerAddressRepository;
import com.flamehaus.api.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AddressService {
    private final CustomerAddressRepository addrRepo;
    private final CustomerRepository        customerRepo;

    public AddressService(CustomerAddressRepository addrRepo, CustomerRepository customerRepo) {
        this.addrRepo     = addrRepo;
        this.customerRepo = customerRepo;
    }

    public List<CustomerAddress> getAddresses(Long customerId) {
        return addrRepo.findByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId);
    }

    public CustomerAddress save(Long customerId, AddressRequest req) {
        Customer customer = customerRepo.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        if (Boolean.TRUE.equals(req.getIsDefault()))
            addrRepo.clearDefaultForCustomer(customerId);

        CustomerAddress a = new CustomerAddress();
        a.setCustomer(customer);
        fill(a, req);
        return addrRepo.save(a);
    }

    public CustomerAddress update(Long customerId, Long addressId, AddressRequest req) {
        CustomerAddress a = get(customerId, addressId);
        if (Boolean.TRUE.equals(req.getIsDefault()))
            addrRepo.clearDefaultForCustomer(customerId);
        fill(a, req);
        return addrRepo.save(a);
    }

    public void delete(Long customerId, Long addressId) {
        CustomerAddress a = get(customerId, addressId);
        addrRepo.delete(a);
    }

    public CustomerAddress setDefault(Long customerId, Long addressId) {
        addrRepo.clearDefaultForCustomer(customerId);
        CustomerAddress a = get(customerId, addressId);
        a.setIsDefault(true);
        return addrRepo.save(a);
    }

    private CustomerAddress get(Long customerId, Long addressId) {
        CustomerAddress a = addrRepo.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Address not found"));
        if (!a.getCustomer().getId().equals(customerId))
            throw new RuntimeException("Access denied");
        return a;
    }

    private void fill(CustomerAddress a, AddressRequest req) {
        a.setLabel(req.getLabel() != null ? req.getLabel() : "Home");
        a.setAddressLine1(req.getAddressLine1());
        a.setAddressLine2(req.getAddressLine2());
        a.setLandmark(req.getLandmark());
        a.setCity(req.getCity());
        a.setState(req.getState());
        a.setPincode(req.getPincode());
        a.setCountry(req.getCountry() != null ? req.getCountry() : "India");
        a.setLatitude(req.getLatitude());
        a.setLongitude(req.getLongitude());
        a.setIsDefault(Boolean.TRUE.equals(req.getIsDefault()));
    }
}