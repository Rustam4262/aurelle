import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Force new hash for cache busting
        entryFileNames: `assets/[name]-[hash]-v${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-v${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-v${Date.now()}.[ext]`
      }
    }
  }
})
