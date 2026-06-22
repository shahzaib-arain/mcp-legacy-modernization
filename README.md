# NADRA Management System — Modernized

A complete modernization of a legacy C++ console application into a production-ready full-stack web application.

---

## Old vs New Architecture

| Aspect | Legacy (C++) | Modern (Node.js + React) |
| :--- | :--- | :--- |
| **Runtime** | C++ compiled binary | Node.js 20 + TypeScript |
| **Interface** | Terminal console menu | React SPA dashboard |
| **Storage** | Flat text file (`nadra_records.txt`) | PostgreSQL with Prisma ORM |
| **Record limit** | Hard-capped at 500 (array overflow risk) | Unlimited (DB-backed) |
| **Search** | Linear scan `O(n)` | Indexed DB query |
| **Authentication** | None | JWT-based admin auth |
| **Concurrency** | File-locking race conditions | PostgreSQL ACID transactions |
| **Deployment** | Single `.exe` on Windows | Docker Compose (3 containers) |
| **Testing** | None | 11 backend API tests + 2 frontend component tests |

---

## Project Structure

```
/MCP
├── LEGACY_ANALYSIS.md          # Phase 1 — C++ codebase analysis
├── ARCHITECTURE.md             # Phase 2 — New system design
├── JIRA_STORIES.md             # Phase 4 — User stories & acceptance criteria
├── MIGRATION_STATUS_REPORT.md  # Migration progress tracking
├── docker-compose.yml          # Orchestrates all 3 services
│
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── app.ts              # Express entry point
│   │   ├── controllers/        # auth.ts, records.ts
│   │   ├── middleware/         # auth.ts (JWT), error.ts (global)
│   │   ├── routes/             # auth.ts, records.ts
│   │   ├── utils/              # logger.ts (Winston)
│   │   └── migrate-legacy.ts  # C++ → PostgreSQL data migration
│   ├── prisma/
│   │   └── schema.prisma       # Admin + CitizenRecord models
│   ├── tests/
│   │   └── api.test.ts         # 11 integration tests (Jest + Supertest)
│   └── Dockerfile
│
├── frontend/                   # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.tsx             # Auth-gated router
│   │   ├── context/            # AuthContext (JWT management)
│   │   ├── pages/              # Login.tsx, Dashboard.tsx
│   │   └── services/           # api.ts (fetch client)
│   ├── tests/
│   │   ├── Login.test.tsx      # Vitest component tests
│   │   └── e2e.spec.ts         # Playwright E2E spec
│   ├── nginx.conf              # SPA routing + API proxy
│   └── Dockerfile
│
├── scripts/
│   └── migrate-legacy.ts       # Standalone migration script
│
└── Nadra-legacy.cpp            # Original C++ source (preserved)
```

---

## Features

- 🔐 **JWT Authentication** — Secure admin login, protected routes
- 📋 **Citizen Registry** — Create, Read, Update, Delete citizen NIC records
- 🔎 **Full-text Search** — Search by name, NIC, father's NIC, mother's name
- 📄 **Pagination** — Server-side pagination for all 500+ records
- 📊 **Statistics Dashboard** — Marital status breakdown, total counts
- 🔒 **Age Validation** — Business rule: applicants must be 18+ (preserved from C++)
- ⚠️ **NIC Uniqueness** — Duplicate NIC prevention at DB constraint level
- 🗑️ **Bulk Delete** — Purge database with confirmation keyword
- 🐳 **Docker Deployment** — One-command production deployment

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js 20+ (for local development only)
- PostgreSQL (handled by Docker in production)

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/nadra_db?schema=public"
JWT_SECRET="nadra_secret_jwt_key_2026_xyz"
PORT=5000
```

> **Important:** In Docker, `DATABASE_URL` host is `db` (the Docker service name), not `localhost`. This is set automatically in `docker-compose.yml`.

### Frontend (`frontend/.env.production`)

```env
VITE_API_URL=/api
```

In Docker, nginx proxies `/api/*` requests to the backend container. For local dev, it defaults to `http://localhost:5000/api`.

---

## Running with Docker (Production)

```bash
# 1. Clone / navigate to project root
cd MCP

# 2. Build and start all services (db, backend, frontend)
docker compose up --build -d

# 3. (First run only) Run the data migration to import legacy records
docker exec nadra-backend-app node dist/migrate-legacy.js

# Done! Services are available at:
# Frontend:  http://localhost
# Backend:   http://localhost:5000
# Database:  localhost:5433 (postgres user, postgres123 pass)
```

### Default Admin Credentials
```
Username: admin
Password: admin123
```

---

## Running Locally (Development)

### 1. Start the Database

```bash
docker compose up -d db
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Apply database migrations
npx prisma migrate dev

# Run legacy data migration (one-time)
npx ts-node src/migrate-legacy.ts

# Start dev server (with hot reload)
npm run dev
```

Backend will run at **http://localhost:5000**

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Frontend will run at **http://localhost:5173**

---

## Database Migration Steps

The legacy system stored 500 citizen records in `nadra_records.txt` using a 7-line-per-record flat format. The migration script:

1. Reads the text file line by line
2. Parses each 7-line block into fields: Name, Father NIC, Mother Name, Birth Certificate, Resident Form, Marital Status, NIC
3. Upserts each record into the `CitizenRecord` PostgreSQL table
4. Seeds the default `admin` account

```bash
# Run locally from /backend directory
npx ts-node src/migrate-legacy.ts

# Run in Docker container
docker exec nadra-backend-app node dist/migrate-legacy.js
```

**Result:** 500 records imported, 0 skipped.

---

## API Reference

All citizen endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `POST` | `/api/auth/register` | Register new admin |
| `GET` | `/api/auth/me` | Get current admin profile |
| `GET` | `/api/records` | List records (pagination + search) |
| `POST` | `/api/records` | Register new citizen (age validation) |
| `GET` | `/api/records/stats` | Get totals and marital status breakdown |
| `GET` | `/api/records/:nic` | Get citizen by NIC number |
| `PUT` | `/api/records/:nic` | Update citizen record |
| `DELETE` | `/api/records/:nic` | Delete specific citizen record |
| `DELETE` | `/api/records` | Delete ALL records |

---

## Testing

### Backend (Jest + Supertest) — 11/11 Passing

```bash
cd backend
npm test
```

Tests cover: health check, register, login, auth protection, citizen CRUD, age validation, pagination, and 404 handling.

### Frontend Component Tests (Vitest) — 2/2 Passing

```bash
cd frontend
npm test
```

### Frontend E2E (Playwright)

```bash
cd frontend
# Install Playwright browsers (first time)
npx playwright install chromium

# Run E2E tests (requires running backend + frontend on local ports)
npx playwright test tests/e2e.spec.ts
```

---

## Docker Commands Reference

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View backend logs
docker logs nadra-backend-app -f

# View database logs
docker logs nadra-postgres -f

# Rebuild and restart a single service
docker compose build backend && docker compose up -d backend

# Connect to database directly
docker exec -it nadra-postgres psql -U postgres -d nadra_db

# Stop and remove all data (clean slate)
docker compose down -v
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Node.js 20, TypeScript, Express 4 |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL 16 |
| **Auth** | JSON Web Tokens (JWT) |
| **Validation** | Zod |
| **Logging** | Winston |
| **Frontend** | React 19, TypeScript, Vite 8 |
| **Styling** | Tailwind CSS 4 |
| **Icons** | Lucide React |
| **Backend Tests** | Jest 29, Supertest |
| **Frontend Tests** | Vitest 4, Testing Library |
| **E2E Tests** | Playwright |
| **Container** | Docker, Docker Compose |
| **Web Server** | nginx (Alpine) |
