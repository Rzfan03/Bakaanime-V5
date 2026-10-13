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

// Web: use the /__clerk proxy in production (*.vercel.app) and in `vercel dev`
// (localhost:3000 serves the same rewrite + api functions). pk_live must go
// through the proxy because its FAPI host has no DNS. Native: see lib/clerk/native.tsx.
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1"
const CLERK_PROXY_URL = isNative
  ? undefined
  : hostname.endsWith(".vercel.app") || isLocalHost
    ? "/__clerk"
    : undefined

// The native provider loads @clerk/clerk-js (bearer, no cookies); lazy so it
// stays out of the web bundle.
const NativeClerkProvider = lazy(() =>
  import("./lib/clerk/native").then((m) => ({ default: m.NativeClerkProvider })),
)

const pixelFont = document.createElement('link')
pixelFont.rel = 'stylesheet'
pixelFont.href =
  'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&display=swap'
document.head.appendChild(pixelFont)

// fallback: image fails to load -> placeholder, so there are no empty boxes
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

initSettings() // apply theme/text size/font before render

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
