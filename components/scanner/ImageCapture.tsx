'use client';

import { useTranslations } from 'next-intl';
import { Camera, FileUp } from 'lucide-react';

interface ImageCaptureProps {
  onCamera: () => void;
  onFiles: () => void;
  disabled: boolean;
}

/** Tarama panelinin iki eylemi: kamerayla çek (birincil) ve dosyadan yükle. */
export default function ImageCapture({ onCamera, onFiles, disabled }: ImageCaptureProps) {
  const t = useTranslations('ImageCapture');

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* Birincil eylem — mor yalnızca burada kullanılır */}
      <button
        onClick={onCamera}
        disabled={disabled}
        className="flex flex-col justify-between rounded-xl bg-[var(--ok-purple)] p-3.5 text-left text-white transition active:scale-[.99] disabled:opacity-45"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/15">
          <Camera className="h-[18px] w-[18px]" />
        </span>
        <span className="mt-6">
          <span className="block text-[15px] font-bold leading-tight">{t('cameraButton')}</span>
          <span className="mt-0.5 block text-[11.5px] opacity-75">{t('cameraHint')}</span>
        </span>
      </button>

      <button
        onClick={onFiles}
        disabled={disabled}
        className="flex flex-col justify-between rounded-xl border border-[var(--ok-line)] bg-white p-3.5 text-left transition active:scale-[.99] disabled:opacity-45"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[var(--ok-line)] bg-[var(--ok-surface-2)]">
          <FileUp className="h-[18px] w-[18px] text-[var(--ok-body)]" />
        </span>
        <span className="mt-6">
          <span className="block text-[15px] font-bold leading-tight text-[var(--ok-ink)]">{t('uploadButton')}</span>
          <span className="mt-0.5 block text-[11.5px] text-[var(--ok-muted)]">{t('uploadHint')}</span>
        </span>
      </button>
    </div>
  );
}
