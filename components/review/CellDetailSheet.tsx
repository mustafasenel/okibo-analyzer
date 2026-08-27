'use client';

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useTranslations } from 'next-intl';
import { X, Camera } from 'lucide-react';
import type { SuspicionField, SuspicionReason } from '@/lib/suspicion';

interface CellDetailSheetProps {
    invoiceLabel: string;         // "RE-2026-77 · 19.07.2026"
    productName: string;
    fieldLabel: string;
    page: number;                 // 1 tabanlı gösterim
    row: number;                  // 1 tabanlı gösterim
    reason: SuspicionReason | null;
    readValue: string;
    imageUrl?: string;
    canRescan: boolean;
    onRescan: () => void;
    onClose: () => void;
}

/** Hücreye dokununca düzenleme değil, kaynağı gösterir. Düzeltme masaüstünde yapılır. */
export default function CellDetailSheet({
    invoiceLabel, productName, fieldLabel, page, row, reason,
    readValue, imageUrl, canRescan, onRescan, onClose,
}: CellDetailSheetProps) {
    const t = useTranslations('CellDetail');

    return (
        <div className="fixed inset-0 z-[55] flex flex-col bg-white">
            <div className="mx-auto w-full max-w-lg flex items-center justify-between border-b border-[var(--ok-line)] px-4 py-3.5">
                <span className="text-[12.5px] text-[var(--ok-muted)]">{invoiceLabel}</span>
                <button onClick={onClose} aria-label={t('close')} className="text-[var(--ok-body)]">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="mx-auto w-full max-w-lg min-h-0 flex-1 overflow-y-auto px-4 pt-4">
                <h2 className="text-[17px] font-bold text-[var(--ok-ink)]">
                    {productName} · {fieldLabel}
                </h2>
                <p className="mt-1 text-[12px] text-[var(--ok-muted)]">
                    {t('location', { page, row })}
                </p>

                {reason && (
                    <span className="ok-mono mt-2.5 inline-block rounded-[5px] bg-[#FBF3DF] px-2 py-1 text-[9.5px] font-bold text-[#5C4200]">
                        {t(`reason.${reason}`)}
                    </span>
                )}

                {/* Kaynak görüntü — yakınlaştırılabilir */}
                <div className="mt-3.5 overflow-hidden rounded-xl border border-[var(--ok-line)] bg-[var(--ok-surface)]">
                    {imageUrl ? (
                        <TransformWrapper doubleClick={{ mode: 'zoomIn' }}>
                            <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imageUrl} alt="" className="h-[280px] w-full object-contain" />
                            </TransformComponent>
                        </TransformWrapper>
                    ) : (
                        <div className="flex h-[280px] items-center justify-center text-[12.5px] text-[var(--ok-muted)]">
                            {t('noImage')}
                        </div>
                    )}
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--ok-muted-2)]">{t('zoomHint')}</p>

                <div className="mt-3.5 flex items-center justify-between rounded-xl border border-[var(--ok-line)] bg-white px-3.5 py-3">
                    <span className="text-[12.5px] text-[var(--ok-muted)]">{t('readValue')}</span>
                    <span className="text-[15px] font-bold tabular-nums text-[var(--ok-ink)]">{readValue}</span>
                </div>

                <p className="mt-3.5 text-[12px] leading-relaxed text-[var(--ok-muted)]">{t('autoNote')}</p>
            </div>

            <div className="mx-auto w-full max-w-lg flex flex-col gap-2 border-t border-[var(--ok-line)] px-4 pb-6 pt-3">
                {canRescan && (
                    <button
                        onClick={onRescan}
                        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--ok-line)] py-3.5 text-[14.5px] font-semibold text-[var(--ok-body)]"
                    >
                        <Camera className="h-4 w-4" />
                        {t('rescan')}
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="rounded-xl bg-[var(--ok-purple)] py-3.5 text-[14.5px] font-bold text-white transition active:scale-[.99]"
                >
                    {t('close')}
                </button>
            </div>
        </div>
    );
}
