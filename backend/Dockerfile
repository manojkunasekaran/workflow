FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy project definition files first to cache dependencies
COPY pom.xml .
COPY api/pom.xml api/
COPY core/pom.xml core/
COPY common/pom.xml common/
COPY persistence/pom.xml persistence/

# Download dependencies (this layer will be cached unless poms change)
RUN mvn dependency:go-offline -B

# Copy the rest of the source code
COPY . .
# Note: Maven image might not support Java 25 yet, assuming toolchain or compatible JDK
RUN mvn clean package -DskipTests

# Using Java 21 LTS
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=build /app/api/target/*.jar app.jar
ENTRYPOINT ["java","-jar","app.jar"]
