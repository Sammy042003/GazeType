import { PrismaClient } from '@prisma/client'

// `globalThis` is the one object that survives module reloads. We cast it to a
// type that *may* hold a `prisma` property so TypeScript lets us read/write it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Reuse the existing client if one was already created; otherwise make one.
// `??` is the nullish-coalescing operator: "left side unless it's null/undefined".
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['warn', 'error'] })

// In development, stash the instance on globalThis so the next hot-reload reuses
// it instead of opening a brand-new connection pool. We skip this in production,
// where the process starts exactly once.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
