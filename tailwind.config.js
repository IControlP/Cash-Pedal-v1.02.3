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
        bg: '#0f0520',
        surface: '#1a0a30',
        surfaceHover: '#231040',
        border: '#3a1a5c',
        accent: '#FFB800',
        accentDim: '#e0a000',
        accentMuted: 'rgba(255,184,0,0.12)',
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,184,0,0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,184,0,0)' },
        },
      },
    },
  },
  plugins: [],
}
