import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './lib/auth.tsx'
import { initSettings } from './lib/settings.ts'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

// Di *.vercel.app Clerk di-proxy lewat /__clerk (tak bisa CNAME). Untuk lokal
// & APK (https://localhost) bicara langsung ke clerk.accounts.dev.
const CLERK_PROXY_URL =
  typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")
    ? "/__clerk"
    : undefined

// muat font Pixelify Sans
const pixelFont = document.createElement('link')
pixelFont.rel = 'stylesheet'
pixelFont.href =
  'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&display=swap'
document.head.appendChild(pixelFont)

// fallback: gambar gagal dimuat → placeholder, biar tak ada kotak kosong
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect width='100%25' height='100%25' fill='%232B2930'/%3E%3C/svg%3E"
window.addEventListener(
  "error",
  (e) => {
    const t = e.target as HTMLImageElement | null
    if (t?.tagName === "IMG" && !t.dataset.fallback) {
      t.dataset.fallback = "1"
      t.src = PLACEHOLDER
    }
  },
  true,
)

initSettings() // terapkan tema/ukuran teks/font sebelum render

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      proxyUrl={CLERK_PROXY_URL}
      afterSignOutUrl="/login"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
