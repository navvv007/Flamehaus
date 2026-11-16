// ADD this method to your existing DeliveryAssignmentRepository interface:

    /**
     * Find active assignments older than the timeout cutoff.
     * Used by OrderTimeoutService to auto-cancel stale deliveries.
     */
    @Query("SELECT a FROM DeliveryAssignment a " +
           "WHERE a.status IN :statuses " +
           "AND a.assignedAt < :cutoff")
    List<DeliveryAssignment> findByStatusInAndAssignedAtBefore(
        @Param("statuses") List<String> statuses,
        @Param("cutoff")   LocalDateTime cutoff);