'use client';

import { useTranslations } from 'next-intl';
import type { InvoiceItem } from '@/types/invoice';
import { cellKey, type SuspicionField } from '@/lib/suspicion';

interface InvoiceTableProps {
    items: InvoiceItem[];
    page: number;                       // 0 tabanlı sayfa indeksi
    suspicious: Map<string, string>;    // cellKey -> gerekçe (otomatik tespit)
    onCellPress: (row: number, field: SuspicionField) => void;
}

const fmt = (v: unknown, digits = 2) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.'));
    if (!isFinite(n)) return '—';
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
};

/**
 * Fatura kalemleri — kullanıcının alışık olduğu tüm kolonlar korunur.
 * Okunurluk için: ürün kolonu sabit (yatay kaydırmada yerinde kalır),
 * sayılar sağa hizalı ve tabular, satır yüksekliği 44px, başlıklar yapışkan.
 */
export default function InvoiceTable({ items, page, suspicious, onCellPress }: InvoiceTableProps) {
    const t = useTranslations('ReviewTable');

    // KDV kolonu yalnızca faturada varsa gösterilir
    const hasVat = items.some(i => i.MwSt !== undefined && i.MwSt !== null);

    const mark = (row: number, field: SuspicionField, extra = '') =>
        suspicious.has(cellKey(page, row, field))
            ? `${extra} rounded-[5px] bg-[#FBF3DF] font-bold text-[#5C4200] shadow-[inset_0_0_0_1.5px_#C98A00]`
            : extra;

    const press = (row: number, field: SuspicionField) => {
        if (suspicious.has(cellKey(page, row, field))) onCellPress(row, field);
    };

    const num = 'shrink-0 px-2 py-2 text-right text-[12.5px]';
    const head = 'shrink-0 px-2 py-2.5 text-right';

    return (
        <div className="overflow-x-auto rounded-xl border border-[rgba(20,18,28,.12)] bg-white">
            <div className="min-w-max">
                {/* Yapışkan başlık */}
                <div className="ok-mono flex border-b border-[rgba(20,18,28,.1)] bg-[#FAF9FC] text-[9.5px] tracking-[.06em] text-[var(--ok-muted)]">
                    <div className="sticky left-0 z-10 w-[132px] shrink-0 border-r border-[rgba(20,18,28,.08)] bg-[#FAF9FC] px-2.5 py-2.5">
                        {t('product')}
                    </div>
                    <div className={`${head} w-[42px]`}>{t('boxes')}</div>
                    <div className={`${head} w-[48px]`}>{t('content')}</div>
                    <div className={`${head} w-[46px]`}>{t('qty')}</div>
                    <div className={`${head} w-[56px]`}>{t('price')}</div>
                    {hasVat && <div className={`${head} w-[44px]`}>{t('vat')}</div>}
                    <div className={`${head} w-[72px]`}>{t('netCalc')}</div>
                    <div className={`${head} w-[72px] pr-2.5`}>{t('netOcr')}</div>
                </div>

                {items.map((item, row) => {
                    const calc = item.originalNetto ?? item.Netto;
                    const ocr = item.Netto;
                    const diff = Math.abs(Number(calc ?? 0) - Number(ocr ?? 0)) > 0.02;

                    return (
                        <div key={row} className="flex min-h-[44px] items-center border-b border-[rgba(20,18,28,.06)] tabular-nums last:border-b-0">
                            {/* Ürün — sabit kolon: ad + ürün kodu */}
                            <button
                                onClick={() => press(row, 'ArtikelBez')}
                                className="sticky left-0 z-10 w-[132px] shrink-0 border-r border-[rgba(20,18,28,.08)] bg-white px-2.5 py-2 text-left"
                            >
                                <div className={mark(row, 'ArtikelBez', 'truncate text-[12.5px] font-semibold')}>
                                    {item.ArtikelBez || t('noName')}
                                </div>
                                <div className="mt-px font-mono text-[10px] text-[var(--ok-muted-2)]">
                                    {item.ArtikelNumber || '—'}
                                </div>
                            </button>

                            <div className={`${num} w-[42px]`}>{item.Kolli ?? '—'}</div>
                            <div className={`${num} w-[48px]`}>{item.Inhalt ?? '—'}</div>

                            <button onClick={() => press(row, 'Menge')} className={`${num} w-[46px]`}>
                                <span className={mark(row, 'Menge', 'inline-block px-1')}>{item.Menge ?? '—'}</span>
                            </button>

                            <button onClick={() => press(row, 'Preis')} className={`${num} w-[56px]`}>
                                <span className={mark(row, 'Preis', 'inline-block px-1')}>{fmt(item.Preis, 2)}</span>
                            </button>

                            {hasVat && (
                                <div className={`${num} w-[44px]`}>{item.MwSt !== undefined && item.MwSt !== null ? `%${item.MwSt}` : '—'}</div>
                            )}

                            {/* Hesaplanan net (miktar × fiyat) */}
                            <div className={`${num} w-[72px] font-bold`}>{fmt(calc)}</div>

                            {/* OCR'ın okuduğu net — hesaplanandan farklıysa vurgulanır */}
                            <button onClick={() => press(row, 'Netto')} className={`${num} w-[72px] pr-2.5`}>
                                <span className={mark(row, 'Netto', `inline-block px-1 ${diff ? 'font-bold' : ''}`)}>
                                    {fmt(ocr)}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
