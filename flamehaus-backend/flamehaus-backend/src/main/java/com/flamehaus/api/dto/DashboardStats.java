package com.flamehaus.api.dto;

public class DashboardStats {
    private long totalOrders;
    private long menuItems;
    private long pendingOrders;
    private double totalRevenue;

    public DashboardStats(long totalOrders, long menuItems, long pendingOrders, double totalRevenue) {
        this.totalOrders = totalOrders;
        this.menuItems = menuItems;
        this.pendingOrders = pendingOrders;
        this.totalRevenue = totalRevenue;
    }

    public long getTotalOrders() { return totalOrders; }
    public long getMenuItems() { return menuItems; }
    public long getPendingOrders() { return pendingOrders; }
    public double getTotalRevenue() { return totalRevenue; }
}
