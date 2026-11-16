If startup STILL fails with PartTreeJpaQuery, find the exact method:

  mvn spring-boot:run 2>&1 | findstr /i "No property"

You'll get one line like:
  No property 'createdAt' found for type 'OrderCancellation'
                ^ the bad field name       ^ the entity
That names the repository interface to fix. Paste that line to me if it is
not OrderCancellationRepository.
