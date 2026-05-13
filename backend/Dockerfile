# =============================================================================
# Development Dockerfile — Workflow Platform
# =============================================================================
# Strategy: IDE compiles on the host; Docker only runs the Spring Boot app.
#   - The entire ./backend directory is volume-mounted at /app at runtime.
#   - Maven local repo is stored in a named volume (maven-repo) so dependencies
#     are cached between container restarts and across services.
#   - target/ directories are mapped to anonymous Docker volumes to prevent
#     Windows file-lock errors caused by the host IDE and Docker competing.
# =============================================================================

FROM maven:3.9.6-eclipse-temurin-21

# Receive the target module (core | api) as a build-time argument.
# This is the only thing that differs between the two service images.
ARG APP_MODULE=core
ENV APP_MODULE=${APP_MODULE}

WORKDIR /app



# Why "sh -c"?
# Docker's exec-form ENTRYPOINT (JSON array) runs the binary directly with no shell,
# so environment variables like ${APP_MODULE} would NOT be expanded — they'd be
# passed as the literal string "${APP_MODULE}".  A shell is required to resolve them.
# "exec" replaces the sh process with mvn so that SIGTERM from `docker stop` reaches
# the JVM directly, enabling graceful Spring Boot shutdown.
#
# -pl ${APP_MODULE}  → select only this sub-module (core | api)
# -am               → also make / build its local dependencies (common, persistence)
ENTRYPOINT ["sh", "-c", \
    "exec mvn spring-boot:run -pl ${APP_MODULE} -am \
    -Dspring-boot.run.profiles=${SPRING_PROFILES_ACTIVE:-dev} \
    -Dspring-boot.run.jvmArguments=\"-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:${DEBUG_PORT:-9000}\""]