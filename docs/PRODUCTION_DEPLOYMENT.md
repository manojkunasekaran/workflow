# Production Deployment Guide

A comprehensive, end-to-end guide for deploying the **Workflow Automation Platform** to a production VM using Docker, GitHub Actions CI/CD, and GitHub Container Registry (GHCR).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Part 1 — GitHub Repository Setup](#part-1--github-repository-setup)
- [Part 2 — CI/CD Pipeline (GitHub Actions)](#part-2--cicd-pipeline-github-actions)
- [Part 3 — VM Setup](#part-3--vm-setup)
- [Part 4 — First Deployment](#part-4--first-deployment)
- [Part 5 — Updating & Redeployment](#part-5--updating--redeployment)
- [Part 6 — Security Hardening](#part-6--security-hardening)
- [Part 7 — Monitoring & Maintenance](#part-7--monitoring--maintenance)
- [Part 8 — Troubleshooting](#part-8--troubleshooting)
- [Appendix — File Reference](#appendix--file-reference)

---

## Architecture Overview

The platform runs as a set of Docker containers orchestrated by Docker Compose.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Production VM                                │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                  Nginx (Port 80)                          │     │
│   │          Gateway / Reverse Proxy / Static Server          │     │
│   │                                                           │     │
│   │   /           → serves React static files (from volume)  │     │
│   │   /rest/*     → proxies to API service (port 8080)       │     │
│   └───────────────────────┬───────────────────────────────────┘     │
│                           │                                         │
│              ┌────────────┴────────────┐                            │
│              │                         │                            │
│   ┌──────────▼──────────┐   ┌──────────▼──────────┐                │
│   │   API Service       │   │   Core Service       │                │
│   │   (Spring Boot)     │   │   (Spring Boot)      │                │
│   │   Port 8080         │   │   Port 8081 (HTTP)   │                │
│   │                     │   │   Port 9090 (gRPC)   │                │
│   └──────────┬──────────┘   └──────────┬──────────┘                │
│              │                         │                            │
│       ┌──────┴─────────────────────────┴──────┐                    │
│       │                                       │                    │
│   ┌───▼───────────┐              ┌────────────▼──┐                 │
│   │  RabbitMQ     │              │  Redis        │                 │
│   │  Port 5672    │              │  Port 6379    │                 │
│   │  Port 15672   │              │               │                 │
│   └───────────────┘              └───────────────┘                 │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │  Frontend Extractor (Init Container)                      │     │
│   │  Runs once → copies React build to shared volume → exits  │     │
│   └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **GitHub Actions** builds Docker images on every push to `main` and publishes them to GHCR.
2. On the **VM**, you pull the pre-built images and start the stack with `docker compose`.
3. The **Frontend Extractor** is an init container — it copies pre-built React static files into a shared Docker volume, then exits.
4. **Nginx** serves those static files and reverse-proxies API requests (`/rest/`) to the backend.
5. **Core** and **API** are independent Spring Boot services communicating via gRPC and RabbitMQ.

### Container Inventory

| Container              | Image Source | Purpose                                    | Persistent? |
|------------------------|--------------|--------------------------------------------|-------------|
| `nginx`                | `nginx:1.27-alpine` (public) | Gateway, static file server, reverse proxy | ✅ Running  |
| `frontend-extractor`   | GHCR (your image)            | Copies React build to volume               | ❌ Exits    |
| `api`                  | GHCR (your image)            | REST API (Spring Boot)                     | ✅ Running  |
| `core`                 | GHCR (your image)            | Workflow engine, gRPC (Spring Boot)        | ✅ Running  |
| `rabbitmq`             | `rabbitmq:3-management` (public) | Message broker                         | ✅ Running  |
| `redis`                | `redis:7-alpine` (public)    | Caching layer                              | ✅ Running  |

---

## Prerequisites

### On Your Development Machine
- Git
- A GitHub account with access to the repository

### On the Production VM
- **OS**: Ubuntu 22.04+ / Debian 12+ / Amazon Linux 2023 (or any Linux with Docker support)
- **Docker Engine**: v24.0+
- **Docker Compose**: v2.20+ (bundled with Docker Engine)
- **RAM**: Minimum 6 GB (recommended 8 GB+)
- **Disk**: Minimum 20 GB free space
- **Network**: Ports 80 (HTTP), 443 (HTTPS, if applicable) open in firewall

---

## Part 1 — GitHub Repository Setup

### 1.1 Enable GitHub Actions Permissions

1. Go to your repository on GitHub.
2. Navigate to **Settings** → **Actions** → **General**.
3. Under **Workflow permissions**, select **"Read and write permissions"**.
4. Click **Save**.

This allows the CI/CD pipeline to push Docker images to GHCR.

### 1.2 Verify Branch Name

The GitHub Actions workflow (`.github/workflows/docker-publish.yml`) is configured to trigger on pushes to the `main` branch:

```yaml
on:
  push:
    branches: [ "main" ]
```

> **If your default branch is `master`**, update this line before proceeding.

### 1.3 Update Image Names in `docker-compose.prod.yml`

Replace the placeholder `yourusername` with your actual GitHub username (lowercase) in all three image references:

```yaml
# Before
image: ghcr.io/yourusername/workflow-frontend:latest
image: ghcr.io/yourusername/workflow-core:latest
image: ghcr.io/yourusername/workflow-api:latest

# After (example for GitHub user "acme-corp" and repo "Workflow")
image: ghcr.io/acme-corp/workflow-frontend:latest
image: ghcr.io/acme-corp/workflow-core:latest
image: ghcr.io/acme-corp/workflow-api:latest
```

> **Important**: GitHub image names must be **all lowercase**. If your username or repo name has uppercase letters, convert them to lowercase.

### 1.4 Commit and Push

```bash
git add -A
git commit -m "feat: add CI/CD pipeline and production deployment config"
git push origin main
```

This push will trigger the GitHub Actions workflow for the first time.

### 1.5 Verify the CI/CD Build

1. Go to your repository on GitHub.
2. Click on the **Actions** tab.
3. You should see the **"Build and Push Docker Images"** workflow running.
4. Wait for it to complete successfully (green checkmark ✅).
5. Verify the images exist: Go to your GitHub profile → **Packages** tab. You should see three packages:
   - `workflow-frontend`
   - `workflow-core`
   - `workflow-api`

### 1.6 Set Package Visibility (If Private Repository)

If your repository is **private**, the Docker images will also be private by default. To allow your VM to pull them, you need a Personal Access Token (covered in Part 3).

If you want to make the images public:
1. Go to your GitHub profile → **Packages**.
2. Click on each package → **Package settings**.
3. Under **Danger Zone**, change visibility to **Public**.

---

## Part 2 — CI/CD Pipeline (GitHub Actions)

### 2.1 What the Pipeline Does

The workflow file `.github/workflows/docker-publish.yml` performs the following on every push to `main`:

```
Push to main
    │
    ▼
Checkout code
    │
    ▼
Login to GHCR (using GITHUB_TOKEN)
    │
    ├─► Build Frontend Image (frontend/Dockerfile.prod)
    │       → Tag: ghcr.io/<owner>/<repo>-frontend:latest
    │       → Tag: ghcr.io/<owner>/<repo>-frontend:<commit-sha>
    │
    ├─► Build Core Image (backend/Dockerfile.prod, APP_MODULE=core)
    │       → Tag: ghcr.io/<owner>/<repo>-core:latest
    │       → Tag: ghcr.io/<owner>/<repo>-core:<commit-sha>
    │
    └─► Build API Image (backend/Dockerfile.prod, APP_MODULE=api)
            → Tag: ghcr.io/<owner>/<repo>-api:latest
            → Tag: ghcr.io/<owner>/<repo>-api:<commit-sha>
```

### 2.2 Image Tagging Strategy

Each image is tagged with two identifiers:
- **`latest`** — Always points to the most recent build. Used for standard deployments.
- **`<commit-sha>`** — A unique tag tied to the exact Git commit. Useful for rollbacks.

### 2.3 Customizing the Pipeline

| Customization | Where to Change |
|---|---|
| Trigger on a different branch | `on.push.branches` in the workflow file |
| Add staging environment | Duplicate the workflow, change branch to `staging` |
| Build only when specific paths change | Add `paths` filter under `on.push` |
| Add tests before building | Add a test job before `build-and-push` |

---

## Part 3 — VM Setup

### 3.1 Install Docker

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow your user to run Docker without sudo
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 3.2 Authenticate with GitHub Container Registry

Generate a **Personal Access Token (PAT)** on GitHub:

1. Go to GitHub → **Settings** → **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Give it a descriptive name (e.g., `vm-production-pull`).
4. Select the scope: **`read:packages`**.
5. Click **Generate token** and copy it immediately.

Log in from your VM:

```bash
echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

You should see: `Login Succeeded`.

> **Tip**: Docker stores credentials in `~/.docker/config.json`. This login persists across reboots.

### 3.3 Create the Deployment Directory

```bash
mkdir -p ~/workflow-app/config
cd ~/workflow-app
```

### 3.4 Create the Environment File

Create a `.env` file with your production credentials:

```bash
nano ~/workflow-app/.env
```

Paste the following and fill in your values:

```ini
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=workflow

# RabbitMQ
RABBITMQ_HOST=rabbitmq

# Redis
REDIS_HOST=redis

# gRPC
GRPC_CLIENT_CORE_SERVICE_ADDRESS=static://core:9090
```

> **Security**: Set restrictive permissions on this file:
> ```bash
> chmod 600 ~/workflow-app/.env
> ```

### 3.5 Create the Nginx Configuration

```bash
nano ~/workflow-app/config/nginx.conf
```

Paste the following:

```nginx
server {
    listen 80;
    server_name _;

    # ---- Frontend (React/Vite static build) -------------------------------
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache hashed static assets aggressively
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico)$ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ---- API reverse proxy -------------------------------------------------
    location /rest/ {
        proxy_pass http://api:8080/rest/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }

    client_max_body_size 20m;
}
```

### 3.6 Create the Docker Compose File

```bash
nano ~/workflow-app/docker-compose.yml
```

Paste the following (replace `<github-username>` and `<repo-name>` with your actual values, **all lowercase**):

```yaml
services:

  # ── Infrastructure ──────────────────────────────────────────────────────────

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-guest}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS:-guest}
    restart: unless-stopped
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - workflow-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - workflow-network

  # ── Nginx Gateway ──────────────────────────────────────────────────────────

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - frontend_dist:/usr/share/nginx/html:ro
      - ./config/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      frontend-extractor:
        condition: service_completed_successfully
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 50M
    networks:
      - workflow-network

  # ── Frontend Extractor (Init Container) ─────────────────────────────────────

  frontend-extractor:
    image: ghcr.io/<github-username>/<repo-name>-frontend:latest
    volumes:
      - frontend_dist:/output
    restart: "no"

  # ── Backend ──────────────────────────────────────────────────────────────────

  core:
    image: ghcr.io/<github-username>/<repo-name>-core:latest
    ports:
      - "8081:8081"
      - "9090:9090"
    env_file:
      - .env
    environment:
      JAVA_OPTS: "-XX:MaxRAMPercentage=70.0"
    depends_on:
      redis:
        condition: service_started
      rabbitmq:
        condition: service_started
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
    networks:
      - workflow-network

  api:
    image: ghcr.io/<github-username>/<repo-name>-api:latest
    ports:
      - "8080:8080"
    env_file:
      - .env
    environment:
      JAVA_OPTS: "-XX:MaxRAMPercentage=70.0"
    depends_on:
      redis:
        condition: service_started
      rabbitmq:
        condition: service_started
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
    networks:
      - workflow-network

networks:
  workflow-network:
    driver: bridge

volumes:
  rabbitmq_data:
  redis_data:
  frontend_dist:
```

### 3.7 Final Directory Structure on the VM

```
~/workflow-app/
├── .env                     # Production environment variables
├── docker-compose.yml       # Container orchestration
└── config/
    └── nginx.conf           # Nginx gateway configuration
```

That's it. Three files. No source code, no compilers, no runtimes.

---

## Part 4 — First Deployment

### 4.1 Pull and Start

```bash
cd ~/workflow-app

# Pull all images from GHCR
docker compose pull

# Start everything in detached mode
docker compose up -d
```

### 4.2 Verify All Services Are Running

```bash
docker compose ps
```

Expected output:

```
NAME                  IMAGE                                        STATUS
nginx                 nginx:1.27-alpine                            Up
frontend-extractor    ghcr.io/.../workflow-frontend:latest         Exited (0)
core                  ghcr.io/.../workflow-core:latest             Up
api                   ghcr.io/.../workflow-api:latest              Up
rabbitmq              rabbitmq:3-management                        Up
redis                 redis:7-alpine                               Up
```

> **Note**: `frontend-extractor` showing `Exited (0)` is **expected** — it's an init container that copies files and exits.

### 4.3 Verify the Application

```bash
# Check if the frontend is being served
curl -s -o /dev/null -w "%{http_code}" http://localhost/

# Should return: 200

# Check if the API is reachable through Nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost/rest/api/v1/health

# Should return: 200 (or appropriate status code)
```

Open your browser and navigate to `http://<your-vm-ip>/`.

---

## Part 5 — Updating & Redeployment

When you push new code to the `main` branch, GitHub Actions will automatically build and push updated images. To deploy the update on your VM:

### 5.1 Standard Update (Recommended)

```bash
cd ~/workflow-app

# Pull the latest images
docker compose pull

# Recreate only the containers whose images have changed
docker compose up -d
```

Docker Compose is smart enough to only restart containers whose images have actually changed.

### 5.2 Create a Deployment Script

For convenience, create a reusable script:

```bash
nano ~/workflow-app/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🔄 Pulling latest images..."
docker compose pull

echo "🚀 Restarting updated services..."
docker compose up -d

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment complete!"
docker compose ps
```

```bash
chmod +x ~/workflow-app/deploy.sh
```

Now deploy with a single command:

```bash
cd ~/workflow-app && ./deploy.sh
```

### 5.3 Rollback to a Previous Version

Every build is tagged with its Git commit SHA. To roll back:

1. Find the commit SHA of the last known working version:
   ```bash
   # On your development machine
   git log --oneline -10
   ```

2. Update `docker-compose.yml` on your VM to pin the specific SHA:
   ```yaml
   # Replace :latest with :<commit-sha>
   image: ghcr.io/<github-username>/<repo-name>-api:<commit-sha>
   ```

3. Re-deploy:
   ```bash
   docker compose up -d
   ```

---

## Part 6 — Security Hardening

### 6.1 Change Default RabbitMQ Credentials

Never use `guest/guest` in production. Update your `docker-compose.yml`:

```yaml
rabbitmq:
  environment:
    RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
    RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
```

Add to your `.env` file:

```ini
RABBITMQ_USER=workflow_prod
RABBITMQ_PASS=<strong-random-password>
```

### 6.2 Remove Unnecessary Port Exposures

In production, internal services should **not** expose ports to the host. Only Nginx (port 80) needs to be publicly accessible.

Remove or comment out these port mappings in `docker-compose.yml`:

```yaml
# redis — no ports needed (accessed internally via Docker network)
# rabbitmq — remove 5672, keep 15672 only if you need the management UI
# core — remove 8081 and 9090 (accessed internally by api via Docker network)
# api — remove 8080 (accessed by nginx internally via Docker network)
```

### 6.3 Enable HTTPS with SSL/TLS

For production, you should serve traffic over HTTPS. The simplest approach is to use **Certbot** with Let's Encrypt.

1. Install Certbot on the VM:
   ```bash
   sudo apt-get install -y certbot
   ```

2. Obtain a certificate:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```

3. Update `config/nginx.conf` to listen on port 443 and redirect HTTP to HTTPS:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       # ... rest of the config (locations, proxy, etc.)
   }
   ```

4. Mount the certificate directory into the Nginx container:
   ```yaml
   nginx:
     volumes:
       - /etc/letsencrypt:/etc/letsencrypt:ro
     ports:
       - "80:80"
       - "443:443"
   ```

### 6.4 Redis Authentication

Add a password to Redis:

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD}
```

Add `REDIS_PASSWORD` to your `.env` and update your Spring Boot configuration accordingly.

### 6.5 Firewall Rules

```bash
# Allow only HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Part 7 — Monitoring & Maintenance

### 7.1 View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f core

# Last 100 lines
docker compose logs --tail 100 api
```

### 7.2 Monitor Resource Usage

```bash
# Live resource usage
docker stats

# Disk usage by Docker
docker system df
```

### 7.3 Clean Up Unused Resources

```bash
# Remove unused images (old versions after updates)
docker image prune -f

# Full cleanup (unused images, networks, build cache)
docker system prune -f
```

### 7.4 Backup Persistent Data

```bash
# Backup RabbitMQ data
docker run --rm -v workflow-app_rabbitmq_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/rabbitmq-backup-$(date +%Y%m%d).tar.gz -C /data .

# Backup Redis data
docker run --rm -v workflow-app_redis_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/redis-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### 7.5 Health Check Commands

```bash
# Quick status check
docker compose ps

# Check if a service is healthy
docker inspect --format='{{.State.Health.Status}}' <container-name>

# Check container restart count (high count = problem)
docker inspect --format='{{.RestartCount}}' <container-name>
```

---

## Part 8 — Troubleshooting

### Frontend shows a blank page or 404

```bash
# Check if the extractor ran successfully
docker compose logs frontend-extractor

# Verify files were copied to the volume
docker run --rm -v workflow-app_frontend_dist:/data alpine ls -la /data/

# If empty, re-run the extractor
docker compose rm -f frontend-extractor
docker compose up -d frontend-extractor
# Then restart nginx to pick up the dependency
docker compose restart nginx
```

### API returns 502 Bad Gateway

```bash
# Check if the API container is running
docker compose ps api

# Check API logs for startup errors
docker compose logs --tail 200 api

# Common causes:
# - API hasn't finished starting yet (Spring Boot takes ~30s)
# - MongoDB connection string is wrong in .env
# - RabbitMQ hasn't started yet
```

### Container keeps restarting

```bash
# Check the logs for the crash reason
docker compose logs --tail 200 <service-name>

# Check if it's an OOM (Out of Memory) kill
docker inspect <container-id> | grep -i oom
```

### Cannot pull images from GHCR

```bash
# Re-authenticate
echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Verify you can pull manually
docker pull ghcr.io/<github-username>/<repo-name>-api:latest

# Common causes:
# - PAT token expired
# - PAT doesn't have read:packages scope
# - Image name has uppercase letters (must be all lowercase)
```

### How to completely reset everything

```bash
cd ~/workflow-app

# Stop and remove all containers, networks, and volumes
docker compose down -v

# Re-deploy from scratch
docker compose pull
docker compose up -d
```

> **Warning**: `docker compose down -v` deletes all persistent data (RabbitMQ messages, Redis cache). Use with caution.

---

## Appendix — File Reference

### Files in the Repository

| File | Purpose |
|---|---|
| `.github/workflows/docker-publish.yml` | CI/CD pipeline — builds and pushes Docker images on push to `main` |
| `frontend/Dockerfile.prod` | Multi-stage build: compiles React app, packages as an init container extractor |
| `backend/Dockerfile.prod` | Multi-stage build: compiles Spring Boot JAR, packages with JRE runtime |
| `config/nginx.conf` | Nginx gateway config — serves static files and proxies API requests |
| `docker-compose.prod.yml` | Production compose file (kept in repo for reference) |

### Files on the VM

| File | Purpose |
|---|---|
| `~/workflow-app/docker-compose.yml` | Container orchestration (uses pre-built images from GHCR) |
| `~/workflow-app/.env` | Production secrets (MongoDB URI, credentials, etc.) |
| `~/workflow-app/config/nginx.conf` | Nginx configuration (copied from repo's `config/nginx.conf`) |
| `~/workflow-app/deploy.sh` | One-command deployment script |

### Docker Volumes

| Volume | Purpose | Backed Up? |
|---|---|---|
| `frontend_dist` | React static files (recreated on every deploy) | No (regenerated) |
| `rabbitmq_data` | RabbitMQ queues and messages | Recommended |
| `redis_data` | Redis cache data | Optional |
