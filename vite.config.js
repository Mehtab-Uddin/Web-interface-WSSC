import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/wsscswat/',  // Add this line for subdirectory deployment
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy removed - connecting directly to production API at api.webypixels.com
    // If you need to use proxy for local development, uncomment below:
    // proxy: {
    //   '/api': {
    //     target: 'https://api.webypixels.com',
    //     changeOrigin: true,
    //     secure: true
    //   }
    // }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          bootstrap: ['bootstrap', 'react-bootstrap'],
          leaflet: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})