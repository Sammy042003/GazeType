import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Top navigation bar. Shown on Home and Dashboard (the Game screen stays
// immersive). Adapts to auth state: logged-in users get nav + logout, logged-out
// users get login/sign-up.
export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
      <Link to="/" className="text-xl font-bold text-[var(--text)]">
        Gaze<span className="text-[var(--accent)]">Type</span>
      </Link>

      <div className="flex items-center gap-4 text-sm">
        {token ? (
          <>
            <Link to="/game" className="text-[var(--muted)] hover:text-[var(--text)]">
              Type
            </Link>
            <Link to="/dashboard" className="text-[var(--muted)] hover:text-[var(--text)]">
              Progress
            </Link>
            <span className="hidden text-[var(--muted)] sm:inline">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[var(--text)] hover:bg-[var(--hover)]"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-[var(--muted)] hover:text-[var(--text)]">
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-semibold text-[var(--bg)] hover:bg-[var(--accent-hover)]"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
