import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: process.env.PORT || 3000,
    host: true,
    allowedHosts: ['cashpedal.io', 'www.cashpedal.io'],
  },
  build: {
    // Explicit browser floor — covers modern mobile Safari/Chrome incl. the
    // in-app browsers used by Instagram/Facebook, while still allowing esbuild
    // to ship lean modern output.
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Static data files shared across tool pages (vehicles.json is 517 KB).
          // Grouping them into one chunk avoids duplicating the payload across
          // the three tool pages that import it (TCO, Salary, Checklist).
          if (id.includes('src/data/vehicles.json') ||
              id.includes('src/data/checklistData') ||
              id.includes('src/data/surveyData')) {
            return 'app-data'
          }
          // Recharts + its d3/animation sub-packages — only ever loaded when the
          // user visits the Market Analytics page.
          if (id.includes('/node_modules/recharts') ||
              id.includes('/node_modules/d3-') ||
              id.includes('/node_modules/react-smooth') ||
              id.includes('/node_modules/victory-vendor')) {
            return 'recharts-vendor'
          }
          // React runtime — changes rarely; stays in its own long-cached chunk
          // so app-code updates don't force mobile users to re-download it.
          if (id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router') ||
              id.includes('/node_modules/scheduler/') ||
              id.includes('/node_modules/@remix-run/')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
