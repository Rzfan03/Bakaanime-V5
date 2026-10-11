# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Backend (Neon + Google OAuth + Vercel)

User data (profil, favorit, library, watched) dan komentar per anime disimpan di
Postgres (Neon). Backend-nya Vercel Serverless Functions di `api/`.

### Setup

1. Buat database Neon, lalu apply schema:
   ```
   psql "$DATABASE_URL" -f schema.sql
   ```
2. Setup Google OAuth (lihat bagian di bawah).
3. Isi env (lihat `.env.example`):
   - `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `AUTH_SECRET`, `DEV_ACCESS_KEY` (server)
   - `VITE_GOOGLE_CLIENT_ID` (client, sama dengan `GOOGLE_CLIENT_ID`)
4. Jalankan dev dengan Vercel CLI (frontend + functions sekaligus):
   ```
   vercel dev
   ```
   Atau `npm run dev` + set `VITE_API_URL=http://localhost:3000/api`.

### Setup Google OAuth (Google Identity Services)

Login pakai ID token Google (GIS), bukan redirect — jadi tidak perlu Redirect URI.

1. **Buat project** di https://console.cloud.google.com → pilih/buat project baru.
2. **OAuth consent screen** (menu *APIs & Services → OAuth consent screen*):
   - User type: **External** → Create.
   - Isi App name, User support email, Developer contact.
   - Scopes: biarkan default (`openid`, `email`, `profile` cukup).
   - Publishing status masih **Testing** → tambahkan email kamu di **Test users**
     (kalau tidak, login akan ditolak).
3. **Buat credential** (*APIs & Services → Credentials → Create credentials → OAuth client ID*):
   - Application type: **Web application**.
   - **Authorized JavaScript origins** — tambahkan (tanpa trailing slash):
     - `http://localhost:5173` (vite dev)
     - `http://localhost:3000` (vercel dev)
     - `https://<project>.vercel.app` (production)
     - `https://localhost` (Capacitor android webview, jika load dari webview)
   - Redirect URI: **kosongkan** (tidak dipakai).
4. **Copy Client ID** (format `xxxx.apps.googleusercontent.com`).
5. Set env:
   ```
   GOOGLE_CLIENT_ID=<client-id>
   VITE_GOOGLE_CLIENT_ID=<client-id>
   AUTH_SECRET=$(openssl rand -hex 32)
   DEV_ACCESS_KEY=<key-rahasia-untuk-login-developer-verified>
   ```
6. Restart dev server. Klik "Masuk dengan Google" → pilih akun → user tersimpan di
   Neon.

> Login dengan **Key** (`DEV_ACCESS_KEY`) memberi akun **verified** (centang biru).

> Catatan: gambar avatar/banner saat ini disimpan sebagai base64 di kolom text
> (`users.avatar`,`users.banner`). Untuk produksi sebaiknya pindah ke object
> storage dan simpan URL — lihat `ponytail:` di `src/lib/image.ts`.

## Frontend

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
