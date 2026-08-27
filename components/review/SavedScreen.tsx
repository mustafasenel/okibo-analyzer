'use client';

import { useTranslations } from 'next-intl';
import { Check, ScanLine, History } from 'lucide-react';
import type { InvoiceSummary } from '@/types/invoice';
import { metaLabel } from '@/lib/invoice-labels';

interface SavedScreenProps {
    invoiceNo: string;
    itemCount: number;
    pageCount: number;
    flaggedCount: number;
    creditsUsed: number;
    summary: InvoiceSummary | null;
    lineTotal: number;
    mismatched: boolean;
    meta: Record<string, string | number>;
    onNewScan: () => void;
    onHistory: () => void;
}

const money = (v: unknown) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.'));
    if (!isFinite(n)) return '—';
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
};

/** Kaydedildi — masaüstüne devrediliyor. */
export default function SavedScreen({
    invoiceNo, itemCount, pageCount, flaggedCount, creditsUsed,
    summary, lineTotal, mismatched, meta, onNewScan, onHistory,
}: SavedScreenProps) {
    const t = useTranslations('SavedScreen');

    return (
        <div className="min-h-full bg-[var(--ok-surface)] pb-24">
            <div className="mx-auto w-full max-w-lg px-4 pt-6">
                <p className="text-[12.5px] text-[var(--ok-muted)]">
                    {t('subtitle', { invoiceNo, items: itemCount, pages: pageCount })}
                </p>

                <div className="mt-3 flex items-start gap-3 rounded-xl border border-[rgba(21,101,63,.25)] bg-[var(--ok-green-tint)] p-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ok-green-dot)] text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <p className="text-[13px] font-semibold leading-snug text-[var(--ok-green)]">
                        {flaggedCount > 0 ? t('savedWithFlags', { count: flaggedCount }) : t('saved')}
                    </p>
                </div>

                {/* Tek özet bloğu: faturanın yazdığı ve satırlardan hesaplanan yan yana */}
                <h3 className="ok-mono mb-2 mt-6 px-0.5 text-[10px] text-[var(--ok-muted)]">{t('amounts')}</h3>
                <div className="rounded-xl border border-[var(--ok-line)] bg-white px-3.5">
                    <Row label={t('net')} value={money(summary?.total_net)} />
                    <Row label={t('vat')} value={money(summary?.total_vat)} />
                    <Row
                        label={t('calculatedFromLines')}
                        value={money(lineTotal)}
                        note={mismatched ? t('hasDifference') : undefined}
                    />
                    <Row label={t('gross')} value={money(summary?.total_gross)} strong last />
                </div>

                {/* Etiketler Türkçe, faturadaki özgün metin altında */}
                {Object.keys(meta).length > 0 && (
                    <>
                        <h3 className="ok-mono mb-2 mt-6 px-0.5 text-[10px] text-[var(--ok-muted)]">{t('invoiceInfo')}</h3>
                        <div className="rounded-xl border border-[var(--ok-line)] bg-white px-3.5">
                            {Object.entries(meta).map(([key, value], i, arr) => {
                                const { label, original } = metaLabel(key);
                                return (
                                    <div
                                        key={key}
                                        className={`flex items-start justify-between gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-[var(--ok-line)]' : ''}`}
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-[13px] font-medium text-[var(--ok-body)]">{label}</span>
                                            {original && (
                                                <span className="block font-mono text-[9.5px] text-[var(--ok-muted-2)]">
                                                    {original}
                                                </span>
                                            )}
                                        </span>
                                        <span className="shrink-0 text-right text-[13px] font-bold text-[var(--ok-ink)]">
                                            {String(value)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Sayısal özet */}
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                    <Stat value={itemCount} label={t('statItems')} />
                    <Stat value={flaggedCount} label={t('statDesktop')} />
                    <Stat value={creditsUsed} label={t('statCredits')} />
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                    <button
                        onClick={onNewScan}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--ok-purple)] py-4 text-[15px] font-bold text-white transition active:scale-[.99]"
                    >
                        <ScanLine className="h-4 w-4" />
                        {t('newScan')}
                    </button>
                    <button
                        onClick={onHistory}
                        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--ok-line)] bg-white py-3.5 text-[14.5px] font-semibold text-[var(--ok-body)]"
                    >
                        <History className="h-4 w-4" />
                        {t('goHistory')}
                    </button>
                </div>
            </div>
        </div>
    );
}

const Row = ({ label, value, note, strong, last }: { label: string; value: string; note?: string; strong?: boolean; last?: boolean }) => (
    <div className={`flex items-center justify-between py-3 ${last ? '' : 'border-b border-[var(--ok-line)]'}`}>
        <span className="text-[13px] text-[var(--ok-body)]">{label}</span>
        <span className="flex items-baseline gap-2">
            {note && <span className="text-[11px] font-semibold text-[#7A4E00]">{note}</span>}
            <span className={`tabular-nums text-[var(--ok-ink)] ${strong ? 'text-[16px] font-bold' : 'text-[13.5px] font-semibold'}`}>
                {value}
            </span>
        </span>
    </div>
);

const Stat = ({ value, label }: { value: number; label: string }) => (
    <div className="rounded-xl border border-[var(--ok-line)] bg-white px-3 py-3 text-center">
        <div className="text-[19px] font-bold tabular-nums text-[var(--ok-ink)]">{value}</div>
        <div className="ok-mono mt-0.5 text-[8.5px] text-[var(--ok-muted)]">{label}</div>
    </div>
);
