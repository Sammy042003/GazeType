import { useEffect, useRef } from 'react'
import { useGazeDetection } from '../hooks/useGazeDetection'
import { DEFAULT_THRESHOLDS } from '../utils/gazeUtils'
import type { GazeThresholds } from '../utils/gazeUtils'
import type { GazeStatus } from '../types/gaze'

interface GazeDetectorProps {
  enabled: boolean
  thresholds?: GazeThresholds
  showDebug?: boolean
  // Callbacks let the parent (the Game page) react to gaze without re-rendering
  // every video frame. They're optional so GazeDetector also works standalone.
  onGazeStatusChange?: (status: GazeStatus) => void
  onPenaltyCountChange?: (count: number) => void
}

export default function GazeDetector({
  enabled,
  thresholds = DEFAULT_THRESHOLDS,
  showDebug = false,
  onGazeStatusChange,
  onPenaltyCountChange,
}: GazeDetectorProps) {
  // This ref is the bridge: the <video> element below fills it in, and the hook
  // reads from it to feed frames to MediaPipe.
  const videoRef = useRef<HTMLVideoElement>(null)

  const { gazeStatus, penaltyCount, ready, error, debug, resetRanges } = useGazeDetection(
    videoRef,
    { enabled, thresholds }
  )

  // Bubble changes up to the parent only when they actually change.
  useEffect(() => {
    onGazeStatusChange?.(gazeStatus)
  }, [gazeStatus, onGazeStatusChange])

  useEffect(() => {
    onPenaltyCountChange?.(penaltyCount)
  }, [penaltyCount, onPenaltyCountChange])

  // Border color mirrors the gaze status: green = good, red = looking down.
  const borderColor =
    gazeStatus === 'down'
      ? 'border-red-500'
      : gazeStatus === 'up'
        ? 'border-green-500'
        : 'border-gray-600'

  // Derived booleans purely for the tuning panel's color-coding.
  const headDown = debug.faceFound && debug.headPitchRatio < thresholds.headDownBelow
  const eyesDown = debug.faceFound && debug.irisRatio > thresholds.irisDownAbove

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Status badge — pulses red when you're looking down */}
      <div
        className={`px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg ${
          gazeStatus === 'down'
            ? 'bg-red-600 text-white animate-pulse'
            : gazeStatus === 'up'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-200'
        }`}
      >
        {gazeStatus === 'down'
          ? '⚠ Look up!'
          : gazeStatus === 'up'
            ? 'Eyes on screen ✓'
            : 'Finding face…'}
      </div>

      {/* Webcam picture-in-picture */}
      <div className={`relative w-64 rounded-xl overflow-hidden border-4 bg-black ${borderColor}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto"
          style={{ transform: 'scaleX(-1)' }} // mirror = natural selfie view (doesn't affect the math)
        />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-xs text-gray-300">
            Starting camera…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center bg-black/85 p-2 text-center text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Diagnostic + tuning panel — read these numbers while you look up vs. down */}
      {showDebug && (
        <div className="w-72 rounded-xl border border-gray-700 bg-gray-900/95 p-3 font-mono text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400">landmarks</span>
            <span className={debug.irisFound ? 'text-green-400' : 'text-red-400'}>
              {debug.landmarkCount} {debug.irisFound ? '(iris ✓)' : '(no iris!)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">face found</span>
            <span>{debug.faceFound ? 'yes' : 'no'}</span>
          </div>

          <div>
            <div className="flex justify-between">
              <span className="text-gray-400">headPitch</span>
              <span className={headDown ? 'text-red-400' : 'text-green-400'}>
                {debug.headPitchRatio.toFixed(3)} {headDown ? '↓' : ''}
              </span>
            </div>
            <div className="text-[10px] text-gray-500">
              range {debug.headMin.toFixed(3)} … {debug.headMax.toFixed(3)} · down if &lt;{' '}
              {thresholds.headDownBelow}
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <span className="text-gray-400">irisRatio</span>
              <span className={eyesDown ? 'text-red-400' : 'text-green-400'}>
                {debug.irisRatio.toFixed(3)} {eyesDown ? '↓' : ''}
              </span>
            </div>
            <div className="text-[10px] text-gray-500">
              range {debug.irisMin.toFixed(3)} … {debug.irisMax.toFixed(3)} · down if &gt;{' '}
              {thresholds.irisDownAbove}
            </div>
          </div>

          <div className="flex justify-between border-t border-gray-700 pt-1.5">
            <span className="text-gray-400">penalties</span>
            <span className="text-gray-100">{penaltyCount}</span>
          </div>

          <button
            onClick={resetRanges}
            className="w-full rounded-md bg-gray-700 hover:bg-gray-600 px-2 py-1 text-gray-100"
          >
            Reset ranges
          </button>
        </div>
      )}
    </div>
  )
}
