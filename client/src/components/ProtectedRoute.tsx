import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../store/authStore'

// A wrapper component. You put a protected page inside it:
//   <ProtectedRoute><Game /></ProtectedRoute>
// If there's no token, it renders a redirect to /login instead of the children.
//
// `ReactNode` is the type for "anything React can render" (elements, strings,
// arrays, null...). It's the correct type for a `children` prop.
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)

  if (!token) {
    // `replace` swaps the current history entry instead of pushing a new one, so
    // the browser Back button won't bounce the user back to the protected page.
    return <Navigate to="/login" replace />
  }

  // A fragment (<>...</>) lets us return children without adding a wrapper div.
  return <>{children}</>
}
