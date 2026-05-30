import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar'

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
    </div>
  )
}

export default function Home() {
  const token = useAuthStore((s) => s.token)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <h1 className="text-6xl font-bold tracking-tight">
          Gaze<span className="text-[var(--accent)]">Type</span>
        </h1>
        <p className="max-w-xl text-lg text-[var(--muted)]">
          A typing trainer that watches your webcam and freezes the game the
          moment you glance down at your keyboard. Train your eyes to stay on
          screen, and watch your speed climb.
        </p>

        <div className="flex gap-3">
          {token ? (
            <Link
              to="/game"
              className="rounded-lg bg-[var(--accent)] px-6 py-3 text-lg font-semibold text-[var(--bg)] hover:bg-[var(--accent-hover)]"
            >
              Start typing
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="rounded-lg bg-[var(--accent)] px-6 py-3 text-lg font-semibold text-[var(--bg)] hover:bg-[var(--accent-hover)]"
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="rounded-lg border border-[var(--border)] px-6 py-3 text-lg font-semibold text-[var(--text)] hover:bg-[var(--hover)]"
              >
                Log in
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 grid max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <Feature title="Webcam gaze detection" desc="Head tilt + iris tracking via MediaPipe, right in your browser." />
          <Feature title="On-screen keyboard" desc="A glance-free reference that keeps your eyes where they belong." />
          <Feature title="Progress charts" desc="Track your WPM and your look-down habit improving over time." />
        </div>
      </main>
    </div>
  )
}
