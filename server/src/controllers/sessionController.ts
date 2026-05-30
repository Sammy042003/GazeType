import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// Shape of a finished game the client sends us. Mirrors the frontend's
// SessionPayload type (Step 9). Notably it does NOT include userId — we take
// that from the verified token, never from the request body (a client must not
// be able to save sessions onto someone else's account).
const sessionSchema = z.object({
  wpm: z.number().min(0),
  accuracy: z.number().min(0).max(100),
  gazePenalties: z.number().int().min(0),
  duration: z.number().int().min(0),
  textSnippet: z.string().min(1),
})

// ---------------------------------------------------------------------------
// POST /api/sessions   (protected — requireAuth runs first)
// ---------------------------------------------------------------------------
export async function createSession(req: Request, res: Response): Promise<void> {
  // requireAuth guarantees req.user is set, but TypeScript only knows the type
  // as `AuthTokenPayload | undefined`, so we still narrow it. Defensive + typed.
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const parsed = sessionSchema.safeParse(req.body)
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

  const session = await prisma.session.create({
    data: {
      ...parsed.data, // wpm, accuracy, gazePenalties, duration, textSnippet
      userId: req.user.userId, // ownership comes from the token, not the body
    },
  })

  res.status(201).json(session)
}

// ---------------------------------------------------------------------------
// GET /api/sessions/me   (protected)
// ---------------------------------------------------------------------------
export async function getMySessions(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const sessions = await prisma.session.findMany({
    where: { userId: req.user.userId }, // only THIS user's rows
    orderBy: { completedAt: 'desc' }, // newest first — ready for the dashboard
  })

  res.status(200).json(sessions)
}
