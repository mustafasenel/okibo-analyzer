'use client';

import { X } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ imageUrl, onClose }: ImageLightboxProps) {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <button 
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50"
        onClick={onClose}
      >
        <X size={32} />
      </button>
      {/* Stop propagation to prevent closing when clicking on the image itself */}
      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Enlarged invoice view" 
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>
    </div>
  );
}
