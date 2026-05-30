interface GameHUDProps {
  wpm: number
  accuracy: number
  timeElapsed: number // seconds
  penalties: number
}

// Format raw seconds as m:ss (e.g. 75 -> "1:15").
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Live stats. Numbers are rounded for display only — the raw floats stay in the
// game state (and get sent to the backend with full precision).
export default function GameHUD({ wpm, accuracy, timeElapsed, penalties }: GameHUDProps) {
  const stats: { label: string; value: string | number; danger?: boolean }[] = [
    { label: 'WPM', value: Math.round(wpm) },
    { label: 'Accuracy', value: `${Math.round(accuracy)}%` },
    { label: 'Time', value: formatTime(timeElapsed) },
    { label: 'Gaze penalties', value: penalties, danger: penalties > 0 },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="min-w-[110px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-center"
        >
          <div
            className={`text-3xl font-bold tabular-nums ${
              s.danger ? 'text-[var(--error)]' : 'text-[var(--accent)]'
            }`}
          >
            {s.value}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
