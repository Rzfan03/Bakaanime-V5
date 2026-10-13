import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Dev-only: route /api to a backend so localhost avoids CORS. Override
      // with VITE_API_PROXY (e.g. http://localhost:3000 for `vercel dev`).
      "/api": {
        target: process.env.VITE_API_PROXY || "https://bakaanime-v5.vercel.app",
        changeOrigin: true,
      },
    },
  },
})
