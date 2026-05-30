import { Router } from 'express'
import { createSession, getMySessions } from '../controllers/sessionController'
import { requireAuth } from '../middleware/authMiddleware'

// Mounted under "/api/sessions" in index.ts.
const router = Router()

// requireAuth sits BETWEEN the path and the handler. Express runs middleware
// left-to-right: requireAuth verifies the token (and sets req.user) first; only
// if it calls next() does the controller run. If the token is bad, requireAuth
// sends a 401 and the controller is never reached.
router.post('/', requireAuth, createSession) // POST /api/sessions
router.get('/me', requireAuth, getMySessions) // GET  /api/sessions/me

export default router
