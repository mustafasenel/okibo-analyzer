'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button'; // Shadcn Button
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';

interface ImageSheetProps {
  images: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string; // Veritabanından görsel çekmek için
}

export default function ImageSheet({ images, open, onOpenChange, invoiceId }: ImageSheetProps) {
  const t = useTranslations('ReviewDataTabs.sheet');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dbImages, setDbImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [displayImages, setDisplayImages] = useState<string[]>(images);

  // Veritabanından görselleri çek
  useEffect(() => {
    if (invoiceId && open) {
      setIsLoadingImages(true);
      fetch(`/api/invoices/images?invoiceId=${invoiceId}`)
        .then(response => response.json())
        .then(data => {
          if (data.success && data.images) {
            // Buffer'ları Base64 data URL'lerine çevir
            const base64Images = data.images.map((img: any) => {
              // Server'dan gelen data zaten Base64 string olarak geliyor
              return `data:${img.mimeType};base64,${img.data}`;
            });
            setDbImages(base64Images);
            setDisplayImages(base64Images);
          }
        })
        .catch(error => {
          console.error('Görseller yüklenirken hata:', error);
          setDisplayImages(images); // Fallback olarak sessionStorage'daki görselleri kullan
        })
        .finally(() => {
          setIsLoadingImages(false);
        });
    } else {
      setDisplayImages(images);
    }
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
