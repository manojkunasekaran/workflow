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

## ⚙️ Setup & Running

### 1. Environment Configuration

- The application requires a MongoDB connection string.

### 2. Build the Backend

Navigate to the backend directory and build the project:

```bash
cd backend
mvn clean install
```

### 3. Run the Application

Start the API server:

```bash
mvn -pl api spring-boot:run
```

The application will start on **port 8080**.

## 🐳 Docker Setup

The project is configured for a seamless development experience using Docker.

### 1. Prerequisites

- **Docker Desktop** installed and running.

### 2. Run with Docker Compose

To start the application in development mode with **hot reloading** enabled:

```bash
docker compose up --build
```

- **App URL**: `http://localhost:8080`
- **Debug Port**: `8000` (Attach your IDE's remote debugger here)

### 3. Features

- **Hot Reloading**: Changes to the source code in `backend/` are automatically detected, and the application restarts.
- **Cloud Database**: The application is configured to connect to your cloud MongoDB instance.

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
