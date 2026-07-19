import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.okibo.app',
  appName: 'Okibo Analyzer',
  webDir: 'out', // Next.js build çıktısı (kullanılmıyorsa canlı URL yüklenir)
  server: {
    // Uygulama, sunucu tarafı özellikler (API/next-auth/server actions) için canlı siteyi yükler
    url: 'https://okibo-analyzer.up.railway.app',
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
