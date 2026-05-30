/// <reference types="vite/client" />

// Augment Vite's env typing with our custom variable, so
// import.meta.env.VITE_API_URL is fully typed across the app.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}
