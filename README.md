# Workflow Automation Platform

A robust workflow automation platform built with a **Java Spring Boot** backend and a planned **React** frontend. This platform allows users to define, execute, and monitor workflows consisting of various task types.

## 🚀 Project Structure

The project follows a modular monorepo architecture:

- **backend**: Java Spring Boot application (Maven Multi-Module)
  - **`api`**: REST API layer, controllers, and application entry point.
  - **`core`**: The heart of the platform. Contains the `WorkflowEngine`, task execution logic, and service layer.
  - **`persistence`**: Data access layer using Spring Data MongoDB.
  - **`common`**: Shared domain models, DTOs, and utility classes.
- **frontend**: React application (Coming Soon).

## ⚙️ Development Setup

### Prerequisites

- **Java 21** (Temurin/OpenJDK)
- **Maven 3.9+**
- **Docker Desktop** (for RabbitMQ)

### 1. Start Infrastructure

RabbitMQ is the only Docker dependency. Start it with:

```bash
docker compose up -d
```

| Service     | URL                      | Credentials   |
|-------------|--------------------------|---------------|
| RabbitMQ    | http://localhost:15672    | guest / guest |

### 2. Build Shared Modules

Before running either service, install the shared modules to your local Maven repository:

```bash
cd backend
mvn clean install -pl common,persistence -am -DskipTests
```

### 3. Run the Core Service

```bash
mvn spring-boot:run -pl core
```

Core starts on **port 8081** (HTTP) and **port 9090** (gRPC).

### 4. Run the API Service

In a separate terminal:

```bash
mvn spring-boot:run -pl api
```

API starts on **port 8080**.

### Hot Reload

Both services use Spring DevTools — source changes trigger automatic restarts when running via `mvn spring-boot:run`.

### Debugging

Attach your IDE debugger to the Spring Boot process directly — no remote debug setup needed.


## ✨ Features Implemented

- **Modular Architecture**: Clean separation of concerns using Maven modules.
- **Workflow Management**: Full CRUD operations for Workflow Definitions.
- **Task Execution Engine**:
  - **HTTP Tasks**: GET, POST, PUT, DELETE with variable substitution.
  - **Conditional Tasks**: Rule-based branching logic (If/Else).
  - **Iterator Tasks**: Loop over arrays, objects, or ranges.
  - **Parallel Execution**:
    - **BRANCH**: Split workflow into concurrent execution paths.
    - **JOIN**: Gather parallel branches with configurable failure strategy (FAIL_FAST, WAIT_FOR_ALL, REQUIRE_ALL).
    - **WAIT**: Delay execution for a configurable duration (supports variable substitution).
  - Extensible `TaskExecutor` strategy pattern.
- **Async Execution**: Queue-based workflow triggering via RabbitMQ with dead-letter exchange for failed messages.
- **Execution Tracking**:
  - Trigger workflow executions.
  - Track status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`).
  - Capture task-level logs, outputs, and audit trails.
- **Variable Resolution**: Template expressions (`{{$tasks.taskId.field}}`, `{{$input.name}}`, `{{$variables.key}}`).
- **Persistence**: Robust data storage using MongoDB.
- **Auditing**: Automatic tracking of creation and modification timestamps.

## 🔮 Future Implementations

- **Frontend Dashboard**: A React-based UI to visualize and manage workflows.
- **Advanced Task Types**:
  - Human-in-the-loop tasks.
  - Script/Code execution tasks.
- **Authentication & Authorization**: Secure access control.
- **Resilience**: Retry policies, timeouts, and dead-letter queues.
- **Scheduler**: Cron-based workflow triggers.
