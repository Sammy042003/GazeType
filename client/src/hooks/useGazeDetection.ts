import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
// @mediapipe/face_mesh is a Closure-compiled bundle that registers `window.FaceMesh`
// when it runs. We deliberately do NOT `import` it as a module: bundlers tree-shake
// a side-effect-only import out of the PRODUCTION build, leaving window.FaceMesh
// undefined once deployed (it only "works" in dev because Vite serves the module).
// Instead we inject the CDN <script> on demand (loadMediaPipeScript below), which
// behaves identically in dev and production and only downloads when a game starts.
// We keep a TYPE-ONLY import purely for TypeScript (erased at build time).
// (We also avoid @mediapipe/camera_utils — it retries getUserMedia in a tight loop
// on failure and can freeze the page — driving the webcam ourselves instead.)
import type { FaceMesh as FaceMeshInstance, Results } from '@mediapipe/face_mesh'
import type { GazeStatus } from '../types/gaze'
import { evaluateGaze, DEFAULT_THRESHOLDS } from '../utils/gazeUtils'
import type { GazeThresholds } from '../utils/gazeUtils'

// Describe the FaceMesh constructor the package attaches to window, so the rest
// of the file is fully typed even though we read it off the global.
type FaceMeshConstructor = new (config?: {
  locateFile?: (file: string) => string
}) => FaceMeshInstance

declare global {
  interface Window {
    FaceMesh?: FaceMeshConstructor
  }
}

interface UseGazeOptions {
  enabled: boolean // start/stop the webcam + detection
  thresholds?: GazeThresholds // tunable dials (defaults provided)
}

// How long each signal must hold CONTINUOUSLY before it counts as "looking
// down". The EYE window is deliberately longer than a blink (a blink is only
// ~100-300ms), so blinking can never be mistaken for looking down. A head tilt
// is a deliberate, sustained motion, so its window can be short.
const HEAD_CONFIRM_MS = 120
const EYE_CONFIRM_MS = 450

// Raw numbers exposed so the UI can show them while you tune/diagnose.
interface GazeDebug {
  headPitchRatio: number
  irisRatio: number
  faceFound: boolean
  landmarkCount: number // 478 when iris landmarks are present, 468 when not
  irisFound: boolean // landmarkCount >= 478
  headMin: number // running range of headPitchRatio since last reset
  headMax: number
  irisMin: number // running range of irisRatio since last reset
  irisMax: number
}

interface UseGazeResult {
  gazeStatus: GazeStatus // 'unknown' until a face is found, then 'up' | 'down'
  isLookingDown: boolean
  penaltyCount: number
  ready: boolean // true once the camera + model have started
  error: string | null
  debug: GazeDebug
  resetPenalties: () => void
  resetRanges: () => void // clear the min/max trackers (diagnostic button)
}

// MediaPipe loads its model + WASM files at runtime. The most reliable way in a
// Vite app is to point it at the matching files on a CDN (jsDelivr). This avoids
// fighting Vite's bundler over MediaPipe's .data/.wasm assets.
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'

// Load the MediaPipe Face Mesh script from the CDN once, on demand. It registers
// window.FaceMesh as a side effect. Resolves when window.FaceMesh is available.
function loadMediaPipeScript(): Promise<void> {
  if (window.FaceMesh) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mediapipe]')
    if (existing) {
      if (window.FaceMesh) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load MediaPipe')))
      return
    }
    const script = document.createElement('script')
    script.src = `${MEDIAPIPE_CDN}/face_mesh.js`
    script.crossOrigin = 'anonymous'
    script.dataset.mediapipe = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load MediaPipe'))
    document.head.appendChild(script)
  })
}

export function useGazeDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  { enabled, thresholds = DEFAULT_THRESHOLDS }: UseGazeOptions
): UseGazeResult {
  const [gazeStatus, setGazeStatus] = useState<GazeStatus>('unknown')
  const [isLookingDown, setIsLookingDown] = useState(false)
  const [penaltyCount, setPenaltyCount] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<GazeDebug>({
    headPitchRatio: 0,
    irisRatio: 0,
    faceFound: false,
    landmarkCount: 0,
    irisFound: false,
    headMin: 0,
    headMax: 0,
    irisMin: 0,
    irisMax: 0,
  })

  // --- Refs: mutable values the per-frame callback needs WITHOUT being a stale
  // closure. The onResults callback is created once, but refs always read the
  // latest value. (Plain state inside the callback would be frozen at setup.)
  const headDownSinceRef = useRef(0) // timestamp the head went down (0 = not down)
  const eyesDownSinceRef = useRef(0) // timestamp the eyes went down (0 = not down)
  const episodeActiveRef = useRef(false) // are we inside one continuous look-down?
  const lastStatusRef = useRef<GazeStatus>('unknown') // to update state only on change
  const lastDebugAtRef = useRef(0) // throttle debug state updates
  const thresholdsRef = useRef(thresholds)
  thresholdsRef.current = thresholds

  // Running min/max of each signal, for the diagnostic panel.
  const headMinRef = useRef(Infinity)
  const headMaxRef = useRef(-Infinity)
  const irisMinRef = useRef(Infinity)
  const irisMaxRef = useRef(-Infinity)

  const resetPenalties = useCallback(() => {
    setPenaltyCount(0)
    headDownSinceRef.current = 0
    eyesDownSinceRef.current = 0
    episodeActiveRef.current = false
  }, [])

  const resetRanges = useCallback(() => {
    headMinRef.current = Infinity
    headMaxRef.current = -Infinity
    irisMinRef.current = Infinity
    irisMaxRef.current = -Infinity
  }, [])

  useEffect(() => {
    if (!enabled) return
    const video = videoRef.current
    if (!video) return
    // Past this guard `video` is non-null, but TypeScript widens it back inside
    // the async closures below — alias to a guaranteed-non-null const so the
    // frame loop stays cleanly typed.
    const videoEl: HTMLVideoElement = video

    let faceMesh: FaceMeshInstance | null = null
    let stream: MediaStream | null = null
    let rafId = 0
    let cancelled = false

    const finite = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback)

    // Throttle debug updates to ~5/sec so we don't re-render React 30 times/sec.
    function maybeSetDebug(d: GazeDebug) {
      const now = performance.now()
      if (now - lastDebugAtRef.current > 200) {
        lastDebugAtRef.current = now
        setDebug(d)
      }
    }

    // MediaPipe calls this on EVERY processed frame with the landmark results.
    function onResults(results: Results) {
      const faces = results.multiFaceLandmarks

      // No face in frame (you stepped away, too dark, etc.)
      if (!faces || faces.length === 0) {
        headDownSinceRef.current = 0
        eyesDownSinceRef.current = 0
        if (lastStatusRef.current !== 'unknown') {
          lastStatusRef.current = 'unknown'
          setGazeStatus('unknown')
          setIsLookingDown(false)
        }
        maybeSetDebug({
          headPitchRatio: 0,
          irisRatio: 0,
          faceFound: false,
          landmarkCount: 0,
          irisFound: false,
          headMin: finite(headMinRef.current, 0),
          headMax: finite(headMaxRef.current, 0),
          irisMin: finite(irisMinRef.current, 0),
          irisMax: finite(irisMaxRef.current, 0),
        })
        return
      }

      // maxNumFaces is 1, so the first (and only) face is ours.
      const landmarks = faces[0]
      const reading = evaluateGaze(landmarks, thresholdsRef.current)

      // Track the range each signal reaches (so you can read it off the panel).
      headMinRef.current = Math.min(headMinRef.current, reading.headPitchRatio)
      headMaxRef.current = Math.max(headMaxRef.current, reading.headPitchRatio)
      irisMinRef.current = Math.min(irisMinRef.current, reading.irisRatio)
      irisMaxRef.current = Math.max(irisMaxRef.current, reading.irisRatio)

      // --- Time-based debounce. Each signal must hold CONTINUOUSLY for its own
      // window before it counts. The long EYE window is what makes blinking
      // impossible to mistake for looking down (a blink can't last 450ms); the
      // openness check in evaluateGaze also zeroes the eye timer on each blink.
      const now = performance.now()

      if (reading.headDown) {
        if (headDownSinceRef.current === 0) headDownSinceRef.current = now
      } else {
        headDownSinceRef.current = 0
      }
      if (reading.eyesDown) {
        if (eyesDownSinceRef.current === 0) eyesDownSinceRef.current = now
      } else {
        eyesDownSinceRef.current = 0
      }

      const headConfirmed =
        headDownSinceRef.current !== 0 && now - headDownSinceRef.current >= HEAD_CONFIRM_MS
      const eyesConfirmed =
        eyesDownSinceRef.current !== 0 && now - eyesDownSinceRef.current >= EYE_CONFIRM_MS
      const confirmedDown = headConfirmed || eyesConfirmed

      // --- Edge-triggered penalty: count ONE penalty per look-down episode (on
      // the rising edge), not once per frame while you're down.
      if (confirmedDown && !episodeActiveRef.current) {
        episodeActiveRef.current = true
        setPenaltyCount((c) => c + 1)
      }
      if (!reading.isLookingDown) {
        episodeActiveRef.current = false // looked back up -> ready for next episode
      }

      // --- Update React state only when the status actually flips (keeps renders cheap).
      const status: GazeStatus = confirmedDown ? 'down' : 'up'
      if (status !== lastStatusRef.current) {
        lastStatusRef.current = status
        setGazeStatus(status)
        setIsLookingDown(confirmedDown)
      }

      maybeSetDebug({
        headPitchRatio: reading.headPitchRatio,
        irisRatio: reading.irisRatio,
        faceFound: true,
        landmarkCount: landmarks.length,
        irisFound: landmarks.length >= 478,
        headMin: headMinRef.current,
        headMax: headMaxRef.current,
        irisMin: irisMinRef.current,
        irisMax: irisMaxRef.current,
      })
    }

    async function setup() {
      try {
        // Load MediaPipe from the CDN (no-op if already loaded), then read the
        // FaceMesh constructor it registers on window.
        await loadMediaPipeScript()
        if (cancelled) return
        const FaceMeshCtor = window.FaceMesh
        if (!FaceMeshCtor) {
          setError('MediaPipe failed to load. Check your network and reload.')
          return
        }

        faceMesh = new FaceMeshCtor({ locateFile: (file) => `${MEDIAPIPE_CDN}/${file}` })
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true, // <-- THIS enables the iris landmarks (468–477)
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        faceMesh.onResults(onResults)

        // Acquire the webcam ourselves. If the user denies it (or there's no
        // camera), this throws ONCE -> caught below -> a single error, no retry loop.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        })
        if (cancelled) return // unmounted while we were waiting for permission

        videoEl.srcObject = stream
        await videoEl.play()
        if (!cancelled) setReady(true)

        // Frame loop: hand each video frame to FaceMesh (which then calls
        // onResults). `await` before scheduling the next frame means frames never
        // pile up if processing is slow.
        const tick = async () => {
          if (cancelled || !faceMesh) return
          try {
            await faceMesh.send({ image: videoEl })
          } catch {
            // ignore a transient per-frame send error
          }
          if (!cancelled) rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof DOMException && e.name === 'NotAllowedError'
              ? 'Camera permission denied. Allow camera access and reload.'
              : e instanceof Error
                ? e.message
                : 'Failed to start gaze detection'
          setError(msg)
        }
      }
    }

    setup()

    // Cleanup when the game ends or the component unmounts: stop the frame loop,
    // release the webcam (turns the camera light off), and free the model.
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((track) => track.stop())
      faceMesh?.close()
      setReady(false)
    }
  }, [enabled, videoRef])

  return {
    gazeStatus,
    isLookingDown,
    penaltyCount,
    ready,
    error,
    debug,
    resetPenalties,
    resetRanges,
  }
}
