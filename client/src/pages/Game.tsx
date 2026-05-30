import { useEffect, useRef, useState } from 'react'
import type { GazeStatus } from '../types/gaze'
import { useTypingGame } from '../hooks/useTypingGame'
import { getNextSnippet } from '../utils/snippets'
import GazeDetector from '../components/GazeDetector'
import TypingArea from '../components/TypingArea'
import GameHUD from '../components/GameHUD'
import OnScreenKeyboard from '../components/OnScreenKeyboard'
import ResultsCard from '../components/ResultsCard'
import CapsLockIndicator from '../components/CapsLockIndicator'

// First N look-down episodes per game are "free" — they still freeze you, but
// don't cost a penalty and don't trigger the voice. The (N+1)th onward counts.
const GRACE_ALLOWANCE = 3

// Speak a short reminder via the browser's built-in speech synthesis. Allowed
// because it always follows the user's "Start" click (a gesture).
function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel() // stop any overlap
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.05
  window.speechSynthesis.speak(utterance)
}

export default function Game() {
  const [snippet, setSnippet] = useState(getNextSnippet)

  // Gaze state lifted up from GazeDetector via its callbacks, so we can feed it
  // into the typing game. `gazeActive` keeps the camera warm across games.
  const [gazeActive, setGazeActive] = useState(false)
  const [gazeStatus, setGazeStatus] = useState<GazeStatus>('unknown')
  const [penaltyCount, setPenaltyCount] = useState(0)
  // The gaze hook's penaltyCount only grows; we snapshot it at each game start so
  // each game's episodes count from zero (count - baseline).
  const [penaltyBaseline, setPenaltyBaseline] = useState(0)

  const isLookingDown = gazeStatus === 'down'

  // Look-down episodes this game, then penalties AFTER the grace allowance.
  const downEpisodes = Math.max(0, penaltyCount - penaltyBaseline)
  const gamePenalties = Math.max(0, downEpisodes - GRACE_ALLOWANCE)
  const graceLeft = Math.max(0, GRACE_ALLOWANCE - downEpisodes)

  const { state, start, reset } = useTypingGame({
    text: snippet,
    isLookingDown,
    gazePenalties: gamePenalties,
  })

  // Speak a reminder the moment a NEW look-down episode crosses the grace line.
  const prevEpisodesRef = useRef(0)
  useEffect(() => {
    if (downEpisodes > prevEpisodesRef.current && downEpisodes > GRACE_ALLOWANCE) {
      speak('Eyes up!')
    }
    prevEpisodesRef.current = downEpisodes
  }, [downEpisodes])

  function handleStart() {
    setGazeActive(true) // turn the camera on (permission prompt first time)
    setPenaltyBaseline(penaltyCount)
    start()
  }

  function handlePlayAgain() {
    const next = getNextSnippet() // next paragraph in the loop
    setSnippet(next)
    setPenaltyBaseline(penaltyCount)
    reset(next)
    start()
  }

  return (
    <div className="relative min-h-screen">
      {/* Caps Lock warning badge (top-center) whenever Caps Lock is on. */}
      <CapsLockIndicator />

      {/* The webcam + gaze engine. Mounted once the player starts, stays warm. */}
      {gazeActive && (
        <GazeDetector
          enabled
          onGazeStatusChange={setGazeStatus}
          onPenaltyCountChange={setPenaltyCount}
        />
      )}

      {/* Penalty flash: warm wash + warning while looking down mid-game */}
      {state.status === 'running' && isLookingDown && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center bg-[#e0685c26]">
          <span className="mt-24 animate-pulse text-3xl font-bold text-[var(--error)]">
            {graceLeft > 0 ? `⚠ Look up — ${graceLeft} free left` : '⚠ Look up at the screen'}
          </span>
        </div>
      )}

      {/* IDLE: start screen */}
      {state.status === 'idle' && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <h1 className="text-4xl font-bold">Ready to type?</h1>
          <p className="max-w-md text-[var(--muted)]">
            We'll watch your webcam and freeze the game whenever you glance down at
            your keyboard. Your first {GRACE_ALLOWANCE} glances are free — after
            that you'll get a spoken reminder and a penalty. Keep your eyes on the
            screen and let the on-screen keyboard guide your fingers.
          </p>
          <button
            onClick={handleStart}
            className="rounded-lg bg-[var(--accent)] px-6 py-3 text-lg font-semibold text-[var(--bg)] hover:bg-[var(--accent-hover)]"
          >
            Start (enables camera)
          </button>
        </div>
      )}

      {/* RUNNING: the live game */}
      {state.status === 'running' && (
        <div className="flex min-h-screen flex-col items-center px-4 py-6">
          <GameHUD
            wpm={state.wpm}
            accuracy={state.accuracy}
            timeElapsed={state.timeElapsed}
            penalties={state.penalties}
          />
          {/* Text + keyboard grouped in the vertical center, so your eyes stay
              near the middle of the screen instead of dropping to the bottom. */}
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-10">
            <TypingArea
              text={state.text}
              currentIndex={state.currentIndex}
              charStates={state.charStates}
            />
            <OnScreenKeyboard />
          </div>
        </div>
      )}

      {/* FINISHED: results + save */}
      {state.status === 'finished' && (
        <div className="flex min-h-screen items-center justify-center px-4">
          <ResultsCard
            wpm={state.wpm}
            accuracy={state.accuracy}
            durationSeconds={state.timeElapsed}
            gazePenalties={state.penalties}
            textSnippet={state.text}
            onPlayAgain={handlePlayAgain}
          />
        </div>
      )}
    </div>
  )
}
