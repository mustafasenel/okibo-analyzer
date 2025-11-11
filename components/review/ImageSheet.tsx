'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button'; // Shadcn Button
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';

interface ImageSheetProps {
  images: string[]; // Bu, URL'lerin bir dizisidir
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string; // Veritabanından görsel çekmek için
}

export default function ImageSheet({ images, open, onOpenChange, invoiceId }: ImageSheetProps) {
  const t = useTranslations('ReviewDataTabs.sheet');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayImages, setDisplayImages] = useState<string[]>(images);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // open durumu değiştiğinde görselleri ayarla
  useEffect(() => {
    // Düzenleme modunda değilsek veya 'open' false ise, prop'tan gelen görselleri kullan
    if (!invoiceId || !open) {
      setDisplayImages(images);
      return;
    }

    // Düzenleme modundaysak ve sheet açıldıysa, API'den taze veri çek
    setIsLoadingImages(true);
    fetch(`/api/invoices/images?invoiceId=${invoiceId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.images) {
          // Gelen veri: { publicId, url, ... }[]
          // Biz sadece URL'leri alıyoruz: string[]
          const imageUrls = data.images.map((img: { url: string }) => img.url);
          setDisplayImages(imageUrls);
        } else {
          // API'den veri gelmezse, prop'taki görselleri kullan (fallback)
          setDisplayImages(images);
        }
      })
      .catch(error => {
        console.error('Görseller yüklenirken hata:', error);
        setDisplayImages(images); // Hata durumunda da prop'taki görselleri kullan
      })
      .finally(() => {
        setIsLoadingImages(false);
      });

  }, [invoiceId, open, images]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : displayImages.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < displayImages.length - 1 ? prevIndex + 1 : 0));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-1/2 flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('title')} ({t('page', { current: currentIndex + 1, total: displayImages.length })})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 relative bg-gray-200 my-4 rounded-md overflow-hidden">
          {isLoadingImages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin h-8 w-8 text-violet-600" />
            </div>
          ) : displayImages.length > 0 ? (
            <TransformWrapper>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => zoomIn()}><ZoomIn size={20} /></Button>
                    <Button variant="outline" size="icon" onClick={() => zoomOut()}><ZoomOut size={20} /></Button>
                    <Button variant="outline" size="icon" onClick={() => resetTransform()}><RotateCw size={20} /></Button>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <img src={displayImages[currentIndex]} alt={`Fatura Sayfası ${currentIndex + 1}`} className="w-full h-full object-contain" />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Görsel bulunamadı
            </div>
          )}
        </div>
        <SheetFooter>
          <div className="w-full flex justify-between">
            <Button variant="outline" onClick={goToPrevious} disabled={displayImages.length <= 1}>
              <ChevronLeft size={20} className="mr-2" /> {t('previous')}
            </Button>
            <Button onClick={goToNext} disabled={displayImages.length <= 1}>
              {t('next')} <ChevronRight size={20} className="ml-2" />
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
