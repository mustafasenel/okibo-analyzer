'use client';
import { useState } from 'react';
import Image from 'next/image';
import { X, Loader2, CheckCircle2, AlertCircle, Camera, Search } from 'lucide-react';

type ImageFileStatus = 'pending' | 'processing' | 'completed' | 'error';

interface ImageFileWithStatus {
    id: string;
    preview: string;
    status: ImageFileStatus;
}

interface ImagePreviewGridProps {
    images: ImageFileWithStatus[];
    onRemove: (id: string) => void;
    onReplace: (id: string) => void; // Görseli yerinde değiştirmek için
    onPreview: (id: string) => void; // Görseli büyütmek için
    disabled: boolean;
}

const StatusIndicator = ({ status }: { status: ImageFileStatus }) => {
    const commonClasses = "absolute bottom-2 right-2 rounded-full p-1.5 text-white shadow-lg";

    switch (status) {
        case 'processing':
            return (
                <div className={`${commonClasses} bg-gray-600`}>
                    <Loader2 className="animate-spin h-5 w-5" />
                </div>
            );
        case 'completed':
            return (
                <div className={`${commonClasses} bg-green-600`}>
                    <CheckCircle2 className="h-5 w-5" />
                </div>
            );
        case 'error':
            return (
                <div className={`${commonClasses} bg-red-600`}>
                    <AlertCircle className="h-5 w-5" />
                </div>
            );
        case 'pending':
        default:
            return null;
    }
};

export function ImagePreviewGrid({ images, onRemove, onReplace, onPreview, disabled }: ImagePreviewGridProps) {
    return (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
                <div key={image.id} className="relative aspect-[2/3] group shadow-md rounded-lg overflow-hidden">
                    <div className="w-full h-full cursor-pointer" onClick={() => !disabled && onPreview(image.id)}>
                        <Image
                            src={image.preview}
                            alt={`Invoice page ${index + 1}`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                            <Search className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <StatusIndicator status={image.status} />
                    
                    {/* Top-right controls container */}
                    {!disabled && (
                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                                onClick={() => onRemove(image.id)}
                                className="bg-red-600 bg-opacity-80 text-white rounded-full p-1.5 hover:bg-opacity-100"
                                title="Görseli Sil"
                            >
                                <X size={16} />
                            </button>
                            <button
                                onClick={() => onReplace(image.id)}
                                className="bg-blue-600 bg-opacity-80 text-white rounded-full p-1.5 hover:bg-opacity-100"
                                title="Görseli Değiştir"
                            >
                                <Camera size={16} />
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}