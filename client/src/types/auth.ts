// The safe public view of a user — exactly what the backend returns (never the
// passwordHash). Stored in the Zustand auth store and shown in the navbar.
export interface User {
  id: string
  email: string
  username: string
}

// The response shape of BOTH /api/auth/register and /api/auth/login.
export interface AuthResponse {
  token: string
  user: User
}

// Request body for logging in.
export interface LoginPayload {
  email: string
  password: string
}

// Request body for registering. Same as LoginPayload plus a username.
export interface RegisterPayload {
  email: string
  username: string
  password: string
}
