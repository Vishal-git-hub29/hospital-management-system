# ---- Build stage: compile the jar inside Docker ----
FROM eclipse-temurin:17 AS build
WORKDIR /app

# Cache dependencies first
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

# Build the application
COPY src ./src
RUN ./mvnw -B clean package -DskipTests

# ---- Run stage: lightweight runtime image ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "app.jar"]
