import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthTokenPayload } from '../types'

// Express middleware: it either lets the request continue (by calling `next()`)
// or ends it early by sending a response. The return type is `void` because a
// middleware's job is side effects, not returning a value.
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization

  // Convention: "Authorization: Bearer <token>". Reject anything that isn't.
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' })
    return // stop here — do NOT call next(), so the route never runs
  }

  // Strip the "Bearer " prefix to get the raw token string.
  const token = header.slice('Bearer '.length)

  const secret = process.env.JWT_SECRET
  if (!secret) {
    // A server-config problem, not the client's fault → 500, not 401.
    res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set' })
    return
  }

  try {
    // jwt.verify checks the signature AND the expiry. If either fails it THROWS.
    // Its return type is `string | JwtPayload`, so we assert our known shape.
    const payload = jwt.verify(token, secret) as AuthTokenPayload

    // Hand the identity to downstream handlers via the field we declared in types/.
    req.user = payload
    next() // success — pass control to the actual route handler
  } catch {
    // Bad signature, tampering, or expired token all land here.
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
