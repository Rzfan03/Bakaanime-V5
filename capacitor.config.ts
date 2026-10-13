import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bakaanime.app',
  appName: 'BakaAnime',
  webDir: 'dist',
  server: {
    // Origin APK = subdomain domain web, biar Clerk/API menerima header Origin
    // (origin_invalid kalau pakai https://localhost).
    hostname: 'app.bakaanime-v5.vercel.app',
    androidScheme: 'https',
    // Sembunyikan penanda WebView dari User-Agent biar Google OAuth tak
    // diblokir (disallowed_useragent).
    overrideUserAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#141218',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      launchAutoHide: false,
      splashFullScreen: true,
    },
  },
};

export default config;
