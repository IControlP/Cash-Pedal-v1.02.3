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
        // Split the rarely-changing React runtime into its own long-cached
        // chunk so app updates don't force mobile users to re-download it.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
