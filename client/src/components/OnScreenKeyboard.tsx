import { useEffect, useState } from 'react'

// Each key has a display label and the `code` we match against
// KeyboardEvent.key (lowercased). Special keys also carry width/size classes.
interface KeyDef {
  label: string
  code: string
  className?: string // overrides the default key width/size
}

// Helper for plain character keys: label is uppercase, code is the char itself.
const k = (c: string): KeyDef => ({ label: c.toUpperCase(), code: c })

const numberRow = '`1234567890-='.split('').map(k)
const topRow = 'qwertyuiop[]\\'.split('').map(k)
const homeRow = "asdfghjkl;'".split('').map(k)
const bottomRow = 'zxcvbnm,./'.split('').map(k)

const WIDE = 'flex-1 min-w-[3.5rem] text-xs'

// The full keyboard, row by row, with the modifier/function keys included.
const ROWS: KeyDef[][] = [
  [...numberRow, { label: 'Backspace', code: 'backspace', className: WIDE }],
  [{ label: 'Tab', code: 'tab', className: 'w-14 text-xs' }, ...topRow],
  [
    { label: 'Caps', code: 'capslock', className: 'w-16 text-xs' },
    ...homeRow,
    { label: 'Enter', code: 'enter', className: WIDE },
  ],
  [
    { label: 'Shift', code: 'shift', className: 'w-20 text-xs' },
    ...bottomRow,
    { label: 'Shift', code: 'shift', className: WIDE },
  ],
  [
    { label: 'Ctrl', code: 'control', className: 'w-14 text-xs' },
    { label: 'Alt', code: 'alt', className: 'w-14 text-xs' },
    { label: 'Space', code: ' ', className: 'flex-1' },
    { label: 'Alt', code: 'alt', className: 'w-14 text-xs' },
    { label: 'Ctrl', code: 'control', className: 'w-14 text-xs' },
  ],
]

export default function OnScreenKeyboard() {
  // Keys currently held down (lowercased KeyboardEvent.key). A Set handles key
  // auto-repeat idempotently and supports chords (shift + letter).
  const [pressed, setPressed] = useState<Set<string>>(new Set())
  const [capsOn, setCapsOn] = useState(false)

  useEffect(() => {
    const readCaps = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === 'function') setCapsOn(e.getModifierState('CapsLock'))
    }
    const down = (e: KeyboardEvent) => {
      readCaps(e)
      setPressed((prev) => new Set(prev).add(e.key.toLowerCase()))
    }
    const up = (e: KeyboardEvent) => {
      readCaps(e)
      setPressed((prev) => {
        const next = new Set(prev)
        next.delete(e.key.toLowerCase())
        return next
      })
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-1.5 select-none">
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {row.map((key, keyIndex) => {
            const isPressed = pressed.has(key.code)
            // The Caps key stays lit the whole time Caps Lock is ON, not just
            // while it's being pressed.
            const capsActive = key.code === 'capslock' && capsOn
            const highlight = isPressed || capsActive
            const size = key.className ?? 'w-9 text-sm'

            return (
              <div
                key={`${rowIndex}-${keyIndex}`}
                className={[
                  'flex h-10 items-center justify-center rounded-md border font-mono transition-all',
                  size,
                  highlight
                    ? `border-transparent bg-[var(--accent)] text-[var(--bg)] ${isPressed ? 'scale-95' : ''}`
                    : 'border-transparent bg-[var(--surface)] text-[var(--muted)]', // flat, muted at rest
                ].join(' ')}
              >
                {key.label}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
