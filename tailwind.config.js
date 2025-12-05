/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          dark: '#0f172a',
          light: '#1f2937',
        },
        piece: {
          red: '#f87171',
          blue: '#60a5fa',
        },
      },
    },
  },
  plugins: [],
}
