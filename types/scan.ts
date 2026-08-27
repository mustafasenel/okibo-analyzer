import type { SharpnessLabel } from '@/lib/quality';

/** Tek bir sayfanın analiz akışındaki durumu. */
export type PageStatus = 'idle' | 'queued' | 'reading' | 'done' | 'failed';

export interface ScanPage {
    id: string;
    file: File;
    preview: string;
    sharpness: SharpnessLabel;
    status: PageStatus;
    /** Analiz sonucu (ham AI çıktısı) */
    result?: any;
    /** Bulunan kalem satırı sayısı */
    itemCount?: number;
    /** Sayfanın okunma süresi (ms) */
    durationMs?: number;
}
