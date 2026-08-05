import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      https: hasLocalCert
        ? { key: readFileSync(httpsKey), cert: readFileSync(httpsCert) }
        : undefined,
      proxy: {
        '/api': {
          // Local development must exercise the backend in this workspace.
          // Pointing at production made new UI code render stale production
          // analyses and hid whether the local comparison pipeline worked.
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
        },
      },
    },
  }
})
