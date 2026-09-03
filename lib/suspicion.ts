// Şüpheli hücre tespiti.
// AI hücre bazında güven skoru vermediği için uydurma yüzde göstermiyoruz;
// bunun yerine deterministik, açıklanabilir gerekçeler üretiyoruz.

import type { InvoiceItem } from '@/types/invoice';

export type SuspicionField = 'ArtikelBez' | 'ArtikelNumber' | 'Kolli' | 'Inhalt' | 'Menge' | 'Preis' | 'Netto';

export type SuspicionReason =
    | 'nettoMismatch'    // OCR net ≠ miktar × fiyat
    | 'quantityMismatch' // koli × içerik ≠ miktar
    | 'missingValue'     // eksik / sıfır
    | 'priceOutlier';    // perakende için aykırı fiyat

export interface SuspiciousCell {
    page: number;   // 0 tabanlı sayfa indeksi
    row: number;    // 0 tabanlı satır indeksi
    field: SuspicionField;
    reason: SuspicionReason;
}

export const cellKey = (page: number, row: number, field: SuspicionField) => `${page}:${row}:${field}`;

const num = (v: unknown): number => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? '0').replace(',', '.'));
    return isNaN(n) ? 0 : n;
};

// Perakende faturasında bir birim fiyatın makul üst sınırı
const PRICE_OUTLIER = 500;

/** Tek bir sayfanın satırlarındaki şüpheli hücreleri bulur. */
export function findSuspiciousCellsInPage(items: InvoiceItem[], page: number): SuspiciousCell[] {
    const found: SuspiciousCell[] = [];

    items.forEach((item, row) => {
        const menge = num(item.Menge);
        const preis = num(item.Preis);
        const netto = num(item.Netto);
        const calculated = num(item.originalNetto);
        const kolli = num(item.Kolli);
        const inhalt = num(item.Inhalt);

        // 1) OCR net tutarı ile hesaplanan tutmuyor → miktar/fiyat/net birinde okuma hatası
        // (iade satırları negatiftir; ">0" şartı bu satırlarda kontrolü tamamen kapatıyordu)
        if (netto !== 0 && calculated !== 0 && Math.abs(netto - calculated) > 0.02) {
            found.push({ page, row, field: 'Netto', reason: 'nettoMismatch' });
            found.push({ page, row, field: 'Preis', reason: 'nettoMismatch' });
        }

        // 2) Koli × içerik, miktarı vermiyor
        // Tedarikçi iade satırlarında koliyi yuvarlayarak basar (-6/16 = -0,375 → "-0,38"),
        // bu yüzden negatif satırlarda tolerans bir koli-içi adet kadar gevşetilir.
        const packTolerance = menge < 0 ? Math.abs(inhalt) * 0.05 + 0.01 : 0.01;
        if (kolli !== 0 && inhalt !== 0 && menge !== 0
            && Math.abs(kolli * inhalt - menge) > packTolerance) {
            found.push({ page, row, field: 'Menge', reason: 'quantityMismatch' });
        }

        // 3) Eksik değerler.
        // Negatif miktar bir HATA DEĞİL, iadedir. Sıfır miktar da geçerlidir
        // (teslim edilmemiş kalem: faturada 0,00 yazar ve tutarı da 0,00'dır).
        // Yalnızca tutarı olup miktarı olmayan satır gerçekten eksiktir.
        if (preis === 0) found.push({ page, row, field: 'Preis', reason: 'missingValue' });
        if (menge === 0 && netto !== 0) found.push({ page, row, field: 'Menge', reason: 'missingValue' });
        if (!String(item.ArtikelBez ?? '').trim()) {
            found.push({ page, row, field: 'ArtikelBez', reason: 'missingValue' });
        }

        // 4) Aykırı birim fiyat (ondalık ayraç hatası işareti)
        if (Math.abs(preis) > PRICE_OUTLIER) found.push({ page, row, field: 'Preis', reason: 'priceOutlier' });
    });

    return found;
}

/** Tüm sayfalardaki şüpheli hücreler. */
export function findSuspiciousCells(pages: { items: InvoiceItem[] }[]): SuspiciousCell[] {
    return pages.flatMap((p, index) => findSuspiciousCellsInPage(p.items ?? [], index));
}

/** Satır toplamı ile faturanın yazdığı net tutar arasındaki fark. */
export function totalsMismatch(pages: { items: InvoiceItem[] }[], statedNet: number | undefined | null) {
    const lineTotal = pages.reduce(
        (sum, p) => sum + (p.items ?? []).reduce((s, item) => s + num(item.originalNetto ?? item.Netto), 0),
        0
    );
    const stated = statedNet === undefined || statedNet === null ? null : num(statedNet);
    const difference = stated === null ? 0 : lineTotal - stated;
    return {
        lineTotal: Math.round(lineTotal * 100) / 100,
        stated,
        difference: Math.round(difference * 100) / 100,
        mismatched: stated !== null && Math.abs(difference) > 0.02,
    };
}
