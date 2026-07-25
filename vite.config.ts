import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://dermahealth.fitdnu.id.vn',
        changeOrigin: true,
        // The backend refresh cookie is issued for its production domain.
        // Rewrite it in development so Chrome can store/send it for localhost.
        cookieDomainRewrite: '',
      },
    },
  },
})
