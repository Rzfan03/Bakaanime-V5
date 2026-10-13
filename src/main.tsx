import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './lib/auth.tsx'
import { initSettings } from './lib/settings.ts'
import { Capacitor } from '@capacitor/core'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

const isNative = Capacitor.isNativePlatform()
const hostname = typeof window !== "undefined" ? window.location.hostname : ""

// Web: pakai proxy /__clerk di produksi (*.vercel.app) dan di `vercel dev`
// (localhost:3000 menyajikan rewrite + fungsi api yang sama). pk_live wajib
// lewat proxy karena host FAPI-nya tak punya DNS. Native: lihat lib/clerk/native.tsx.
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1"
const CLERK_PROXY_URL = isNative
  ? undefined
  : hostname.endsWith(".vercel.app") || isLocalHost
    ? "/__clerk"
    : undefined

// Provider native memuat @clerk/clerk-js (bearer, tanpa cookie); di-lazy supaya
// tidak ikut ke bundle web.
const NativeClerkProvider = lazy(() =>
  import("./lib/clerk/native").then((m) => ({ default: m.NativeClerkProvider })),
)

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

function Shell() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isNative ? (
      <Suspense fallback={null}>
        <NativeClerkProvider>
          <Shell />
        </NativeClerkProvider>
      </Suspense>
    ) : (
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        proxyUrl={CLERK_PROXY_URL}
        afterSignOutUrl="/login"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        <Shell />
      </ClerkProvider>
    )}
  </StrictMode>,
)
