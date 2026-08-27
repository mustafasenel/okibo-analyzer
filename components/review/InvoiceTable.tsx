'use client';

import { useTranslations } from 'next-intl';
import type { InvoiceItem } from '@/types/invoice';
import { cellKey, type SuspicionField } from '@/lib/suspicion';

interface InvoiceTableProps {
    items: InvoiceItem[];
    page: number;                       // 0 tabanlı sayfa indeksi
    suspicious: Map<string, string>;    // cellKey -> gerekçe
    flagged: Set<string>;               // masaüstü kuyruğuna işaretlenenler
    onCellPress: (row: number, field: SuspicionField) => void;
}

const fmt = (v: unknown, digits = 2) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.'));
    if (!isFinite(n)) return '-';
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
};

/** Alışık olunan tablo formatı korunur; yalnızca okunurluk ve şüpheli hücre işareti eklenir. */
export default function InvoiceTable({ items, page, suspicious, flagged, onCellPress }: InvoiceTableProps) {
    const t = useTranslations('ReviewTable');

    const cellClass = (row: number, field: SuspicionField, extra = '') => {
        const key = cellKey(page, row, field);
        const isSuspicious = suspicious.has(key);
        const isFlagged = flagged.has(key);
        if (isFlagged) {
            return `${extra} rounded-[5px] bg-[#EFE9FD] font-bold text-[var(--ok-purple)] shadow-[inset_0_0_0_1.5px_var(--ok-purple)]`;
        }
        if (isSuspicious) {
            return `${extra} rounded-[5px] bg-[#FBF3DF] font-bold text-[#5C4200] shadow-[inset_0_0_0_1.5px_#C98A00]`;
        }
        return extra;
    };

    const press = (row: number, field: SuspicionField) => {
        if (suspicious.has(cellKey(page, row, field)) || flagged.has(cellKey(page, row, field))) {
            onCellPress(row, field);
        }
    };

    return (
        <div className="overflow-hidden rounded-xl border border-[rgba(20,18,28,.12)] bg-white">
            {/* Yapışkan başlık */}
            <div className="ok-mono sticky top-0 z-10 flex border-b border-[rgba(20,18,28,.1)] bg-[#FAF9FC] text-[9.5px] tracking-[.06em] text-[var(--ok-muted)]">
                <div className="w-[118px] shrink-0 border-r border-[rgba(20,18,28,.08)] px-2.5 py-2.5">{t('product')}</div>
                <div className="w-[38px] shrink-0 px-1 py-2.5 text-right">{t('boxes')}</div>
                <div className="w-[40px] shrink-0 px-1 py-2.5 text-right">{t('qty')}</div>
                <div className="w-[48px] shrink-0 px-1 py-2.5 text-right">{t('price')}</div>
                <div className="flex-1 py-2.5 pl-1 pr-2.5 text-right">{t('net')}</div>
            </div>

            {items.map((item, row) => (
                <div
                    key={row}
                    className="flex min-h-[44px] items-center border-b border-[rgba(20,18,28,.06)] tabular-nums last:border-b-0"
                >
                    <button
                        onClick={() => press(row, 'ArtikelBez')}
                        className="w-[118px] shrink-0 border-r border-[rgba(20,18,28,.08)] px-2.5 py-2 text-left"
                    >
                        <div className={cellClass(row, 'ArtikelBez', 'truncate text-[12.5px] font-semibold')}>
                            {item.ArtikelBez || t('noName')}
                        </div>
                        <div className="ok-mono mt-px text-[10px] normal-case tracking-normal text-[var(--ok-muted-2)]">
                            {item.ArtikelNumber || '—'}
                        </div>
                    </button>

                    <div className="w-[38px] shrink-0 px-1 py-2 text-right text-[12.5px]">{item.Kolli ?? '—'}</div>

                    <button onClick={() => press(row, 'Menge')} className="w-[40px] shrink-0 px-1 py-2 text-right">
                        <span className={cellClass(row, 'Menge', 'inline-block px-1 text-[12.5px]')}>{item.Menge ?? '—'}</span>
                    </button>

                    <button onClick={() => press(row, 'Preis')} className="w-[48px] shrink-0 px-1 py-2 text-right">
                        <span className={cellClass(row, 'Preis', 'inline-block px-1 text-[12.5px]')}>{fmt(item.Preis)}</span>
                    </button>

                    <button onClick={() => press(row, 'Netto')} className="flex-1 py-2 pl-1 pr-2.5 text-right">
                        <span className={cellClass(row, 'Netto', 'inline-block px-1 text-[12.5px] font-bold')}>
                            {fmt(item.originalNetto ?? item.Netto)}
                        </span>
                    </button>
                </div>
            ))}
        </div>
    );
}
