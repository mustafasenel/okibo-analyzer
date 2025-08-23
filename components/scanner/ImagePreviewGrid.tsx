'use client';
import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface ImagePreviewGridProps {
  imagePreviews: string[];
}

export default function ImagePreviewGrid({ imagePreviews }: ImagePreviewGridProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (imagePreviews.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-lg text-gray-800 mb-3">Seçilen Sayfalar ({imagePreviews.length})</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {imagePreviews.map((src, index) => (
          <div 
            key={index} 
            className="relative aspect-[3/4] rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setSelectedImage(src)}
          >
            <Image
              src={src}
              alt={`Yüklenen sayfa ${index + 1}`}
              layout="fill"
              objectFit="cover"
            />
          </div>
        ))}
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white z-60"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          
          <div 
            className="relative w-full h-full max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
          >
            <Image
              src={selectedImage}
              alt="Tam ekran fatura görüntüsü"
              layout="fill"
              objectFit="contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}