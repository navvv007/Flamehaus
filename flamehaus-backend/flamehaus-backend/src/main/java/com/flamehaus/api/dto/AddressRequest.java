package com.flamehaus.api.dto;
import jakarta.validation.constraints.NotBlank;

public class AddressRequest {
    private String  label = "Home";
    @NotBlank private String addressLine1;
    private String  addressLine2;
    private String  landmark;
    @NotBlank private String city;
    @NotBlank private String state;
    @NotBlank private String pincode;
    private String  country = "India";
    private Double  latitude;
    private Double  longitude;
    private Boolean isDefault = false;

    public String  getLabel()        { return label; }
    public void    setLabel(String l){ this.label=l; }
    public String  getAddressLine1() { return addressLine1; }
    public void    setAddressLine1(String a){ this.addressLine1=a; }
    public String  getAddressLine2() { return addressLine2; }
    public void    setAddressLine2(String a){ this.addressLine2=a; }
    public String  getLandmark()     { return landmark; }
    public void    setLandmark(String l){ this.landmark=l; }
    public String  getCity()         { return city; }
    public void    setCity(String c) { this.city=c; }
    public String  getState()        { return state; }
    public void    setState(String s){ this.state=s; }
    public String  getPincode()      { return pincode; }
    public void    setPincode(String p){ this.pincode=p; }
    public String  getCountry()      { return country; }
    public void    setCountry(String c){ this.country=c; }
    public Double  getLatitude()     { return latitude; }
    public void    setLatitude(Double v){ this.latitude=v; }
    public Double  getLongitude()    { return longitude; }
    public void    setLongitude(Double v){ this.longitude=v; }
    public Boolean getIsDefault()    { return isDefault; }
    public void    setIsDefault(Boolean d){ this.isDefault=d; }
}