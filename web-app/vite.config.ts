import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /api → the local PHP backend (self-signed cert → secure:false).
      // Keep the `/ij/api` prefix since Apache serves it from that path.
      '/api': {
        target: 'https://localhost:8888',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => `/ij${path}`,
      },
    },
  },
})
