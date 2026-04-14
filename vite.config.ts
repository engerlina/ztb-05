import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Set BASE_PATH=/repo-name/ when building for GitHub Pages (see .github/workflows).
const base = process.env.BASE_PATH?.trim() || '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Same-origin requests from the app; avoids browser CORS to api.openai.com in dev.
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openai/, ''),
      },
    },
  },
})
