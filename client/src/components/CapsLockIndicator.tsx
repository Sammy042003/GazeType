import { useEffect, useState } from 'react'

// Shows a badge whenever Caps Lock is ON. We can't query Caps Lock state
// directly, but every key event carries it via getModifierState('CapsLock'),
// so we read it on each keydown/keyup.
export default function CapsLockIndicator() {
  const [on, setOn] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === 'function') {
        setOn(e.getModifierState('CapsLock'))
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keyup', handler)
    }
  }, [])

  if (!on) return null

  return (
    <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-[var(--accent)] bg-[var(--surface)] px-4 py-1.5 text-sm font-semibold text-[var(--accent)] shadow-lg">
      ⇪ Caps Lock is on
    </div>
  )
}
