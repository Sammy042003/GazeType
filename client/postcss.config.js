// Vite runs your CSS through PostCSS. These two plugins are the standard
// Tailwind v3 pipeline:
//   - tailwindcss : turns the @tailwind directives into real utility CSS
//   - autoprefixer: adds vendor prefixes (-webkit- etc.) for browser support
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
