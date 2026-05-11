/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mapped from mockups/v2/shared/STYLE_GUIDE.md
        'space-dark': '#0a0e1a',
        'space-surface': '#111827',
        'space-surface-hover': '#1f2937',
        'neon-blue': '#3b82f6',
        'neon-blue-hover': '#2563eb',
        'neon-green': '#22c55e',
        'neon-yellow': '#eab308',
        'neon-red': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
