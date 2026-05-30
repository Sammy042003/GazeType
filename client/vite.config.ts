import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // MediaPipe ships its own WebAssembly + worker files and loads them at
  // runtime. Vite's dev pre-bundler (esbuild) tries to "optimize" dependencies
  // by rewriting them, which corrupts those runtime loads. Excluding them tells
  // Vite to leave these packages alone so MediaPipe can fetch its WASM itself.
  optimizeDeps: {
    exclude: ['@mediapipe/face_mesh', '@mediapipe/camera_utils'],
  },

  server: {
    // Any request the frontend makes to "/api/..." during development is
    // transparently forwarded to the backend on :5000. This is why the browser
    // never sees a cross-origin request in dev (no CORS preflight), and why our
    // axios baseURL can just be "/api".
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
