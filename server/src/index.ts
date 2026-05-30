// 1) Load .env into process.env BEFORE anything else runs. Because ES `import`
//    statements execute top-to-bottom, putting this first guarantees env vars
//    (DATABASE_URL, JWT_SECRET, ...) exist before any other module reads them.
import 'dotenv/config'

// 2) Patches Express so that errors thrown inside ASYNC route handlers are
//    forwarded to our error-handling middleware instead of crashing the process
//    or hanging the request. Must be imported before the routes that rely on it.
import 'express-async-errors'

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'

import authRoutes from './routes/auth'
import sessionRoutes from './routes/sessions'

const app = express()

// --- Global middleware (runs on EVERY request, in this order) ---------------

// helmet sets a batch of secure HTTP response headers (e.g. X-Content-Type-
// Options, disables X-Powered-By) to reduce common attack surface. Free win.
app.use(helmet())

// CORS = Cross-Origin Resource Sharing. The browser blocks the frontend (port
// 5173) from calling this API (port 5000) unless the API explicitly allows that
// origin. In dev Vite proxies /api so this rarely fires, but in production
// (Vercel -> Railway) it's essential.
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  })
)

// Parses incoming JSON request bodies and puts the result on req.body. Without
// this, req.body would be undefined and zod would reject everything.
app.use(express.json())

// --- Routes -----------------------------------------------------------------

// A tiny liveness check — handy to confirm the server is up without auth/db.
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)

// --- Fallbacks (must come AFTER all real routes) ----------------------------

// Anything that didn't match a route above => 404.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler. Express identifies it as an error handler ONLY because
// it has exactly 4 parameters (err, req, res, next) — the signature is the
// signal. express-async-errors routes thrown async errors here.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err)
  res.status(500).json({ error: 'Internal server error' })
})

// --- Start ------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 5000
app.listen(PORT, () => {
  console.log(`🚀 GazeType API running on http://localhost:${PORT}`)
})
