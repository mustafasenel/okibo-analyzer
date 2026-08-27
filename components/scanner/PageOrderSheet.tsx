'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronLeft, GripVertical, RotateCw, Trash2, Camera, Plus } from 'lucide-react';
import type { ScanPage } from '@/types/scan';

interface PageOrderSheetProps {
    pages: ScanPage[];
    creditCost: number;
    estimatedSeconds: number;
    onClose: () => void;
    onReorder: (from: number, to: number) => void;
    onRotate: (id: string) => void;
    onDelete: (id: string) => void;
    onRecapture: (id: string) => void;
    onAddPages: () => void;
    onStart: () => void;
    busyId?: string | null;
}

/** Sayfa sırası ekranı — sıra faturadaki sırayla aynı olmalı. */
export default function PageOrderSheet({
    pages, creditCost, estimatedSeconds, onClose, onReorder,
    onRotate, onDelete, onRecapture, onAddPages, onStart, busyId,
}: PageOrderSheetProps) {
    const t = useTranslations('PageOrder');
    const listRef = useRef<HTMLDivElement>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragDelta, setDragDelta] = useState(0);
    const rowHeight = useRef(96);

    // Dokunmatik + fare uyumlu sürükleme
    const startDrag = (index: number) => (e: React.PointerEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const rows = listRef.current?.querySelectorAll('[data-row]');
        if (rows && rows.length > 1) {
            const a = rows[0].getBoundingClientRect();
            const b = rows[1].getBoundingClientRect();
            rowHeight.current = Math.max(40, b.top - a.top);
        }
        setDragIndex(index);
        setDragDelta(0);
        // Pointer capture'a gerek yok (dinleyiciler window'da); bazı ortamlarda hata fırlatıp
        // sürüklemeyi tamamen kırabildiği için kullanılmıyor.

        const move = (ev: PointerEvent) => setDragDelta(ev.clientY - startY);
        const end = (ev: PointerEvent) => {
            const shift = Math.round((ev.clientY - startY) / rowHeight.current);
            const to = Math.max(0, Math.min(pages.length - 1, index + shift));
            if (to !== index) onReorder(index, to);
            setDragIndex(null);
            setDragDelta(0);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
    };

    const targetIndex = dragIndex === null
        ? null
        : Math.max(0, Math.min(pages.length - 1, dragIndex + Math.round(dragDelta / rowHeight.current)));

    const rowOffset = (index: number) => {
        if (dragIndex === null || targetIndex === null) return 0;
        if (index === dragIndex) return dragDelta;
        if (dragIndex < targetIndex && index > dragIndex && index <= targetIndex) return -rowHeight.current;
        if (dragIndex > targetIndex && index < dragIndex && index >= targetIndex) return rowHeight.current;
        return 0;
    };

    return (
        <div className="fixed inset-0 z-[55] flex flex-col bg-white">
            {/* Başlık */}
            <div className="mx-auto w-full max-w-lg flex items-center justify-between border-b border-[var(--ok-line)] px-4 py-3.5">
                <button onClick={onClose} className="flex items-center gap-1 text-sm font-semibold text-[var(--ok-body)]">
                    <ChevronLeft className="h-4 w-4" />
                    {t('back')}
                </button>
                <h2 className="text-[15px] font-bold text-[var(--ok-ink)]">{t('title')}</h2>
                <button onClick={onClose} className="text-sm font-bold text-[var(--ok-purple)]">{t('done')}</button>
            </div>

            <div className="mx-auto w-full max-w-lg min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
                <p className="mb-4 text-[13px] leading-relaxed text-[var(--ok-muted)]">{t('description')}</p>

                <div ref={listRef} className="flex flex-col gap-2.5">
                    {pages.map((page, index) => {
                        const blurry = page.sharpness === 'blurry';
                        const isDragging = dragIndex === index;
                        return (
                            <div
                                key={page.id}
                                data-row
                                style={{
                                    transform: `translateY(${rowOffset(index)}px)`,
                                    transition: isDragging ? 'none' : 'transform .18s ease',
                                    zIndex: isDragging ? 10 : 1,
                                }}
                                className={`relative flex items-center gap-3 rounded-xl border bg-white p-2.5 ${
                                    blurry ? 'border-[rgba(224,168,32,.55)] bg-[var(--ok-amber-tint)]' : 'border-[var(--ok-line)]'
                                } ${isDragging ? 'shadow-xl' : ''}`}
                            >
                                <button
                                    onPointerDown={startDrag(index)}
                                    className="shrink-0 cursor-grab touch-none p-1 text-[var(--ok-faint)] active:cursor-grabbing"
                                    aria-label={t('dragHandle')}
                                >
                                    <GripVertical className="h-5 w-5" />
                                </button>

                                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--ok-line)] bg-[var(--ok-surface)]">
                                    <Image src={page.preview} alt="" fill className="object-cover" unoptimized />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-[var(--ok-ink)]">{t('page', { index: index + 1 })}</span>
                                        {page.sharpness === 'sharp' && (
                                            <span className="ok-mono rounded-[5px] bg-[var(--ok-green-tint)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ok-green)]">
                                                {t('sharp')}
                                            </span>
                                        )}
                                        {blurry && (
                                            <span className="ok-mono rounded-[5px] bg-white px-1.5 py-0.5 text-[9px] font-bold text-[var(--ok-amber)]">
                                                {t('blurry')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--ok-muted)]">
                                        {blurry ? t('blurryHint') : t('sharpHint')}
                                    </p>
                                    {blurry && (
                                        <button
                                            onClick={() => onRecapture(page.id)}
                                            className="mt-1.5 inline-flex items-center gap-1 rounded-[6px] bg-[var(--ok-amber)] px-2 py-1 text-[11px] font-bold text-white"
                                        >
                                            <Camera className="h-3 w-3" />
                                            {t('recapture')}
                                        </button>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-col gap-1">
                                    <button
                                        onClick={() => onRotate(page.id)}
                                        disabled={busyId === page.id}
                                        className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-semibold text-[var(--ok-body)] hover:bg-[var(--ok-surface)] disabled:opacity-40"
                                    >
                                        <RotateCw className="h-3 w-3" />
                                        {t('rotate')}
                                    </button>
                                    <button
                                        onClick={() => onDelete(page.id)}
                                        className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-semibold text-[var(--ok-danger)] hover:bg-[#FCEEF4]"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        {t('delete')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={onAddPages}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--ok-faint)] py-3.5 text-[13px] font-semibold text-[var(--ok-muted)]"
                >
                    <Plus className="h-4 w-4" />
                    {t('addPage')}
                </button>
            </div>

            {/* Alt aksiyon */}
            <div className="mx-auto w-full max-w-lg border-t border-[var(--ok-line)] bg-white px-4 pb-6 pt-3">
                <p className="mb-2.5 text-[11.5px] leading-relaxed text-[var(--ok-muted)]">
                    {t('stayNote', { seconds: estimatedSeconds })}
                </p>
                <button
                    onClick={onStart}
                    disabled={pages.length === 0}
                    className="flex w-full items-center justify-between rounded-xl bg-[var(--ok-ink)] px-5 py-4 text-left text-white disabled:opacity-40"
                >
                    <span>
                        <span className="block text-[15px] font-bold">{t('start')}</span>
                        <span className="mt-0.5 block text-[12px] opacity-70">
                            {t('startMeta', { pages: pages.length, credits: creditCost })}
                        </span>
                    </span>
                    <span className="text-lg">→</span>
                </button>
            </div>
        </div>
    );
}
