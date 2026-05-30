# Deploying GazeType

Architecture:

- **Frontend** (`client/`, React + Vite) → **Vercel**
- **Backend** (`server/`, Express + Prisma) + **PostgreSQL** → **Railway**

You'll need free accounts on **GitHub**, **Railway**, and **Vercel**.

---

## 1. Push to GitHub

Create a new **empty** repo on github.com (no README/.gitignore). Then locally,
from the project root:

```bash
git add .
git commit -m "GazeType: initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

> `.env` files and `node_modules/` are gitignored — only `.env.example` is committed.

---

## 2. Backend + database on Railway

1. **railway.app → New Project → Deploy from GitHub repo** → pick your repo.
2. Open the created service → **Settings → Root Directory** → set to `server`.
3. **New → Database → PostgreSQL** (adds a Postgres service to the project).
4. Open the **backend** service → **Variables**, add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference the Postgres service)
   - `JWT_SECRET` = a long random string
   - `CLIENT_URL` = leave blank for now (fill in after step 3)
   - (`PORT` is provided by Railway automatically — our code reads `process.env.PORT`.)
5. Railway will install, run `npm run build` (`prisma generate && tsc`), then
   `npm start` (`prisma migrate deploy && node dist/index.js`) — which creates the
   `User`/`Session` tables on the fresh database automatically.
6. **Settings → Networking → Generate Domain.** Note the URL, e.g.
   `https://gazetype-server-production.up.railway.app`.

---

## 3. Frontend on Vercel

1. **vercel.com → Add New → Project** → import your GitHub repo.
2. **Root Directory** → `client`. Framework preset auto-detects **Vite**.
3. **Environment Variables**, add:
   - `VITE_API_URL` = `https://<your-railway-backend>/api` ← **must include `/api`**
4. **Deploy.** Note the URL, e.g. `https://gazetype.vercel.app`.

---

## 4. Connect them (CORS)

Back in Railway → backend **Variables**, set:

- `CLIENT_URL` = `https://<your-vercel-app>.vercel.app` (exact origin, no trailing slash)

Redeploy the backend. Its CORS will now allow your frontend.

---

## Notes & troubleshooting

- **Webcam needs HTTPS.** Vercel serves HTTPS by default, so the camera works on
  the deployed site (it would be blocked on plain HTTP).
- **CORS error in console** → `CLIENT_URL` must exactly match the Vercel origin.
- **API calls 404/blocked** → `VITE_API_URL` must include `/api` and point at Railway.
- **500 on requests** → check Railway logs; confirm `DATABASE_URL` is set and the
  start command ran `prisma migrate deploy`.
- **Re-deploys**: pushing to `main` auto-deploys both Vercel and Railway.
