import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.scss'
import App from './App.tsx'
import { purgeLegacySensitiveStorage } from './security/purgeLegacySensitiveStorage.ts'

purgeLegacySensitiveStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
