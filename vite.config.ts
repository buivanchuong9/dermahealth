import { existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// mkcert-generated (see README/.certs) so the dev origin is HTTPS — the
// backend's production frontend-origin whitelist rejects plain HTTP origins
// outright (env.validation.ts), so http://localhost:5173 can never be
// trusted there. Run `mkcert -install` once, then:
//   mkdir -p .certs && mkcert -key-file .certs/localhost-key.pem -cert-file .certs/localhost.pem localhost 127.0.0.1 ::1
const httpsKey = '.certs/localhost-key.pem'
const httpsCert = '.certs/localhost.pem'
const hasLocalCert = existsSync(httpsKey) && existsSync(httpsCert)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: hasLocalCert
      ? { key: readFileSync(httpsKey), cert: readFileSync(httpsCert) }
      : undefined,
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
