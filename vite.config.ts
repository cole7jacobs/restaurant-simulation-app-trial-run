import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // React plugin: handles JSX transform and Fast Refresh in dev
    react(),
    // Tailwind CSS v4 Vite plugin: processes @import "tailwindcss" and @theme tokens
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      // During development, forward /api/* requests to the Hono Worker
      // running via `wrangler dev --port 8787` (npm run dev:api)
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: false,
      },
    },
  },
  build: {
    // Output to dist/ — this is what wrangler.jsonc assets.directory points to
    outDir: 'dist',
    // Report warnings for chunks over 500 kB (Recharts can be large; keep an eye on this)
    chunkSizeWarningLimit: 600,
  },
})
