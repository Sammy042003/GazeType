import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { GameState } from '../types/game'
import { computeWpm, computeAccuracy } from '../utils/wpmUtils'

// Per-character verdict for everything typed so far.
export type CharState = 'correct' | 'incorrect'

// Internal state = the shared GameState plus the text being typed and the
// per-character status array (length === currentIndex). Monkeytype-style: the
// cursor ALWAYS advances; wrong characters are recorded as 'incorrect' (shown
// red) rather than blocking progress.
interface InternalState extends GameState {
  text: string
  charStates: CharState[]
}

type Action =
  | { type: 'LOAD'; text?: string } // load a snippet, go idle
  | { type: 'START' } // begin a fresh run
  | { type: 'TYPE'; char: string } // a single typed character
  | { type: 'BACKSPACE' } // delete the last character
  | { type: 'TICK' } // one second elapsed
  | { type: 'SET_PENALTIES'; count: number } // mirror gaze penalty count

function createInitialState(text: string): InternalState {
  return {
    text,
    status: 'idle',
    wpm: 0,
    accuracy: 100,
    timeElapsed: 0,
    currentIndex: 0,
    correctCount: 0,
    errorCount: 0,
    penalties: 0,
    charStates: [],
  }
}

// Recompute correct/error counts from the per-char array, then wpm/accuracy.
// Deriving from charStates keeps everything consistent through backspaces.
function withDerived(state: InternalState): InternalState {
  const correctCount = state.charStates.filter((c) => c === 'correct').length
  const errorCount = state.charStates.length - correctCount
  return {
    ...state,
    correctCount,
    errorCount,
    wpm: computeWpm(correctCount, state.timeElapsed),
    accuracy: computeAccuracy(correctCount, errorCount),
  }
}

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'LOAD':
      return createInitialState(action.text ?? state.text)

    case 'START':
      return { ...createInitialState(state.text), status: 'running' }

    case 'TICK':
      if (state.status !== 'running') return state
      return withDerived({ ...state, timeElapsed: state.timeElapsed + 1 })

    case 'TYPE': {
      if (state.status !== 'running') return state
      if (state.currentIndex >= state.text.length) return state

      const expected = state.text[state.currentIndex]
      const verdict: CharState = action.char === expected ? 'correct' : 'incorrect'
      const charStates = [...state.charStates, verdict]
      const currentIndex = state.currentIndex + 1
      const finished = currentIndex >= state.text.length

      return withDerived({
        ...state,
        charStates,
        currentIndex,
        status: finished ? 'finished' : 'running',
      })
    }

    case 'BACKSPACE': {
      if (state.status !== 'running') return state
      if (state.currentIndex === 0) return state
      return withDerived({
        ...state,
        charStates: state.charStates.slice(0, -1), // drop the last verdict
        currentIndex: state.currentIndex - 1,
      })
    }

    case 'SET_PENALTIES':
      return { ...state, penalties: action.count }

    default:
      return state
  }
}

interface UseTypingGameOptions {
  text: string
  isLookingDown: boolean
  gazePenalties: number
}

interface UseTypingGameResult {
  state: InternalState
  start: () => void
  reset: (newText?: string) => void
}

export function useTypingGame({
  text,
  isLookingDown,
  gazePenalties,
}: UseTypingGameOptions): UseTypingGameResult {
  const [state, dispatch] = useReducer(reducer, text, createInitialState)

  const isLookingDownRef = useRef(isLookingDown)
  isLookingDownRef.current = isLookingDown

  const start = useCallback(() => dispatch({ type: 'START' }), [])
  const reset = useCallback((newText?: string) => dispatch({ type: 'LOAD', text: newText }), [])

  // Mirror the gaze hook's penalty count into game state.
  useEffect(() => {
    dispatch({ type: 'SET_PENALTIES', count: gazePenalties })
  }, [gazePenalties])

  // The 1-second timer. Freezes (skips ticks) while looking down.
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => {
      if (!isLookingDownRef.current) dispatch({ type: 'TICK' })
    }, 1000)
    return () => clearInterval(id)
  }, [state.status])

  // Capture typing globally while running. Ignored while looking down (freeze).
  useEffect(() => {
    if (state.status !== 'running') return

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return // don't swallow shortcuts
      if (isLookingDownRef.current) return // FROZEN while eyes are down

      if (e.key === 'Backspace') {
        e.preventDefault()
        dispatch({ type: 'BACKSPACE' })
        return
      }
      if (e.key.length !== 1) return // ignore Shift, Enter, arrows…
      e.preventDefault() // stop Space from scrolling the page
      dispatch({ type: 'TYPE', char: e.key })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.status])

  return { state, start, reset }
}
