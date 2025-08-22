'use client';

import { Camera, GalleryHorizontal } from 'lucide-react';
import React, { useRef } from 'react';
import { useTranslations } from 'next-intl'; // Adım 1: Gerekli hook'u import et

interface ImageCaptureProps {
  onImagesCaptured: (files: FileList) => void;
  isLoading: boolean;
}

export default function ImageCapture({ onImagesCaptured, isLoading }: ImageCaptureProps) {
  // Adım 2: JSON dosyasındaki 'ScannerPage' anahtarından çevirileri al
  const t = useTranslations('ScannerPage'); 
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImagesCaptured(event.target.files);
    }
    // Kullanıcının aynı dosyaları tekrar seçebilmesi için input'u sıfırla
    event.target.value = ''; 
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Kamera Butonu */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        disabled={isLoading}
        className="flex flex-col items-center justify-center p-6 bg-violet-50 text-violet-700 rounded-lg border-2 border-dashed border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-50"
      >
        <Camera className="h-10 w-10 mb-2" />
        {/* Adım 3: Sabit metni t() fonksiyonu ile değiştir */}
        <span className="font-semibold text-center">{t('captureFromCamera')}</span> 
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </button>
      
      {/* Galeri Butonu */}
      <button
        onClick={() => galleryInputRef.current?.click()}
        disabled={isLoading}
        className="flex flex-col items-center justify-center p-6 bg-gray-50 text-gray-700 rounded-lg border-2 border-dashed border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <GalleryHorizontal className="h-10 w-10 mb-2" />
        {/* Adım 3: Sabit metni t() fonksiyonu ile değiştir */}
        <span className="font-semibold text-center">{t('captureFromGallery')}</span>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </button>
    </div>
  );
}