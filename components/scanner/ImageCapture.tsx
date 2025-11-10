'use client';

import { useTranslations } from 'next-intl';
import { Camera, Upload } from 'lucide-react';
import { useRef } from 'react';

interface ImageCaptureProps {
  onFilesChange: (files: FileList) => void;
  disabled: boolean;
}

export default function ImageCapture({ onFilesChange, disabled }: ImageCaptureProps) {
  const t = useTranslations('ImageCapture');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesChange(event.target.files);
      // Reset the input value to allow selecting the same file again
      event.target.value = '';
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();
  const triggerCamera = () => cameraInputRef.current?.click();

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* File Upload Button */}
        <button
          onClick={triggerFileSelect}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-violet-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-6 w-6" />
          <span className="font-semibold">{t('uploadButton')}</span>
        </button>

        {/* Camera Capture Button */}
        <button
          onClick={triggerCamera}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-3 p-4 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="h-6 w-6" />
          <span>{t('cameraButton')}</span>
        </button>
      </div>

      {/* Hidden Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
        accept="image/*"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
        accept="image/*"
        capture="environment"
      />

      <p className="text-xs text-gray-500 mt-3 text-center">{t('infoText')}</p>
    </div>
  );
}