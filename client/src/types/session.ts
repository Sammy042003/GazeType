// A saved session as the BACKEND returns it (GET /api/sessions/me). Note
// `completedAt` is a string here, not a Date: JSON has no Date type, so the API
// sends an ISO timestamp string like "2026-05-30T08:20:13.621Z".
export interface Session {
  id: string
  wpm: number
  accuracy: number
  gazePenalties: number
  duration: number // seconds
  textSnippet: string
  completedAt: string
}

// What the client SENDS to save a session (POST /api/sessions). It's `Session`
// minus the server-generated fields (id, completedAt) — the backend fills those
// in. This matches the backend's zod sessionSchema exactly.
export interface SessionPayload {
  wpm: number
  accuracy: number
  gazePenalties: number
  duration: number
  textSnippet: string
}
