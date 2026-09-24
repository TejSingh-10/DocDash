# DocDash — Healthcare Management Dashboard

A full-stack web application for managing clinic and hospital operations: patient appointments, medical records, doctor profiles, and operational analytics. Built with a React + Vite frontend and a Node.js/Express + MongoDB backend.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Running Locally](#running-locally)
- [Architecture Overview](#architecture-overview)
- [Access-Control Model](#access-control-model-for-medical-records)
- [Environment Variables Reference](#environment-variables-reference)

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite 5, Tailwind CSS 3, Recharts      |
| Backend    | Node.js 20+, Express 5, Mongoose 8              |
| Database   | MongoDB (local or Atlas)                         |
| Auth       | JWT (jsonwebtoken), bcrypt                      |
| Validation | Zod (backend), inline form validation (frontend)|
| Language   | JavaScript (ES Modules throughout)              |

---

## Project Structure

```
HCD/
├── backend/
│   ├── src/
│   │   ├── auth/            # Registration, login, JWT issuance
│   │   ├── middleware/      # authenticate, authorize, errorHandler
│   │   ├── models/          # Mongoose schemas (User, Appointment, MedicalRecord, …)
│   │   ├── routes/          # Express routers + Zod schemas per domain
│   │   ├── services/        # Business logic (appointmentService, medicalRecordService, …)
│   │   ├── db.js            # MongoDB connection
│   │   └── server.js        # App entry point
│   ├── .env.example         # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/        # RouteGuards (ProtectedRoute, RoleRoute)
│   │   │   ├── layout/      # AppShell (navbar + sidebar + mobile drawer)
│   │   │   └── ui/          # Button, Card, Input, StatusBadge
│   │   ├── context/         # AuthContext, ToastContext
│   │   ├── hooks/           # useApiFetch
│   │   ├── lib/             # api.js (all backend calls in one place)
│   │   ├── pages/           # One file per page/role variant
│   │   └── App.jsx          # Router + provider tree
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── .gitignore
└── README.md
```

---

## Setup

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **MongoDB** — either:
  - A local instance (`mongod` running on default port 27017), or
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (M0 tier is enough for development)

### 1 — Clone and install dependencies

```bash
git clone https://github.com/TejSingh-10/DocDash.git
cd DocDash

# Install root workspace dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2 — Configure environment variables

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set:

```env
PORT=5000
NODE_ENV=development

# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/docdash

# --- OR --- Atlas cluster (replace with your connection string)
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/docdash?retryWrites=true&w=majority

JWT_SECRET=replace_with_a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d
```

> **Tip:** Generate a strong `JWT_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### Pointing at MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Add your IP to the Network Access allowlist (or allow `0.0.0.0/0` for development)
3. Create a database user with read/write access
4. Copy the connection string from **Connect → Drivers**, replace `<password>` with your user's password, and set it as `MONGODB_URI` in `backend/.env`

---

## Running Locally

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5000` so you never need to configure CORS manually during development.

---

## Architecture Overview

```
Browser
  │  React SPA (Vite)
  │  ┌─ AuthContext  (JWT in memory + localStorage)
  │  ├─ ToastContext (global error notifications)
  │  ├─ lib/api.js   (all fetch calls, one module)
  │  └─ pages/       (role-split views per page)
  │
  │  /api/* (proxied by Vite in dev; routed by nginx/reverse proxy in prod)
  │
Express server (Node.js)
  │  Middleware chain:
  │    cors → json → authenticate → authorize → route handler → errorHandler
  │
  ├─ /api/auth          Auth (register, login, /me)
  ├─ /api/doctors        Doctor profiles
  ├─ /api/patients       Patient profiles
  ├─ /api/appointments   Appointment CRUD + scheduling conflict check
  ├─ /api/records        Medical records (audit-logged via withAudit)
  └─ /api/analytics      Aggregation pipeline (DOCTOR + ADMIN)
  │
MongoDB (Mongoose)
  ├─ User               Base document — email, password hash, role
  ├─ DoctorProfile       Linked 1-to-1 with User (role = DOCTOR)
  ├─ PatientProfile      Linked 1-to-1 with User (role = PATIENT)
  ├─ Appointment         doctor ref, patient ref, scheduledAt, status, …
  ├─ MedicalRecord       patient ref, doctor ref, diagnosis, isArchived, …
  └─ AuditLog            Immutable log of every record read/write/archive
```

### Key design decisions

| Decision | Rationale |
|---|---|
| ES Modules end-to-end | Consistent `import`/`export` syntax in both backend and frontend |
| Zod validation on every write route | Schema errors are returned as structured `issues[]` arrays, not raw Mongoose messages |
| Services separated from routes | `appointmentService.js`, `medicalRecordService.js` contain all business rules and can be unit-tested without Express |
| `withAudit` wrapper | Forces audit logging on every `MedicalRecord` write — the handler cannot accidentally skip it |
| JWT in memory + localStorage | Token survives page refresh without a full re-login, but is cleared on logout |

---

## Access-Control Model for Medical Records

Medical records enforce a strict, role-based access policy enforced in `medicalRecordService.js` and applied by every route handler in `recordRoutes.js`:

| Action | PATIENT | DOCTOR |
|--------|---------|--------|
| **Create** record | ✗ Never | ✓ Only if a SCHEDULED or COMPLETED appointment with the patient exists |
| **Read** record | ✓ Own records only | ✓ Only records they authored |
| **Update** (prescription, notes) | ✗ Never | ✓ Only records they authored |
| **Archive** (soft-delete) | ✗ Never | ✓ Only records they authored |
| **Hard delete** | ✗ Never | ✗ Never (preserves audit trail) |

**Key rules:**

- A patient can never see another patient's records.
- A doctor can never see records authored by a different doctor, even for shared patients.
- `isArchived: true` hides a record from normal listing but it remains in the database for audit purposes. The `AuditLog` collection captures every read, write, and archive with the acting user's ID and timestamp.
- `diagnosis` is immutable after creation — the update endpoint rejects changes to it.

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `NODE_ENV` | `development` | `production` suppresses stack traces in logs |
| `MONGODB_URI` | `mongodb://localhost:27017/docdash` | MongoDB connection string |
| `JWT_SECRET` | — | **Required.** Minimum 32 characters. Used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime — any value accepted by `jsonwebtoken` (e.g. `1d`, `12h`) |
