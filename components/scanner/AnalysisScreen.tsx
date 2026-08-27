'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ScanPage } from '@/types/scan';
import { useWakeLock } from '@/hooks/use-wake-lock';

interface AnalysisScreenProps {
    pages: ScanPage[];
    /** Kaydetme aşamasına geçildiyse (sayfalar bitti, görseller yükleniyor) */
    saving: boolean;
    etaSeconds: number | null;
    onCancel: () => void;
    onRetryPage: (id: string) => void;
    /** Hatalı sayfa varken okunan sayfalarla devam etme seçeneği */
    onContinue?: () => void;
}

/** Tam ekran analiz — istek arka planda sürmediği için kullanıcı burada tutulur. */
export default function AnalysisScreen({ pages, saving, etaSeconds, onCancel, onRetryPage, onContinue }: AnalysisScreenProps) {
    const t = useTranslations('AnalysisScreen');
    const [confirmCancel, setConfirmCancel] = useState(false);

    // Analiz boyunca ekran uyanık kalsın
    useWakeLock(true);

    const total = pages.length;
    const done = pages.filter(p => p.status === 'done').length;
    const failed = pages.filter(p => p.status === 'failed').length;
    const settled = done + failed;
    const reading = pages.find(p => p.status === 'reading');
    const readingIndex = reading ? pages.indexOf(reading) + 1 : settled;

    // Sayfa okuma toplam işin ~%80'i, kaydetme %20'si
    const percent = Math.min(100, Math.round((settled / Math.max(1, total)) * 80 + (saving ? 20 : 0)));

    const allSettled = settled === total;
    const headline = saving
        ? t('savingHeadline')
        : reading
        ? t('readingHeadline', { page: readingIndex, current: settled, total })
        : allSettled
        ? t('finishingHeadline')
        : t('startingHeadline');

    const subline = saving
        ? t('savingSubline')
        : etaSeconds !== null && etaSeconds > 0
        ? t('readingSubline', { seconds: etaSeconds })
        : t('readingSublineNoEta');

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--ok-ink)] text-white">
            {/* Ekranda kal uyarısı */}
            <div className="mx-4 mt-4 flex items-center gap-2.5 rounded-[10px] border border-[rgba(224,168,32,.45)] bg-[rgba(201,138,0,.16)] px-3 py-2.5">
                <span
                    className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--ok-amber-dot)]"
                    style={{ animation: 'ok-soft-pulse 1.6s ease-in-out infinite' }}
                />
                <p className="text-[11.5px] font-semibold leading-snug">{t('stayWarning')}</p>
            </div>

            {/* Yüzde ve başlık */}
            <div className="flex flex-col items-start gap-2 px-6 pb-5 pt-6">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-[72px] font-bold leading-[.9] tracking-[-.04em] tabular-nums">{percent}</span>
                    <span className="text-2xl font-semibold opacity-50">%</span>
                </div>
                <p className="text-base font-semibold">{headline}</p>
                <p className="text-[12.5px] leading-relaxed opacity-55">{subline}</p>
                <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-white/15">
                    <div
                        className="h-full rounded-full bg-[var(--ok-purple-light)] transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(percent, 3)}%` }}
                    />
                </div>
            </div>

            {/* Sayfa listesi */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-[18px] pb-2">
                <div className="ok-mono px-1 pb-0.5 text-[10.5px] opacity-45">{t('pagesLabel')}</div>
                {pages.map((page, index) => (
                    <PageRow key={page.id} page={page} index={index + 1} onRetry={() => onRetryPage(page.id)} />
                ))}
            </div>

            {/* Alt bilgi + iptal */}
            <div className="flex flex-col gap-2.5 px-[18px] pb-7 pt-3.5">
                {failed > 0 && (
                    <div className="rounded-[10px] bg-white/5 px-3.5 py-3 text-[11.5px] leading-relaxed opacity-75">
                        {t('failedNote', { count: failed })}
                    </div>
                )}
                {onContinue && (
                    <button
                        onClick={onContinue}
                        className="rounded-xl bg-[var(--ok-purple)] py-3.5 text-center text-[14.5px] font-bold transition active:scale-[.99]"
                    >
                        {t('continueWithRead', { count: done })}
                    </button>
                )}
                {!confirmCancel ? (
                    <button
                        onClick={() => setConfirmCancel(true)}
                        className="rounded-xl border border-white/25 py-3.5 text-center text-[14.5px] font-semibold opacity-80 transition active:scale-[.99]"
                    >
                        {t('cancel')}
                    </button>
                ) : (
                    <div className="flex flex-col gap-2 rounded-xl border border-white/20 bg-white/5 p-3">
                        <p className="text-[12.5px] leading-snug opacity-80">{t('cancelConfirmText')}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmCancel(false)}
                                className="flex-1 rounded-lg border border-white/25 py-2.5 text-[13.5px] font-semibold"
                            >
                                {t('cancelKeep')}
                            </button>
                            <button
                                onClick={onCancel}
                                className="flex-1 rounded-lg bg-[var(--ok-danger-dot)] py-2.5 text-[13.5px] font-semibold"
                            >
                                {t('cancelConfirm')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PageRow({ page, index, onRetry }: { page: ScanPage; index: number; onRetry: () => void }) {
    const t = useTranslations('AnalysisScreen');

    const base = 'flex items-center gap-3 rounded-xl px-3.5 py-3 border';
    const styles: Record<string, string> = {
        done: 'bg-white/[.06] border-white/10',
        reading: 'bg-[rgba(139,92,255,.16)] border-[rgba(139,92,255,.5)]',
        failed: 'bg-white/[.04] border-[rgba(214,90,90,.5)]',
        queued: 'bg-white/[.04] border-white/[.07] opacity-70',
        idle: 'bg-white/[.04] border-white/[.07] opacity-70',
    };

    return (
        <div className={`${base} ${styles[page.status] ?? styles.queued}`}>
            {/* Durum göstergesi */}
            {page.status === 'done' ? (
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--ok-green-dot)] text-xs font-bold">✓</span>
            ) : page.status === 'reading' ? (
                <span
                    className="h-[22px] w-[22px] shrink-0 rounded-full border-[2.5px] border-white/20"
                    style={{ borderTopColor: 'var(--ok-purple-soft)', animation: 'ok-spin-arc .9s linear infinite' }}
                />
            ) : page.status === 'failed' ? (
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--ok-danger-dot)] text-xs font-bold">!</span>
            ) : (
                <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] border-dashed border-white/35" />
            )}

            <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{t('pageTitle', { index })}</div>
                <div className="mt-px truncate text-[11.5px] opacity-60">
                    {page.status === 'done'
                        ? t('pageDone', { count: page.itemCount ?? 0 })
                        : page.status === 'reading'
                        ? t('pageReading')
                        : page.status === 'failed'
                        ? t('pageFailed')
                        : t('pageQueued')}
                </div>
            </div>

            {page.status === 'done' && page.durationMs !== undefined && (
                <span className="shrink-0 text-[11.5px] opacity-50">
                    {(page.durationMs / 1000).toFixed(1)} sn
                </span>
            )}
            {page.status === 'failed' && (
                <button onClick={onRetry} className="shrink-0 text-[11.5px] font-bold text-[var(--ok-purple-soft)]">
                    {t('retry')}
                </button>
            )}
        </div>
    );
}
