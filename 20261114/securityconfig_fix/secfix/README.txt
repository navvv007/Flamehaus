FIX: SecurityConfig compile errors (old package / missing classes)
=================================================================
1. REPLACE the whole file
     src/main/java/com/flamehaus/api/config/SecurityConfig.java
   with be/SecurityConfig.java from this zip. (Select all, delete, paste - do not merge.)
   It already contains the  .requestMatchers("/error").permitAll()  line, so the earlier
   "add one line" step is already done.

2. Make sure there is NO other SecurityConfig in the project. Search for it:
     dir /s /b SecurityConfig.java
   The only result should be  ...\com\flamehaus\api\config\SecurityConfig.java
   Delete any other one (e.g. ...\com\flamehaus\config\SecurityConfig.java).
   Two of them = "ConflictingBeanDefinition" or "duplicate class" errors.

3. Run:  mvn spring-boot:run

If Maven then reports a NEW error, paste it - it will be about a different file.
