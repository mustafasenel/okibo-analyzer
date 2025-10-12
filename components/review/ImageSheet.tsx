'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button'; // Shadcn Button
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageSheetProps {
  images: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImageSheet({ images, open, onOpenChange }: ImageSheetProps) {
  const t = useTranslations('ReviewDataTabs.sheet');
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-1/2 flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('title')} ({t('page', { current: currentIndex + 1, total: images.length })})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 relative bg-gray-200 my-4 rounded-md overflow-hidden">
          {images.length > 0 && (
            <TransformWrapper>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => zoomIn()}><ZoomIn size={20} /></Button>
                    <Button variant="outline" size="icon" onClick={() => zoomOut()}><ZoomOut size={20} /></Button>
                    <Button variant="outline" size="icon" onClick={() => resetTransform()}><RotateCw size={20} /></Button>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <img src={images[currentIndex]} alt={`Fatura Sayfası ${currentIndex + 1}`} className="w-full h-full object-contain" />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
        <SheetFooter>
          <div className="w-full flex justify-between">
            <Button variant="outline" onClick={goToPrevious} disabled={images.length <= 1}>
              <ChevronLeft size={20} className="mr-2" /> {t('previous')}
            </Button>
            <Button onClick={goToNext} disabled={images.length <= 1}>
              {t('next')} <ChevronRight size={20} className="ml-2" />
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
