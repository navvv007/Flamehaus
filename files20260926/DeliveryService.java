// In DeliveryService.java — replace getAllAssignments() with this:

public List<DeliveryAssignment> getAllAssignments() {
    // Returns ONE row per order (active/latest), no duplicates.
    // REJECTED rows are excluded — admin sees only the current state.
    return assignmentRepo.findLatestPerOrder();
}

public List<DeliveryAssignment> getAllAssignmentsWithHistory() {
    // Full history including rejected — for detailed admin view
    return assignmentRepo.findAllByOrderByAssignedAtDesc();
}

public List<DeliveryAssignment> getOrderAssignmentHistory(Long orderId) {
    // All assignments (including rejected) for a specific order
    return assignmentRepo.findAllByOrderId(orderId);
}
