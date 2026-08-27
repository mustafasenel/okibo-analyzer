// Fatura düzeyinde mutabakat: AI bir sütunu yanlış okuduğunda satır bazlı
// aritmetik bunu yakalayamaz (model kendi içinde tutarlı olur).
// Ama satır toplamları faturanın yazdığı net tutarı tutmuyorsa, farkı TEK BİR
// satırın açıklayıp açıklamadığını arayabiliriz — bu da suçluyu işaret eder.

import type { InvoiceItem } from '@/types/invoice';

export type Hypothesis =
    | 'quantityInflated'      // adet şişmiş (ör. ağırlık adet sanılmış) → doğrusu tek adet
    | 'cartonsNotPieces'      // toplam, koli sayısıyla çarpılmış olmalı
    | 'decimalShift'          // ondalık kayması (10 kat)
    | 'nettoMisread';         // satır toplamı yanlış okunmuş, miktar × fiyat doğru

export interface Culprit {
    page: number;
    row: number;
    product: string;
    currentNetto: number;
    suggestedNetto: number;
    hypothesis: Hypothesis;
}

const num = (v: unknown): number => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? '0').replace(',', '.'));
    return isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Satırın "gerçek" tutarı olarak kullandığımız değer (OCR okuması). */
const lineTotal = (item: InvoiceItem) => num(item.Netto) || num(item.originalNetto);

/**
 * Satır toplamları ile faturanın yazdığı net tutar arasındaki farkı
 * TEK bir satırın makul bir düzeltmesi kapatıyor mu?
 * Kapatıyorsa o satır muhtemel hatalı satırdır.
 *
 * Birden fazla aday varsa (belirsizse) null döner — yanlış suçlama yapmayız.
 */
export function findCulpritLine(
    pages: { items: InvoiceItem[] }[],
    statedNet: number | null | undefined,
    tolerance = 0.02
): Culprit | null {
    if (statedNet === null || statedNet === undefined) return null;
    const stated = num(statedNet);
    if (stated <= 0) return null;

    const sum = pages.reduce(
        (s, p) => s + (p.items ?? []).reduce((x, item) => x + lineTotal(item), 0),
        0
    );
    if (Math.abs(sum - stated) <= tolerance) return null; // zaten tutuyor

    const candidates: Culprit[] = [];

    pages.forEach((page, pageIndex) => {
        (page.items ?? []).forEach((item, rowIndex) => {
            const current = lineTotal(item);
            const preis = num(item.Preis);
            const kolli = num(item.Kolli);
            const menge = num(item.Menge);

            // Denenecek düzeltmeler: her biri "bu satır şu olsaydı toplam tutardı" hipotezi
            const hypotheses: { value: number; hypothesis: Hypothesis }[] = [];
            if (preis > 0) {
                hypotheses.push({ value: round2(preis), hypothesis: 'quantityInflated' });      // tek adet
                if (kolli > 0) hypotheses.push({ value: round2(preis * kolli), hypothesis: 'cartonsNotPieces' });
                if (menge > 0) hypotheses.push({ value: round2(preis * menge), hypothesis: 'nettoMisread' });
            }
            if (current > 0) {
                hypotheses.push({ value: round2(current / 10), hypothesis: 'decimalShift' });
                hypotheses.push({ value: round2(current * 10), hypothesis: 'decimalShift' });
            }

            for (const h of hypotheses) {
                if (Math.abs(h.value - current) <= tolerance) continue; // değişiklik yok
                const corrected = sum - current + h.value;
                if (Math.abs(corrected - stated) <= tolerance) {
                    candidates.push({
                        page: pageIndex,
                        row: rowIndex,
                        product: String(item.ArtikelBez ?? ''),
                        currentNetto: round2(current),
                        suggestedNetto: h.value,
                        hypothesis: h.hypothesis,
                    });
                }
            }
        });
    });

    // Tek bir satır farkı açıklıyorsa onu işaret et; belirsizse suçlama yapma
    const unique = new Map<string, Culprit>();
    // Aynı satır için aynı değeri veren birden fazla açıklama olabilir;
    // ilk (en açıklayıcı) hipotezi koruruz.
    for (const c of candidates) {
        const key = `${c.page}:${c.row}:${c.suggestedNetto}`;
        if (!unique.has(key)) unique.set(key, c);
    }
    const list = [...unique.values()];
    if (list.length !== 1) return null;
    return list[0];
}

/**
 * Fatura içi aykırı satır: fiyatı normalken tutarı diğer satırların çok üstünde olan satır.
 * Toplam bilgisi yoksa (tek sayfa, özet yok) ikinci savunma hattı olarak kullanılır.
 */
export function findOutlierLines(
    pages: { items: InvoiceItem[] }[],
    factor = 12
): { page: number; row: number }[] {
    const totals: { page: number; row: number; value: number }[] = [];
    pages.forEach((p, pi) =>
        (p.items ?? []).forEach((item, ri) => {
            const v = lineTotal(item);
            if (v > 0) totals.push({ page: pi, row: ri, value: v });
        })
    );
    if (totals.length < 4) return [];

    const sorted = [...totals].map(t => t.value).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median <= 0) return [];

    return totals.filter(t => t.value > median * factor).map(({ page, row }) => ({ page, row }));
}
