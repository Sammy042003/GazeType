import { Router } from 'express'
import { register, login } from '../controllers/authController'

// A Router is a mini, mountable app. We'll attach this whole group under the
// "/api/auth" prefix in index.ts, so these become /api/auth/register etc.
const router = Router()

// No requireAuth here — you obviously can't be logged in while registering or
// logging in. These are the only public, token-free endpoints.
router.post('/register', register)
router.post('/login', login)

export default router
