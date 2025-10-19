'use client';
import { useState } from 'react';
import Image from 'next/image';
import { X, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

type ImageFileStatus = 'pending' | 'processing' | 'completed' | 'error';

interface ImageFileWithStatus {
    id: string;
    preview: string;
    status: ImageFileStatus;
}

interface ImagePreviewGridProps {
    images: ImageFileWithStatus[];
    onRemove: (id: string) => void;
    onRetry?: (id: string) => void;
    disabled: boolean;
}

const StatusIndicator = ({ status }: { status: ImageFileStatus }) => {
    switch (status) {
        case 'processing':
            return (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-white" />
                </div>
            );
        case 'completed':
            return (
                <div className="absolute inset-0 bg-green-700 bg-opacity-60 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
            );
        case 'error':
            return (
                <div className="absolute inset-0 bg-red-700 bg-opacity-60 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-white" />
                </div>
            );
        case 'pending':
        default:
            return null;
    }
};

export function ImagePreviewGrid({ images, onRemove, onRetry, disabled }: ImagePreviewGridProps) {
    return (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {images.map((image) => (
                <div key={image.id} className="relative aspect-square group">
                    <Image
                        src={image.preview}
                        alt="Preview"
                        fill
                        className="object-cover rounded-lg"
                    />
                    <StatusIndicator status={image.status} />
                    
                    {/* Remove button */}
                    {!disabled && (
                         <button
                            onClick={() => onRemove(image.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <X size={16} />
                        </button>
                    )}
                    
                    {/* Retry button for error status */}
                    {image.status === 'error' && onRetry && !disabled && (
                        <button
                            onClick={() => onRetry(image.id)}
                            className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Tekrar Dene"
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}