import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './lib/auth.tsx'

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='100%25' height='100%25' fill='%232B2930'/%3E%3C/svg%3E";

// Gambar poster gagal (proxy down / jaringan) → ganti placeholder sekali, jangan kotak kosong.
window.addEventListener(
  "error",
  (e) => {
    const el = e.target as HTMLElement | null;
    if (el?.tagName === "IMG") {
      const img = el as HTMLImageElement;
      if (!img.dataset.fallback) {
        img.dataset.fallback = "1";
        img.src = PLACEHOLDER;
      }
    }
  },
  true,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
