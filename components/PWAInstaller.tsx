'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function PWAInstaller() {
  const t = useTranslations('PWAInstaller');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(true); // Test için her zaman true

  useEffect(() => {
    console.log('PWAInstaller mounted');
    
    // Service Worker'ı kaydet
    if ('serviceWorker' in navigator) {
      console.log('Service Worker supported');
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    } else {
      console.log('Service Worker not supported');
    }

    // PWA install prompt'unu yakala
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Eğer uygulama zaten yüklendiyse butonu gizle
    window.addEventListener('appinstalled', () => {
      console.log('App installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Eğer native prompt yoksa, manuel yönlendirme yap
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        alert('Safari\'de: Paylaş butonuna basın ve "Ana Ekrana Ekle" seçeneğini seçin.');
      } else {
        alert('Chrome\'da: Menüden "Ana ekrana ekle" seçeneğini kullanın.');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  console.log('PWAInstaller render - showInstallButton:', showInstallButton);
  
  if (!showInstallButton) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={handleInstallClick}
        className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 text-sm font-bold hover:bg-red-600 transition-colors border-4 border-yellow-400"
        style={{ minWidth: '150px' }}
      >
        <Download className="h-5 w-5" />
        <span>{t('installApp')}</span>
      </button>
    </div>
  );
}
