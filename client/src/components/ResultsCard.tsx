import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import api from '../api/axios'
import type { SessionPayload } from '../types/session'

interface ResultsCardProps {
  wpm: number
  accuracy: number
  durationSeconds: number
  gazePenalties: number
  textSnippet: string
  onPlayAgain: () => void
}

type SaveState = 'saving' | 'saved' | 'error'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ResultsCard({
  wpm,
  accuracy,
  durationSeconds,
  gazePenalties,
  textSnippet,
  onPlayAgain,
}: ResultsCardProps) {
  const [saveState, setSaveState] = useState<SaveState>('saving')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Guard so we POST exactly once even though React StrictMode double-invokes
  // effects in dev. A ref persists across that double-invoke, so the second run
  // short-circuits. (A new game unmounts/remounts this card -> a fresh save.)
  const savedRef = useRef(false)

  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true

    const payload: SessionPayload = {
      wpm,
      accuracy,
      gazePenalties,
      duration: durationSeconds,
      textSnippet,
    }

    api
      .post('/sessions', payload)
      .then(() => setSaveState('saved'))
      .catch((err) => {
        setSaveState('error')
        setErrorMsg(
          err instanceof AxiosError && err.response?.data?.error
            ? err.response.data.error
            : 'Could not save your session.'
        )
      })
  }, [wpm, accuracy, gazePenalties, durationSeconds, textSnippet])

  const stats = [
    { label: 'WPM', value: Math.round(wpm) },
    { label: 'Accuracy', value: `${Math.round(accuracy)}%` },
    { label: 'Time', value: formatTime(durationSeconds) },
    { label: 'Gaze penalties', value: gazePenalties },
  ]

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-xl">
      <h2 className="text-2xl font-bold text-[var(--text)]">Session complete 🎉</h2>

      <div className="my-6 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <div className="text-3xl font-bold tabular-nums text-[var(--accent)]">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Save status */}
      <div className="mb-5 text-sm">
        {saveState === 'saving' && <span className="text-[var(--muted)]">Saving session…</span>}
        {saveState === 'saved' && <span className="text-[var(--accent)]">Saved to your history ✓</span>}
        {saveState === 'error' && <span className="text-[var(--error)]">{errorMsg}</span>}
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--bg)] hover:bg-[var(--accent-hover)]"
        >
          Play again
        </button>
        <Link
          to="/dashboard"
          className="rounded-lg border border-[var(--border)] px-5 py-2.5 font-semibold text-[var(--text)] hover:bg-[var(--hover)]"
        >
          View progress
        </Link>
      </div>
    </div>
  )
}
