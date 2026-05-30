import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import api from '../api/axios'
import type { Session } from '../types/session'
import Navbar from '../components/Navbar'

// Theme colors for the charts. Recharts sets these as SVG attributes, where
// CSS var() doesn't resolve — so we use the literal hex values here.
const ACCENT = '#e2b714'
const ERROR = '#e0685c'
const GRID = '#4a443d'
const AXIS = '#8c8378'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Session[]>('/sessions/me')
      .then((res) => setSessions(res.data))
      .catch((err) => {
        setError(
          err instanceof AxiosError && err.response?.data?.error
            ? err.response.data.error
            : 'Could not load your sessions.'
        )
      })
  }, [])

  // --- Loading / error / empty states ---------------------------------------
  if (error) {
    return <Centered>{<p className="text-[var(--error)]">{error}</p>}</Centered>
  }
  if (!sessions) {
    return <Centered>{<p className="text-[var(--muted)]">Loading your progress…</p>}</Centered>
  }
  if (sessions.length === 0) {
    return (
      <Centered>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-[var(--text)]">No sessions yet</h1>
          <p className="mb-6 text-[var(--muted)]">Play a game and your stats will show up here.</p>
          <Link
            to="/game"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--bg)] hover:bg-[var(--accent-hover)]"
          >
            Start a session
          </Link>
        </div>
      </Centered>
    )
  }

  // --- Metrics ---------------------------------------------------------------
  const count = sessions.length
  const avgWpm = sessions.reduce((sum, s) => sum + s.wpm, 0) / count
  const bestWpm = Math.max(...sessions.map((s) => s.wpm))
  const avgAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / count
  const totalPenalties = sessions.reduce((sum, s) => sum + s.gazePenalties, 0)

  const metrics = [
    { label: 'Avg WPM', value: Math.round(avgWpm) },
    { label: 'Best WPM', value: Math.round(bestWpm) },
    { label: 'Avg accuracy', value: `${Math.round(avgAccuracy)}%` },
    { label: 'Total penalties', value: totalPenalties },
  ]

  // Charts read oldest -> newest (sessions arrive newest-first from the API).
  const chartData = [...sessions].reverse().map((s) => ({
    date: formatDate(s.completedAt),
    wpm: Math.round(s.wpm),
    penalties: s.gazePenalties,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--text)]">Your progress</h1>
        <Link
          to="/game"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--bg)] hover:bg-[var(--accent-hover)]"
        >
          New session
        </Link>
      </div>

      {/* Metric cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-center"
          >
            <div className="text-3xl font-bold tabular-nums text-[var(--accent)]">{m.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title="WPM over time">
          <LineChart data={chartData}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke={AXIS} tick={{ fill: AXIS, fontSize: 12 }} />
            <YAxis stroke={AXIS} tick={{ fill: AXIS, fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#34302c', border: `1px solid ${GRID}`, borderRadius: 8 }}
              labelStyle={{ color: '#8c8378' }}
              itemStyle={{ color: '#e9e2d5' }}
            />
            <Line type="monotone" dataKey="wpm" stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Gaze penalties per session">
          <BarChart data={chartData}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke={AXIS} tick={{ fill: AXIS, fontSize: 12 }} />
            <YAxis stroke={AXIS} tick={{ fill: AXIS, fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#34302c', border: `1px solid ${GRID}`, borderRadius: 8 }}
              labelStyle={{ color: '#8c8378' }}
              itemStyle={{ color: '#e9e2d5' }}
              cursor={{ fill: '#ffffff10' }}
            />
            <Bar dataKey="penalties" fill={ERROR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {/* Session history table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">WPM</th>
              <th className="px-4 py-3 font-medium">Accuracy</th>
              <th className="px-4 py-3 font-medium">Penalties</th>
              <th className="px-4 py-3 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-[var(--border)] text-[var(--text)]">
                <td className="px-4 py-3">{formatDate(s.completedAt)}</td>
                <td className="px-4 py-3 tabular-nums">{Math.round(s.wpm)}</td>
                <td className="px-4 py-3 tabular-nums">{Math.round(s.accuracy)}%</td>
                <td className="px-4 py-3 tabular-nums">{s.gazePenalties}</td>
                <td className="px-4 py-3 tabular-nums">{formatTime(s.duration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </main>
    </div>
  )
}

// Small layout helpers ------------------------------------------------------
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4">{children}</div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--muted)]">{title}</h2>
      {/* Numeric height (not "100%") so ResponsiveContainer doesn't depend on
          measuring a parent height — avoids the width(-1)/height(-1) thrash. */}
      <ResponsiveContainer width="100%" height={256} minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}
