import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthTokenPayload } from '../types'

// ---------------------------------------------------------------------------
// Validation schemas (zod) — these describe what a VALID request body looks
// like at RUNTIME. TypeScript types vanish after compilation, so they can't
// guard against bad data arriving over the network. zod fills that gap.
// ---------------------------------------------------------------------------
const registerSchema = z.object({
  email: z.email(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required'),
})

// ---------------------------------------------------------------------------
// Helper: create a signed JWT carrying the user's identity.
// ---------------------------------------------------------------------------
function signToken(payload: AuthTokenPayload): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // Thrown errors bubble up to the global error handler (set up in index.ts).
    throw new Error('JWT_SECRET is not set')
  }
  // expiresIn '7d' => token stops being valid after 7 days; the client must
  // log in again to get a fresh one.
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export async function register(req: Request, res: Response): Promise<void> {
  // safeParse never throws — it returns a discriminated union: either
  // { success: true, data } or { success: false, error }.
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    })
    return
  }

  // `parsed.data` is fully typed as { email: string; username: string; password: string }
  // — inferred from the schema. No manual interface needed.
  const { email, username, password } = parsed.data

  // Reject duplicates up front so we return a friendly 409 instead of a raw
  // database unique-constraint crash.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (existing) {
    res.status(409).json({ error: 'Email or username is already taken' })
    return
  }

  // Hash with a cost factor of 10. bcrypt is deliberately slow + salted, so
  // even if the DB leaks, raw passwords aren't recoverable.
  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, username, passwordHash },
  })

  const token = signToken({ userId: user.id, email: user.email })

  // 201 Created. Return only safe fields — NEVER send passwordHash to the client.
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, username: user.username },
  })
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    })
    return
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })

  // Use the SAME error for "no such email" and "wrong password" on purpose:
  // revealing which one is correct lets attackers enumerate valid accounts.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = signToken({ userId: user.id, email: user.email })

  res.status(200).json({
    token,
    user: { id: user.id, email: user.email, username: user.username },
  })
}
