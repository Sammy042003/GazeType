/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind scans these files for class names you actually use, and only
  // generates CSS for those (keeps the bundle tiny). If a file isn't listed
  // here, its Tailwind classes silently won't work — a classic gotcha.
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
