# IntelliCore Enterprise AI Platform

> **Advanced Document Intelligence, Semantic Vector RAG Search & AI Copilot Workspaces**

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![Backend Tech](https://img.shields.io/badge/Backend-Express.js%20%7C%20Prisma%20%7C%20BullMQ-blue)]()
[![Frontend Tech](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TailwindCSS-purple)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20(%2Bpgvector)-0064a5)]()

---

## 🌟 Overview

**IntelliCore** is an advanced enterprise AI document processing and decision-support platform designed to transform disorganized corporate data repositories, PDFs, and departmental documentation into actionable AI intelligence. Built on high-performance modern web architecture, IntelliCore combines vector similarity search with intelligent chunking pipelines, rich visual analytics dashboards, and interactive LLM chat workspaces.

---

## 🚀 Key Enterprise Features

- 📂 **Multi-Tier Organizational Hierarchy**: Secure multi-tenant administration across Organizations, Workspaces, Departments, and Collections.
- 🧠 **Neural Embedding Vector Engine**: Built-in automated document ingestion using `@xenova/transformers` (`all-MiniLM-L6-v2`) and PostgreSQL pgvector similarity indices.
- 💬 **Interactive RAG AI Copilot**: Real-time context-aware conversational agent with direct factual citations and customizable AI inference preferences.
- 📊 **Executive Analytics Suite**: Comprehensive telemetry visualization tracking document storage consumption, departmental activity trends, and search keyword metrics.
- ⚙️ **Fault-Tolerant Asynchronous Worker Pool**: Scalable Redis/BullMQ background extraction queues with graceful fallback execution during local development.

---

## 🛠️ Quick Setup & Onboarding

IntelliCore is specifically designed for painless zero-config cloning and local startup on any Windows, macOS, or Linux workstation using simple terminal commands—**no manual code modifications required**.

> 📘 **For the complete step-by-step developer installation guide, prerequisite checklists, and troubleshooting reference, please consult [setup.md](file:///c:/Users/Lenovo/Desktop/Enterprise%20AI/Intellicore/setup.md).**

### Minimal 60-Second Terminal Startup

#### 1. Backend Server & Database Seeding:
```bash
cd express-backend
npm install
npm run setup   # Generates Prisma client, syncs pgvector schema, and seeds default admin account & hierarchy
npm run dev     # Starts server on http://localhost:8001/api/v1
```

#### 2. Frontend Web Client:
```bash
cd frontend
npm install
npm run dev     # Opens SPA on http://localhost:5173
```

#### 3. Default Demo & Developer Login:
- **Username**: `admin@intellicore.ai`
- **Password**: `admin123`

---

## 🐳 Docker Compose Execution

To orchestrate the entire multi-container stack (PostgreSQL + pgvector, Redis, Express API, Worker, and Nginx Web Application) without installing local services:
```bash
docker-compose up -d --build
```

---

## 📁 Repository Structure

```
├── express-backend/       # Express.js REST API v1, BullMQ Workers, and Prisma Schema
│   ├── prisma/            # Schema definitions, migrations configuration, and automated seeding
│   ├── src/
│   │   ├── config/        # Centralized database and fault-tolerant Redis connection providers
│   │   ├── controllers/   # Business logic for Auth, Hierarchy, Documents, Analytics, RAG Search & Chat
│   │   ├── middlewares/   # JWT Authentication and request security interceptors
│   │   └── routes/        # Router endpoint mapping
├── frontend/              # Vite + React + TailwindCSS Single Page Application
│   ├── src/
│   │   ├── components/    # Modular UI building blocks and visualization cards
│   │   ├── layouts/       # Enterprise Application Desktop & Navigation Shells
│   │   ├── lib/           # Synchronized Axios HTTP client bindings
│   │   ├── pages/         # Core application workspaces (Dashboard, Collections, Chat, Analytics, Settings)
│   │   └── store/         # Zustand hierarchy & user session state management
├── scripts/               # Utility, testing, and CI automated verification scripts
├── setup.md               # Complete developer onboarding manual and troubleshooting guide
└── docker-compose.yml     # Multi-service container orchestration manifest
```

---
*Developed & maintained by the IntelliCore Enterprise Engineering Team.*
