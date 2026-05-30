import { useLayoutEffect, useRef, useState } from 'react'
import type { CharState } from '../hooks/useTypingGame'

interface TypingAreaProps {
  text: string
  currentIndex: number // the next character to type (caret sits here)
  charStates: CharState[] // verdict for each already-typed character
}

// Renders the snippet character-by-character with a smoothly-animated caret.
//   typed correctly  -> green
//   typed wrong       -> red + underline (so wrong SPACES are visible too)
//   not yet typed     -> dim
// Typing itself is captured on `window` by useTypingGame — this only displays.
export default function TypingArea({ text, currentIndex, charStates }: TypingAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // One ref slot per character span, so we can measure where the caret should go.
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [caret, setCaret] = useState({ left: 0, top: 0, height: 0 })

  // After every render that changes the cursor, measure the target character's
  // pixel position and move the caret there. CSS transition does the gliding.
  // useLayoutEffect (not useEffect) runs before paint, so the caret never flickers.
  useLayoutEffect(() => {
    if (!containerRef.current) return
    if (currentIndex < text.length) {
      // Caret sits at the LEFT edge of the next character to type.
      const el = charRefs.current[currentIndex]
      if (el) setCaret({ left: el.offsetLeft, top: el.offsetTop, height: el.offsetHeight })
    } else {
      // Finished: park the caret just past the last character.
      const last = charRefs.current[text.length - 1]
      if (last) {
        setCaret({
          left: last.offsetLeft + last.offsetWidth,
          top: last.offsetTop,
          height: last.offsetHeight,
        })
      }
    }
  }, [currentIndex, text])

  return (
    <div
      ref={containerRef}
      className="relative mx-auto max-w-3xl select-none font-mono text-2xl leading-relaxed tracking-wide"
    >
      {/* The gliding caret — a thin bar that transitions between positions. */}
      <span
        className="pointer-events-none absolute w-0.5 rounded-full bg-[var(--accent)] transition-all duration-100 ease-linear"
        style={{ left: caret.left, top: caret.top, height: caret.height || '1.5em' }}
      />

      {text.split('').map((char, i) => {
        let cls = 'text-[var(--muted)]' // not yet typed (muted)
        if (i < currentIndex) {
          cls =
            charStates[i] === 'correct'
              ? 'text-[var(--text)]' // typed correctly -> bright off-white
              : 'text-[var(--error)] underline decoration-[var(--error)]' // wrong -> red
        }
        return (
          <span
            key={i}
            ref={(el) => {
              charRefs.current[i] = el
            }}
            className={cls}
          >
            {char}
          </span>
        )
      })}
    </div>
  )
}
