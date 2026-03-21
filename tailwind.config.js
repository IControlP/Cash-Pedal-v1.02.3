/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        bg: '#080809',
        surface: '#111113',
        surfaceHover: '#1a1a1e',
        border: '#242428',
        accent: '#C8FF00',
        accentDim: '#a8d900',
        accentMuted: 'rgba(200,255,0,0.12)',
        zinc: {
          950: '#09090b',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'count-up': 'countUp 0.3s ease forwards',
        'pulse-accent': 'pulseAccent 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        countUp: {
          '0%': { opacity: '0.4', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseAccent: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200,255,0,0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(200,255,0,0)' },
        },
      },
    },
  },
  plugins: [],
}
