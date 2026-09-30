import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web app (dist/) into native iOS and Android
 * projects. See docs/MOBILE.md for the build steps.
 */
const config: CapacitorConfig = {
  appId: 'app.eartrainer',
  appName: 'Ear Trainer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
