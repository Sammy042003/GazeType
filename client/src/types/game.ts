// The four legal phases of a typing game. A union type again: the game is
// always in EXACTLY one of these. The reducer/hook logic switches on this, and
// TypeScript guarantees we handle the real values (no typos like 'runing').
export type GameStatus = 'idle' | 'running' | 'paused' | 'finished'

// The complete live state of one game attempt. The useTypingGame hook (Step 16)
// owns and updates this every keypress / timer tick.
export interface GameState {
  status: GameStatus
  wpm: number // words per minute, computed live
  accuracy: number // percentage 0-100
  timeElapsed: number // seconds the timer has counted (frozen during penalties)
  currentIndex: number // index of the next character the user must type
  correctCount: number // characters typed correctly
  errorCount: number // wrong keystrokes
  penalties: number // gaze penalties accrued this game
}
