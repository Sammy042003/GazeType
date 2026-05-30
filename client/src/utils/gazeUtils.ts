import type { Landmark, GazeStatus } from '../types/gaze'

// ===========================================================================
// MediaPipe Face Mesh gives us an ARRAY of landmarks. Each landmark is a point
// on the face with normalized coordinates:
//   x: 0.0 = left edge of the video, 1.0 = right edge
//   y: 0.0 = TOP of the video, 1.0 = BOTTOM   <-- y grows DOWNWARD
//   z: depth (we don't need it here; 2D x/y is enough for "looking down")
//
// "Normalized" means the numbers are fractions of the frame, NOT pixels. So the
// math below works the same whether the webcam is 480p or 1080p.
//
// With refineLandmarks: true, MediaPipe adds 10 IRIS points (indices 468–477)
// on top of the 468 face points. We use a handful of these indices by number.
// ===========================================================================
export const LM = {
  noseTip: 1, // tip of the nose
  chin: 152, // bottom of the chin
  leftEyeOuter: 33, // outer corner of the (image-)left eye
  leftEyeInner: 133, // inner corner of the (image-)left eye
  rightEyeOuter: 263, // outer corner of the (image-)right eye
  rightEyeInner: 362, // inner corner of the (image-)right eye
  leftEyeUpperLid: 159, // top of the left eye opening
  leftEyeLowerLid: 145, // bottom of the left eye opening
  rightEyeUpperLid: 386, // top of the right eye opening
  rightEyeLowerLid: 374, // bottom of the right eye opening
  leftIrisCenter: 468, // center of the left iris (needs refineLandmarks)
  rightIrisCenter: 473, // center of the right iris
} as const

// 2D Euclidean distance between two landmarks (Pythagoras on x and y).
function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// "Face width" = distance between the two outer eye corners. We use this purely
// as a SCALE REFERENCE. Whether you sit close or far from the camera, both the
// face width AND the vertical distances scale together — so dividing by face
// width cancels out the distance, leaving a number that only reflects head pose.
export function getFaceWidth(landmarks: Landmark[]): number {
  return distance(landmarks[LM.leftEyeOuter], landmarks[LM.rightEyeOuter])
}

// ---------------------------------------------------------------------------
// SIGNAL 1 — HEAD TILTED DOWN (neck bend)
//
// Key idea: when you tilt your head down to look at the keyboard, your chin
// tucks toward your neck, so the VERTICAL gap between your nose tip and your
// chin (as the flat camera image sees it) SHRINKS — the lower face foreshortens.
// We measure that gap and divide by face width to make it distance-independent.
//
//   ratio HIGH  -> chin is far below the nose -> head is upright
//   ratio LOW   -> chin has tucked up toward the nose -> head is tilted DOWN
// ---------------------------------------------------------------------------
export function getHeadPitchRatio(landmarks: Landmark[]): number {
  const faceWidth = getFaceWidth(landmarks)
  if (faceWidth < 1e-6) return 0 // avoid divide-by-zero if landmarks are degenerate

  // chin.y - nose.y is positive when the chin sits below the nose (normal).
  const noseToChinVertical = landmarks[LM.chin].y - landmarks[LM.noseTip].y
  return noseToChinVertical / faceWidth
}

// ---------------------------------------------------------------------------
// SIGNAL 2 — EYES DARTING DOWN (iris position), even if the head stays still
//
// FIRST ATTEMPT (weak): measure the iris between the upper and lower EYELIDS.
// Problem — when you look down, your eyelid droops WITH your gaze, so the iris
// stays roughly centered in the (now smaller) opening. The signal barely moves.
//
// BETTER: use the eye CORNERS (inner + outer canthus) as the reference. They're
// anchored to the skull and DON'T move when the eyelid droops. We measure how
// far the iris center sits BELOW the line through the two corners, normalized by
// eye width (so it's independent of how close you are to the camera):
//   offset ~ 0   -> iris level with the corners (looking straight ahead)
//   offset > 0   -> iris BELOW the corner line  (looking DOWN)  <- what we want
//   offset < 0   -> iris above the corner line  (looking up)
// We average both eyes for stability.
// ---------------------------------------------------------------------------
function singleEyeIrisOffset(iris: Landmark, outerCorner: Landmark, innerCorner: Landmark): number {
  const cornerMidY = (outerCorner.y + innerCorner.y) / 2 // vertical midline of the eye
  const eyeWidth = distance(outerCorner, innerCorner) // distance-invariant scale
  if (eyeWidth < 1e-6) return 0
  return (iris.y - cornerMidY) / eyeWidth // + means iris is below the corner line = looking down
}

export function getIrisRatio(landmarks: Landmark[]): number {
  const left = singleEyeIrisOffset(
    landmarks[LM.leftIrisCenter],
    landmarks[LM.leftEyeOuter],
    landmarks[LM.leftEyeInner]
  )
  const right = singleEyeIrisOffset(
    landmarks[LM.rightIrisCenter],
    landmarks[LM.rightEyeOuter],
    landmarks[LM.rightEyeInner]
  )
  return (left + right) / 2
}

// ---------------------------------------------------------------------------
// EYE OPENNESS — used to ignore BLINKS.
//
// Problem: a blink briefly closes the eye, which makes the iris signal garbage
// (the lid covers the iris and its detected center jumps down), so a blink looks
// just like "eyes down". We measure how open the eyes are — vertical lid gap
// divided by eye width — and when it's near zero (a blink), we ignore the iris
// signal for that frame.
//   open eyes  -> ~0.20-0.35
//   a blink    -> near 0
// Averaged over both eyes.
// ---------------------------------------------------------------------------
function singleEyeOpenness(upperLid: Landmark, lowerLid: Landmark, outerCorner: Landmark, innerCorner: Landmark): number {
  const eyeWidth = distance(outerCorner, innerCorner)
  if (eyeWidth < 1e-6) return 0
  return (lowerLid.y - upperLid.y) / eyeWidth // lid gap normalized by eye width
}

export function getEyeOpenness(landmarks: Landmark[]): number {
  const left = singleEyeOpenness(
    landmarks[LM.leftEyeUpperLid],
    landmarks[LM.leftEyeLowerLid],
    landmarks[LM.leftEyeOuter],
    landmarks[LM.leftEyeInner]
  )
  const right = singleEyeOpenness(
    landmarks[LM.rightEyeUpperLid],
    landmarks[LM.rightEyeLowerLid],
    landmarks[LM.rightEyeOuter],
    landmarks[LM.rightEyeInner]
  )
  return (left + right) / 2
}

// ---------------------------------------------------------------------------
// Thresholds — the dials that calibrate detection. Defaults are tuned for the
// current setup; every face/camera differs.
// ---------------------------------------------------------------------------
export interface GazeThresholds {
  headDownBelow: number // if headPitchRatio < this  -> head is down
  irisDownAbove: number // if irisRatio       > this  -> eyes are down
  eyeClosedBelow: number // if eyeOpenness    < this  -> treat as a blink (ignore eyes)
}

export const DEFAULT_THRESHOLDS: GazeThresholds = {
  headDownBelow: 0.55, // headPitchRatio below this => head tilted down
  irisDownAbove: -0.04, // iris-vs-corner offset above this => eyes looking down
  eyeClosedBelow: 0.1, // eyeOpenness below this => a blink, so ignore the iris signal
  // NOTE: irisDownAbove is negative because, for this camera angle/face, the
  // iris sits slightly ABOVE the eye-corner line even when looking straight.
  // Tuned for the current camera/setup; re-tune if you change camera/lighting.
}

// The full reading for one frame. We return the raw numbers too, so the UI can
// display them for tuning.
export interface GazeReading {
  gazeStatus: GazeStatus
  isLookingDown: boolean
  headPitchRatio: number
  irisRatio: number
  eyeOpenness: number
  headDown: boolean
  eyesDown: boolean
  blinking: boolean
}

// Combine both signals. EITHER one firing counts as "looking down" (logical OR),
// because looking away from the screen is bad whether it's the head or just the
// eyes — EXCEPT we ignore the eye signal during a blink.
export function evaluateGaze(
  landmarks: Landmark[],
  thresholds: GazeThresholds = DEFAULT_THRESHOLDS
): GazeReading {
  const headPitchRatio = getHeadPitchRatio(landmarks)
  const irisRatio = getIrisRatio(landmarks)
  const eyeOpenness = getEyeOpenness(landmarks)

  const blinking = eyeOpenness < thresholds.eyeClosedBelow
  const headDown = headPitchRatio < thresholds.headDownBelow
  // Only trust the iris signal when the eyes are actually open — a blink isn't
  // "looking down". The head signal is unaffected by blinks, so it stays.
  const eyesDown = !blinking && irisRatio > thresholds.irisDownAbove
  const isLookingDown = headDown || eyesDown

  return {
    gazeStatus: isLookingDown ? 'down' : 'up',
    isLookingDown,
    headPitchRatio,
    irisRatio,
    eyeOpenness,
    headDown,
    eyesDown,
    blinking,
  }
}
