import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'

// Code-split the heavy pages so they don't bloat the initial bundle:
//   - Game pulls in MediaPipe (large WASM-backed library)
//   - Dashboard pulls in Recharts
// They load on demand when you navigate to them.
const Game = lazy(() => import('./pages/Game'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">Loading…</div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — wrapped so a missing token redirects to /login */}
          <Route
            path="/game"
            element={
              <ProtectedRoute>
                <Game />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Anything unmatched goes home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
