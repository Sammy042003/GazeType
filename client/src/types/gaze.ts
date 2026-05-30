// One face/iris point as MediaPipe reports it. MediaPipe gives us an ARRAY of
// these (468 face points + 10 iris points when refineLandmarks is on).
export interface Landmark {
  x: number // normalized 0.0 (left edge) to 1.0 (right edge) of the video frame
  y: number // normalized 0.0 (top) to 1.0 (bottom) of the video frame
  z: number // depth relative to the head center; negative = closer to camera
}

// A "union type": GazeStatus can ONLY ever be one of these three exact strings.
// Assigning gazeStatus = 'sideways' would be a compile error. This is how we
// make invalid states impossible instead of using loose strings.
export type GazeStatus = 'up' | 'down' | 'unknown'

// The snapshot of gaze info the detector exposes to the rest of the app.
export interface GazeDetectionState {
  isLookingDown: boolean // convenience boolean for "should we penalize right now?"
  gazeStatus: GazeStatus // the richer status used for the UI badge
  penaltyCount: number // how many times the user has looked down this session
}
