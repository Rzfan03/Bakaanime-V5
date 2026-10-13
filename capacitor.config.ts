import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bakaanime.app',
  appName: 'BakaAnime',
  webDir: 'dist',
  server: {
    // APK origin = a subdomain of the web domain, so Clerk/API accept the
    // Origin header (origin_invalid if using https://localhost).
    hostname: 'app.bakaanime-v5.vercel.app',
    androidScheme: 'https',
    // Hide the WebView marker from the User-Agent so Google OAuth isn't
    // blocked (disallowed_useragent).
    overrideUserAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  },
  plugins: {
    // Required for Clerk native: native HTTP doesn't add the `Origin` header
    // automatically, so it doesn't conflict with `Authorization`
    // (origin_authorization_headers_conflict). Cookies don't apply here either.
    CapacitorHttp: { enabled: true },
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
