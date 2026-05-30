// WPM uses the universal typing convention: 1 "word" = 5 characters (including
// spaces). So 50 correct chars = 10 words.
export function computeWpm(correctChars: number, secondsElapsed: number): number {
  if (secondsElapsed <= 0) return 0 // avoid divide-by-zero before the timer ticks
  const words = correctChars / 5
  const minutes = secondsElapsed / 60
  return words / minutes
}

// Accuracy = correct keystrokes as a percentage of all keystrokes.
export function computeAccuracy(correctChars: number, errorChars: number): number {
  const total = correctChars + errorChars
  if (total === 0) return 100 // nothing typed yet => show a clean 100%
  return (correctChars / total) * 100
}
