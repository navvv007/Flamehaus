1. DELETE this file from your backend:
   src/main/java/com/flamehaus/api/controller/AdminOrderController.java

2. REPLACE this file with be/OrderController.java:
   src/main/java/com/flamehaus/api/controller/OrderController.java

3. Run: mvn spring-boot:run

If it fails again with "Ambiguous mapping", the next error names the URL
in the form  {GET [/api/...]}: There is already 'xxxController' bean method
mapped. Send me that line.

To list every URL your controllers map (to spot duplicates yourself):
  findstr /s /n /r "Mapping(" src\main\java\com\flamehaus\api\controller\*.java
