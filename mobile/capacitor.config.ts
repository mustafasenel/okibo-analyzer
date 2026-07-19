import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.okibo.app',
  appName: 'Okibo Analyzer',
  webDir: 'out', // Next.js build çıktısı
  server: {
    androidScheme: 'https'
  }
};

export default config;
