# GazeType 👀⌨️

A full-stack, TypeScript **typing trainer that uses your webcam to keep your eyes on the screen.** Most people kill their typing speed by glancing down at the keyboard. GazeType watches you through MediaPipe Face Mesh and, the moment you look down, **freezes the game**, flashes a warning, speaks a reminder, and logs a gaze penalty — training you to type heads-up.

**🔗 Live demo:** https://gaze-type-psi.vercel.app

> Built end-to-end with React + Vite, Express, Prisma, and PostgreSQL — all in TypeScript. Computer vision runs entirely in the browser; no video ever leaves your machine.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [System architecture](#system-architecture)
- [How gaze detection works](#how-gaze-detection-works)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local installation](#local-installation)
- [Environment variables](#environment-variables)
- [Running the app](#running-the-app)
- [npm scripts](#npm-scripts)
- [API reference](#api-reference)
- [Database schema](#database-schema)
- [Deployment](#deployment)
- [Notes & limitations](#notes--limitations)
- [License](#license)

---

## Features

- 🎥 **Webcam gaze detection** (MediaPipe Face Mesh, in-browser) using two independent signals:
  - **Head tilt** — neck-bend geometry from face landmarks.
  - **Eyes darting down** — iris position relative to the eye corners, even when the head stays still.
- ❄️ **Real-time penalty** — looking down freezes the timer and blocks typing until you look back up.
- 😌 **Blink immunity** — blinks are ignored via eye-openness + a time-based confirmation window, so natural blinking never costs you.
- 🪶 **Grace allowance + voice** — your first few glances are free; after that you get a spoken "Eyes up!" reminder.
- ⌨️ **On-screen keyboard** that highlights keys as you press them — a glance-free reference.
- ✍️ **Monkeytype-style typing** — per-character correct/incorrect coloring with a smooth animated caret.
- 📊 **Progress dashboard** — WPM-over-time and gaze-penalty charts (Recharts) + full session history.
- 🔐 **JWT authentication** — register/login with bcrypt-hashed passwords and zod-validated requests.
- 🎨 Warm, minimal, Monkeytype-inspired dark theme driven by CSS variables.

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v3, React Router v7, Zustand, Axios, Recharts, MediaPipe Face Mesh |
| **Backend** | Node.js, Express 4, TypeScript, Prisma ORM, JSON Web Tokens, bcryptjs, zod, Helmet, CORS |
| **Database** | PostgreSQL |
| **Tooling** | Vite, tsx/nodemon, ESLint, Prettier, concurrently |
| **Hosting** | Vercel (frontend) · Railway (backend + PostgreSQL) |

---

## System architecture

GazeType is a monorepo with a React single-page app (`client/`) and a REST API (`server/`) backed by PostgreSQL. **All computer vision runs in the browser** — the webcam feed never touches the server. The backend only ever sees the numeric results of a session (WPM, accuracy, penalties, etc.).

```
                          Browser
  ┌─────────────────────────────────────────────────┐
  │  React + Vite SPA  (Vercel)                       │
  │                                                   │
  │  • MediaPipe Face Mesh — webcam → landmarks       │
  │  • Gaze math (head pitch + iris) → freeze/penalty │
  │  • Typing game · on-screen keyboard · HUD         │
  │  • Zustand (auth state, persisted to localStorage)│
  │  • Recharts dashboard                             │
  └───────────────────────┬───────────────────────────┘
                          │  HTTPS · Axios
                          │  Authorization: Bearer <JWT>
                          ▼
  ┌─────────────────────────────────────────────────┐
  │  Express REST API  (Railway)                      │
  │                                                   │
  │  helmet → cors → express.json                     │
  │  /api/auth      → zod validate → bcrypt → JWT     │
  │  /api/sessions  → requireAuth (verify JWT)        │
  │  Prisma Client                                    │
  └───────────────────────┬───────────────────────────┘
                          │  SQL (Prisma)
                          ▼
  ┌─────────────────────────────────────────────────┐
  │  PostgreSQL  (Railway)                             │
  │  tables: User, Session                             │
  └─────────────────────────────────────────────────┘
```

**Request flow (example — saving a finished game):**

1. The game ends in the browser; the `ResultsCard` component sends a `POST /api/sessions` with the stats.
2. Axios automatically attaches `Authorization: Bearer <token>` (a request interceptor reads the JWT from the Zustand store).
3. Express runs Helmet + CORS, parses JSON, then `requireAuth` verifies the JWT and attaches `req.user`.
4. The controller validates the body with **zod**, then Prisma inserts a `Session` row tied to the authenticated user.
5. The dashboard later calls `GET /api/sessions/me`, which returns only that user's sessions (newest first) for the charts and table.

In development, the Vite dev server proxies `/api` to the backend on port 5000, so the browser sees same-origin requests (no CORS). In production, the frontend calls the backend's public URL directly and the backend's CORS allowlist (`CLIENT_URL`) permits the Vercel origin.

---

## How gaze detection works

MediaPipe Face Mesh returns 468 face landmarks + 10 iris landmarks per frame (`refineLandmarks: true`), each as normalized `{ x, y }` coordinates (`y` increases downward). All math lives in [`client/src/utils/gazeUtils.ts`](client/src/utils/gazeUtils.ts).

- **Signal 1 — head tilted down:** the vertical distance from nose tip (1) to chin (152), divided by face width (distance between eye corners 33↔263). When you bend your neck to look down, the chin tucks in and this ratio **drops** → head is down. Dividing by face width makes it distance-independent.
- **Signal 2 — eyes down:** for each eye, how far the iris center (468 / 473) sits **below the line through the eye corners**, normalized by eye width. The corners are anchored to the skull and don't move when the eyelid droops, so this reliably detects downward gaze even with a still head.
- **Blink immunity:** eye openness (lid gap ÷ eye width) suppresses the iris signal while the eyes are closed, and the eye signal must hold continuously for **~450 ms** (far longer than a blink) before it counts. The head signal confirms in ~120 ms.
- **Grace + feedback:** the first `GRACE_ALLOWANCE` (default 3) glances are free; subsequent ones increment the penalty and trigger a spoken reminder (Web Speech API).

Thresholds (`headDownBelow`, `irisDownAbove`, `eyeClosedBelow`) are tunable constants in `gazeUtils.ts` and may need adjusting for a different camera/lighting setup.

---

## Project structure

```
gazetype/
├── package.json              # root — runs client + server together (concurrently)
├── DEPLOY.md                 # step-by-step deployment guide
├── client/                   # React + Vite + TypeScript frontend
│   ├── vite.config.ts        # MediaPipe optimizeDeps + /api dev proxy
│   ├── tailwind.config.js
│   ├── vercel.json           # SPA rewrites for client-side routing
│   └── src/
│       ├── api/axios.ts          # Axios instance + JWT interceptor
│       ├── store/authStore.ts    # Zustand auth state (persisted)
│       ├── hooks/                # useGazeDetection, useTypingGame
│       ├── utils/                # gazeUtils, wpmUtils, snippets
│       ├── components/           # GazeDetector, TypingArea, OnScreenKeyboard, …
│       ├── pages/                # Home, Login, Register, Game, Dashboard
│       └── types/                # shared interfaces (gaze, game, session, auth)
└── server/                   # Node + Express + TypeScript backend
    ├── prisma/schema.prisma      # User + Session models
    └── src/
        ├── index.ts              # Express entry (middleware, routes, error handler)
        ├── lib/prisma.ts         # Prisma client singleton
        ├── middleware/           # authMiddleware (JWT verification)
        ├── controllers/          # auth + session logic
        ├── routes/               # /api/auth, /api/sessions
        └── types/                # JWT payload, Express Request augmentation
```

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PostgreSQL** ≥ 14 (running locally)
- **Git**
- A **webcam** and a Chromium-based browser (Chrome/Edge/Brave) for the gaze feature.

---

## Local installation

### 1. Clone the repository

```bash
git clone https://github.com/Sammy042003/GazeType.git
cd GazeType
```

### 2. Create the PostgreSQL database

Create a dedicated role and database (you'll be prompted for your `postgres` password):

```bash
psql -U postgres -h localhost \
  -c "CREATE ROLE gazetype WITH LOGIN CREATEDB PASSWORD 'gazetype_dev_2026';" \
  -c "CREATE DATABASE gazetype OWNER gazetype;"
```

> `CREATEDB` is required so Prisma can create its temporary "shadow database" during `migrate dev`.

### 3. Set up the backend

```bash
cd server
npm install
cp .env.example .env        # then edit .env (see Environment variables below)
npm run db:migrate          # applies migrations + generates the Prisma client
cd ..
```

### 4. Set up the frontend

```bash
cd client
npm install
cd ..
```

### 5. Install the root launcher

```bash
npm install                 # installs `concurrently` at the root
```

---

## Environment variables

### Backend — `server/.env` (required)

| Variable | Required | Example | Description |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | `postgresql://gazetype:gazetype_dev_2026@localhost:5432/gazetype?schema=public` | PostgreSQL connection string (`postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`). |
| `JWT_SECRET` | ✅ | `a-long-random-string-change-me` | Secret used to sign and verify JWTs. Use a long random value in production. |
| `PORT` | ⬜ | `5000` | Port the API listens on. Defaults to `5000`. (On Railway this is provided automatically.) |
| `CLIENT_URL` | ✅ (prod) | `http://localhost:5173` | Allowed CORS origin (your frontend's URL). In production set it to the exact Vercel origin, **no trailing slash**. |

### Frontend — `client/.env` (optional; only for production builds)

| Variable | Required | Example | Description |
|---|:---:|---|---|
| `VITE_API_URL` | ⬜ (prod only) | `https://your-api.up.railway.app/api` | Base URL of the backend API **including `/api`**. **Leave unset for local development** — Vite proxies `/api` to `:5000` automatically. |

> Real `.env` files are gitignored; only `.env.example` files are committed.

---

## Running the app

From the **project root**, start both the client and the server together:

```bash
npm run dev
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:5000

Open http://localhost:5173, register an account, allow camera access, and start typing. (You can also run each side individually with `npm run dev --prefix client` / `npm run dev --prefix server`.)

---

## npm scripts

### Root

| Script | Description |
|---|---|
| `npm run dev` | Run client + server concurrently. |
| `npm run build` | Build both client and server for production. |

### `server/`

| Script | Description |
|---|---|
| `npm run dev` | Start the API with auto-reload (nodemon + tsx). |
| `npm run build` | `prisma generate && tsc` → compiles to `dist/`. |
| `npm start` | `prisma migrate deploy && node dist/index.js` (production). |
| `npm run db:migrate` | Create/apply a dev migration (`prisma migrate dev`). |
| `npm run db:studio` | Open Prisma Studio to inspect the database. |

### `client/`

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check + build to `dist/`. |
| `npm run preview` | Preview the production build locally. |

---

## API reference

Base path: `/api`. Protected routes require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Body | Response |
|---|---|:---:|---|---|
| `GET` | `/api/health` | — | — | `{ "status": "ok" }` |
| `POST` | `/api/auth/register` | — | `{ email, username, password }` | `{ token, user }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` | `{ token, user }` |
| `POST` | `/api/sessions` | ✅ | `{ wpm, accuracy, gazePenalties, duration, textSnippet }` | the saved `Session` |
| `GET` | `/api/sessions/me` | ✅ | — | `Session[]` (newest first) |

Validation errors return `400` with field-level details; bad/missing tokens return `401`.

---

## Database schema

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  username     String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  wpm           Float
  accuracy      Float
  gazePenalties Int
  duration      Int      // seconds
  textSnippet   String
  completedAt   DateTime @default(now())
}
```

---

## Deployment

The app is deployed with **Vercel** (frontend) and **Railway** (backend + PostgreSQL). See **[DEPLOY.md](DEPLOY.md)** for the complete step-by-step guide. In short:

1. Push to GitHub.
2. **Railway:** deploy `server/` (Root Directory = `server`) + a PostgreSQL plugin; set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`.
3. **Vercel:** deploy `client/` (Root Directory = `client`); set `VITE_API_URL` to the Railway API URL + `/api`.
4. Set Railway's `CLIENT_URL` to the Vercel origin (for CORS).

Pushing to `main` auto-redeploys both.

---

## Notes & limitations

- **Privacy:** the webcam stream is processed entirely in your browser; only numeric session stats are sent to the server.
- **HTTPS required for camera:** browsers only allow webcam access over HTTPS (or `localhost`). Vercel serves HTTPS, so the deployed site works.
- **Desktop-focused:** designed for a keyboard + webcam; not optimized for mobile.
- **Gaze tuning:** detection thresholds are calibrated constants and may need adjusting per camera/lighting.

---

## License

MIT
