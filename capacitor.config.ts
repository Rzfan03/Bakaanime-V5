import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bakaanime.app',
  appName: 'BakaAnime',
  webDir: 'dist',
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
