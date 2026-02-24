import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.aurelle.app',
  appName: 'Aurelle',
  webDir: 'dist/public',
  server: {
    // For production: load from your deployed server
    url: 'https://aurelle.uz',
    cleartext: false,
  },
  android: {
    // Allow mixed content for development
    allowMixedContent: false,
    // Use custom WebView chrome client
    captureInput: true,
    // WebView settings
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#C81D60',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
