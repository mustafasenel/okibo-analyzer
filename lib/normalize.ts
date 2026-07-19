// OCR sonrası sayı ayrıştırma ve fatura satırı normalizasyonu (saf fonksiyonlar, tarayıcı bağımlılığı yok).
// Bu modül Node'da da test edilebilir (bkz. scripts/test-normalize.js).

// Almanca/OCR biçimli sayıları güvenli şekilde parse eder.
// Örnekler: "2,3900000" -> 2.39, "15,50000" -> 15.5, "1.234,56" -> 1234.56, "1,234" -> 1.234
export function parseNum(raw: unknown): number {
    if (typeof raw === 'number') return isFinite(raw) ? raw : 0;
    if (raw == null) return 0;
    let s = String(raw).trim().replace(/[^\d.,-]/g, '');
    if (!s) return 0;

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
        // Son ayraç ondalık kabul edilir; diğeri binlik ayracıdır.
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (hasComma) {
        // Tek başına virgül -> ondalık ayraç
        s = s.replace(',', '.');
    }
    // Tek başına nokta veya ayraçsız -> parseFloat doğru yorumlar (perakende bağlamı)

    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

export const round = (n: number, d: number): number => {
    const f = Math.pow(10, d);
    return Math.round((n + Number.EPSILON) * f) / f;
};

// Bir fatura satırını mantıksal olarak tutarlı hale getirir:
//  - Kolli/Inhalt/Menge ilişkisini (Kolli * Inhalt = Menge) zorlar
//  - OCR'ın sütun karıştırmasını (Kolli > Inhalt) düzeltir
//  - Netto'yu (Menge * Preis) hesaplar ve OCR değeriyle birlikte tutar
export function normalizeInvoiceItem(item: any) {
    const { ArtikelNumber, ArtikelBez, Kolli, Inhalt, Menge, Preis, Netto, MwSt, ...rest } = item;

    let kolli = Math.round(parseNum(Kolli));
    let inhalt = Math.round(parseNum(Inhalt));
    let menge = Math.round(parseNum(Menge));

    // OCR sütun karışması: Kolli (koli sayısı) neredeyse her zaman Inhalt'tan (koli içi adet) küçük/eşittir.
    if (kolli > 0 && inhalt > 0 && kolli > inhalt) {
        [kolli, inhalt] = [inhalt, kolli];
    }

    // Kolli * Inhalt = Menge tutarlılığı
    if (kolli > 0 && inhalt > 0) {
        menge = kolli * inhalt;
    } else if (menge > 0 && inhalt > 0) {
        kolli = Math.max(1, Math.round(menge / inhalt));
        menge = kolli * inhalt;
    } else if (menge > 0 && kolli > 0) {
        inhalt = Math.max(1, Math.round(menge / kolli));
        menge = kolli * inhalt;
    } else if (inhalt > 0) {
        kolli = 1;
        menge = inhalt;
    } else if (menge > 0) {
        kolli = 1;
        inhalt = menge;
    } else {
        kolli = kolli || 1;
        inhalt = inhalt || 0;
        menge = kolli * inhalt;
    }

    const preis = round(parseNum(Preis), 3);
    const ocrNetto = round(parseNum(Netto), 2);            // OCR'dan okunan
    const calculatedNetto = round(menge * preis, 2);       // hesaplanan

    return {
        ...rest,
        ArtikelNumber: String(ArtikelNumber ?? '').trim(),
        ArtikelBez: String(ArtikelBez ?? '').trim(),
        Kolli: kolli,
        Inhalt: inhalt,
        Menge: menge,
        Preis: preis,
        Netto: ocrNetto,
        originalNetto: calculatedNetto,
        ...(MwSt !== undefined && MwSt !== null && String(MwSt) !== ''
            ? { MwSt: Math.round(parseNum(MwSt)) }
            : {}),
    };
}

// Tek bir sayfanın (görselin) ham AI çıktısını normalize edilmiş satırlara çevirir.
export function normalizePageItems(rawItems: any[]): any[] {
    return (Array.isArray(rawItems) ? rawItems : []).map(normalizeInvoiceItem);
}
