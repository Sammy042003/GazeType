import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// One configured axios instance the whole app imports. baseURL '/api' means we
// write api.post('/auth/login') and it hits '/api/auth/login' — which Vite's dev
// proxy forwards to the backend on :5000 (and in production points at the
// deployed API).
// In DEV, '/api' is proxied to the backend by Vite (vite.config.ts). In
// PRODUCTION there's no proxy, so set VITE_API_URL to the deployed backend URL
// INCLUDING the /api suffix, e.g. https://your-api.up.railway.app/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// REQUEST interceptor: runs just before EVERY request leaves the browser.
// We pull the current token straight from the store (getState() reads it outside
// of React — interceptors aren't components) and attach it as a Bearer header.
// This is why no component ever has to remember to send the token manually.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// RESPONSE interceptor: runs on every response. If the server ever says 401
// (token missing/expired/invalid — exactly what our authMiddleware returns), we
// auto-logout so the UI falls back to the login screen instead of showing a
// broken authenticated view.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api
