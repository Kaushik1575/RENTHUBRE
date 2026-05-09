import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/%(.*?)%/g, (match, p1) => env[p1] ?? match);
        },
      },
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3005',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
