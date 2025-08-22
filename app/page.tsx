'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageCapture from '@/components/scanner/ImageCapture';
import ImagePreviewGrid from '@/components/scanner/ImagePreviewGrid';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Gelen JSON verisi için tip tanımı
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

// Yükleme durumu için tip tanımı
type LoadingState = {
  isLoading: boolean;
  message: string;
};

export default function ScannerPage() {
  // 1. Dil çevirilerini almak için useTranslations hook'unu kullan
  const t = useTranslations('ScannerPage');
  const router = useRouter();
  
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageBase64s, setImageBase64s] = useState<string[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false, message: '' });
  const [error, setError] = useState<string>('');

  // ImageCapture component'inden gelen dosyaları işleyen fonksiyon
  const handleImagesCaptured = async (files: FileList) => {
    setImagePreviews([]);
    setImageBase64s([]);
    setError('');

    const readFileAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    };

    try {
      setLoadingState({ isLoading: true, message: 'Görseller hazırlanıyor...' }); // Bu metin de dile çevrilebilir
      const base64Promises = Array.from(files).map(readFileAsBase64);
      const allBase64s = await Promise.all(base64Promises);
      setImagePreviews(allBase64s);
      setImageBase64s(allBase64s);
    } catch (err) {
      setError(t('errorGeneric')); // Hata mesajını dil dosyasından al
      console.error(err);
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  // Verileri birleştiren yardımcı fonksiyon
  const mergeInvoiceData = (pages: any[]): InvoiceData | null => {
    if (!pages || pages.length === 0) return null;
    const validPages = pages.map(p => p.result).filter(Boolean);
    if (validPages.length === 0) return null;

    return {
      invoice_meta: validPages[0].invoice_meta || {},
      invoice_data: validPages.flatMap(p => p.invoice_data || []),
      invoice_summary: validPages[validPages.length - 1].invoice_summary || {},
    };
  };

  // Analiz butonuna basıldığında çalışan ana fonksiyon
  const handleSubmit = async () => {
    if (imageBase64s.length === 0) {
      setError('Lütfen analiz için en az bir sayfa seçin.'); // Bu da çevrilebilir
      return;
    }

    setLoadingState({ isLoading: true, message: 'Hazırlanıyor...' });
    setError('');

    try {
      const apiPromises = imageBase64s.map((base64, index) => {
        setLoadingState({ 
          isLoading: true, 
          message: t('analyzingMessage', { // Dinamik mesajı dil dosyasından al
            current: index + 1, 
            total: imageBase64s.length 
          }) 
        });
        return fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        }).then(res => {
          if (!res.ok) {
            return res.json().then(err => Promise.reject(err));
          }
          return res.json();
        });
      });

      const allPageResults = await Promise.all(apiPromises);
      
      setLoadingState({ isLoading: true, message: 'Sonuçlar birleştiriliyor...' }); // Çevrilebilir
      const finalResult = mergeInvoiceData(allPageResults);

      if (!finalResult) {
          throw new Error("Analiz sonucunda geçerli veri bulunamadı."); // Çevrilebilir
      }
      
      sessionStorage.setItem('analysisResult', JSON.stringify(finalResult));
      router.push('/review');

    } catch (err: any) {
      setError(err.message || t('errorGeneric')); // Hata mesajını dil dosyasından al
      console.error("API Error:", err);
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* PWA Test Butonu */}
      <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-sm text-yellow-800">PWA Test: Sağ üst köşede "Uygulamayı Yükle" butonu görünmeli</p>
      </div>
      
      {/* 2. Metinleri t() fonksiyonu ile dil dosyasından çek */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('title')}</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <ImageCapture
          onImagesCaptured={handleImagesCaptured}
          isLoading={loadingState.isLoading}
        />
      </div>

      {error && <p className="text-red-600 mt-4 text-center font-semibold bg-red-100 p-3 rounded-md">{error}</p>}
      
      <ImagePreviewGrid imagePreviews={imagePreviews} />

      {imagePreviews.length > 0 && (
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={loadingState.isLoading}
            className="w-full bg-violet-600 text-white font-bold py-4 px-4 rounded-lg text-lg flex items-center justify-center gap-2 hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loadingState.isLoading ? (
              <>
                <Loader2 className="animate-spin h-6 w-6" />
                <span>{loadingState.message}</span>
              </>
            ) : (
              // Buton metnini de dil dosyasından al
              t('analyzeButton', { count: imagePreviews.length })
            )}
          </button>
        </div>
      )}
    </div>
  );
}
