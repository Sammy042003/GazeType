import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types/auth'

// The shape of our global auth state + the actions that change it.
interface AuthState {
  user: User | null // null = logged out
  token: string | null // the JWT, or null
  setAuth: (token: string, user: User) => void // called after login/register
  logout: () => void
}

// `create<AuthState>()( ... )` builds the store. The empty `()` after the type
// argument is the curried form zustand requires when you wrap the store in
// middleware (here, `persist`) and want full TypeScript inference.
export const useAuthStore = create<AuthState>()(
  // `persist` automatically saves the state to localStorage and rehydrates it on
  // page load — so a refresh doesn't log you out. This is the prompt's "store JWT
  // in localStorage", handled for us.
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'gazetype-auth', // the localStorage key the JSON blob is saved under
    }
  )
)
