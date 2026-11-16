package com.flamehaus.api.dto;

public class OrderRequest {
    private String customerName;
    private String customerPhone;
    private String deliveryAddress;
    private String addressLine1;
    private String addressLine2;
    private String landmark;
    private String city;
    private String state;
    private String pincode;
    private Double deliveryLat;
    private Double deliveryLng;
    private Double total;
    private String itemsSummary;
    private String couponCode;
    private Double discountAmountInr;

    public String getCustomerName()              { return customerName; }
    public void   setCustomerName(String v)      { this.customerName = v; }
    public String getCustomerPhone()             { return customerPhone; }
    public void   setCustomerPhone(String v)     { this.customerPhone = v; }
    public String getDeliveryAddress()           { return deliveryAddress; }
    public void   setDeliveryAddress(String v)   { this.deliveryAddress = v; }
    public String getAddressLine1()              { return addressLine1; }
    public void   setAddressLine1(String v)      { this.addressLine1 = v; }
    public String getAddressLine2()              { return addressLine2; }
    public void   setAddressLine2(String v)      { this.addressLine2 = v; }
    public String getLandmark()                  { return landmark; }
    public void   setLandmark(String v)          { this.landmark = v; }
    public String getCity()                      { return city; }
    public void   setCity(String v)              { this.city = v; }
    public String getState()                     { return state; }
    public void   setState(String v)             { this.state = v; }
    public String getPincode()                   { return pincode; }
    public void   setPincode(String v)           { this.pincode = v; }
    public Double getDeliveryLat()               { return deliveryLat; }
    public void   setDeliveryLat(Double v)       { this.deliveryLat = v; }
    public Double getDeliveryLng()               { return deliveryLng; }
    public void   setDeliveryLng(Double v)       { this.deliveryLng = v; }
    public Double getTotal()                     { return total; }
    public void   setTotal(Double v)             { this.total = v; }
    public String getItemsSummary()              { return itemsSummary; }
    public void   setItemsSummary(String v)      { this.itemsSummary = v; }
    public String getCouponCode()                { return couponCode; }
    public void   setCouponCode(String v)        { this.couponCode = v; }
    public Double getDiscountAmountInr()         { return discountAmountInr; }
    public void   setDiscountAmountInr(Double v) { this.discountAmountInr = v; }
}