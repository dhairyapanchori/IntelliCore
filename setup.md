# IntelliCore AI Platform — Developer Onboarding & Setup Manual

Welcome to **IntelliCore**, an enterprise-grade Document Intelligence, Semantic Vector RAG Search, and AI Copilot platform. This document guides new developers through cloning the repository onto any Windows, macOS, or Linux machine, opening it in VS Code, and initializing the full-stack suite using terminal commands only—without requiring manual source code edits.

---

## 1. Prerequisites & Required Software

Before setting up the repository locally, verify that the following core infrastructure tools are installed and operational:

| Dependency | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | v18.0.0+ | LTS (v20+) | Required for both Express API & Vite SPA. |
| **PostgreSQL** | v14.0+ | v16+ | Primary database. Requires `pgvector` extension for semantic embedding searches. |
| **Redis** | v6.0+ | v7+ | Required for BullMQ background asynchronous document ingestion workers. |
| **Git & VS Code**| Latest | Latest | Primary development environment. |
| **Docker** *(Optional)* | Engine v20+ | Docker Desktop | Use only if running containerized local execution via Docker Compose. |

---

## 2. Quickstart: Zero-Config Local Development (Windows / OS X / Linux)

### Step 1 — Open in VS Code & Configure Environments
Open terminal inside VS Code after cloning the repository:
```bash
# Verify environment files exist (copy defaults if starting fresh)
cp express-backend/.env.example express-backend/.env
cp frontend/.env.example frontend/.env
```
*Note: Ensure your PostgreSQL instance has an empty database named `intellicore` available at `postgresql://postgres:postgres@127.0.0.1:5432/intellicore` (or update `express-backend/.env` with your credentials).*

---

### Step 2 — Initialize & Start Backend API + Database Setup
Open a new PowerShell / bash terminal window in VS Code and run:
```bash
cd express-backend
npm install

# Run automated database generation, schema synchronization, and default seeding
npm run setup

# Start local Express server (hot reloading on port 8001)
npm run dev
```

#### What `npm run setup` automatically accomplishes:
1. **`npx prisma generate`**: Builds TypeScript/JavaScript client bindings for Postgres.
2. **`npx prisma db push`**: Synchronizes the Postgres database schema and ensures all relational tables and vector indexes exist.
3. **`npx prisma db seed`**: Runs `prisma/seed.js` to create the default organization hierarchy, workspace, department, initial document collection, and default admin user account.

#### Default Seed Credentials:
- **Email**: `admin@intellicore.ai`
- **Password**: `admin123`
- **Default Hierarchy**: Organization (`IntelliCore Enterprise`) ➔ Workspace (`Global Workspace`) ➔ Department (`General`) ➔ Collection (`Welcome Documents`).

---

### Step 3 — Start Background Document Processor (Worker)
If you intend to upload documents and process embeddings locally, start the standalone BullMQ worker in a separate terminal window:
```bash
cd express-backend
npm run worker
```
*The worker automatically downloads and attaches the local `@xenova/transformers` (`all-MiniLM-L6-v2`) neural extraction model for local CPU vector embedding computation.*

---

### Step 4 — Initialize & Start Frontend Application
In another terminal window in VS Code, start the React + Vite Single Page Application:
```bash
cd frontend
npm install
npm run dev
```
Navigate your browser to **`http://localhost:5173`** and sign in with `admin@intellicore.ai` / `admin123`.

---

## 3. Containerized Setup (Docker & Docker Compose)

To start the entire multi-tier architecture (PostgreSQL, Redis, Express API, Worker, and Nginx SPA) via Docker without managing local databases:
```bash
docker-compose up -d --build
```
- **Frontend App**: `http://localhost` (Port 80)
- **Express Backend API**: `http://localhost:8001/api/v1`

---

## 4. Architecture & Troubleshooting Guide

### Q1: What happens if Redis is offline during local development?
**Graceful Degraded Mode**: Unlike older versions that repeatedly threw `Error: getaddrinfo ENOTFOUND redis` crash loops, the current backend architecture probes Redis at boot. If Redis is unreachable, Express will report a warning (`⚠️ [Redis/BullMQ] Redis server unreachable... Express API starting in degraded mode`) and continue serving authentication, dashboard, analytics, and existing document search queries without crashing.

### Q2: Why does the API run on Port 8001?
To prevent port conflict with standard React debuggers or Python servers that commonly capture Port 8000, IntelliCore explicitly binds to **Port 8001** and prefixes all API routes with `/api/v1`. Both Docker and standalone Vite configurations are perfectly synchronized to target `http://localhost:8001/api/v1` by default.

### Q3: Getting database connection permission errors or missing extension errors?
Ensure your local PostgreSQL superuser account enables the `vector` extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
If using Docker Compose, the included PostgreSQL container automatically pre-installs `pgvector/pgvector:pg16` directly out of the box.
