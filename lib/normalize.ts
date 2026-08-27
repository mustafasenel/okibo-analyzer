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

    const preis = round(parseNum(Preis), 3);
    const ocrNetto = round(parseNum(Netto), 2);

    // Güvenlik ağı: satır toplamı ve birim fiyat biliniyorsa gerçek adet bunlardan çıkar.
    // (Model "Menge ME = 1 KTN" gibi koli sayısını toplam adet sanabiliyor.)
    let impliedMenge = 0;
    if (preis > 0 && ocrNetto > 0) {
        const raw = ocrNetto / preis;
        const rounded = Math.round(raw);
        // Yuvarlama makul ölçüde tutuyorsa güvenilir kabul et
        if (rounded > 0 && Math.abs(raw - rounded) <= Math.max(0.02, rounded * 0.02)) {
            impliedMenge = rounded;
        }
    }

    if (kolli > 0 && inhalt > 0) {
        // Tanım gereği: koli sayısı × koli içi adet = toplam adet.
        // (Model "Menge ME = 1 KTN" değerini toplam adet sansa bile burada düzelir.)
        if (kolli > inhalt) {
            // Çarpım değişmediği için bu yalnızca hangisinin koli olduğunu düzeltir
            [kolli, inhalt] = [inhalt, kolli];
        }
        menge = kolli * inhalt;
    } else if (impliedMenge > 0) {
        // Koli/içerik eksik: toplam adedi satır toplamı ÷ birim fiyattan tamamla
        menge = impliedMenge;
        if (inhalt > 0 && menge % inhalt === 0) {
            kolli = menge / inhalt;
        } else if (kolli > 0 && menge % kolli === 0) {
            inhalt = menge / kolli;
        } else {
            kolli = 1;
            inhalt = menge;
        }
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
