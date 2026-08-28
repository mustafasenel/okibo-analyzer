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



/**
 * Barkod biçimi: sadece rakam ve tipik uzunluklar (EAN-8, UPC-12, EAN-13, ITF-14).
 * Ürün kodu ise tedarikçiye göre değişir: "001", "00771-03", "098-2", "A-1234".
 */
function looksLikeBarcode(raw: unknown): boolean {
    const v = String(raw ?? '').trim();
    return /^\d+$/.test(v) && (v.length === 8 || (v.length >= 12 && v.length <= 14));
}

/**
 * Ürün kodu ile barkodun yer değiştirmesini düzeltir.
 * Model bu ikisini karıştırabiliyor (ikisi de aynı satırda yazılı olduğu için).
 * Yalnızca AÇIKÇA ters olduğunda düzeltir; şüphede modelin verdiğine dokunmaz.
 */
export function resolveCodes(artikelNumber: unknown, barcode: unknown): { artikelNumber: string; barcode: string } {
    const a = String(artikelNumber ?? '').trim();
    const b = String(barcode ?? '').trim();

    // İkisi de varsa ve ters görünüyorsa yer değiştir
    if (a && b && looksLikeBarcode(a) && !looksLikeBarcode(b)) {
        return { artikelNumber: b, barcode: a };
    }
    return { artikelNumber: a, barcode: b };
}

/** Koli sayısıyla birlikte yazılan birim etiketleri (adet/koli ayrımı için). */
const CARTON_UNITS = ['KTN', 'KAR', 'KRT', 'CTN', 'BOX', 'KOLI', 'KOLLI', 'PAL', 'DS', 'PK', 'PKT'];
const PIECE_UNITS = ['STK', 'STÜCK', 'STUECK', 'EA', 'PCS', 'ADET'];

function unitKind(raw: unknown): 'carton' | 'piece' | null {
    const u = String(raw ?? '').toUpperCase().replace(/[^A-ZÜÖÄ]/g, '');
    if (!u) return null;
    if (CARTON_UNITS.includes(u)) return 'carton';
    if (PIECE_UNITS.includes(u)) return 'piece';
    return null;
}

/**
 * Koli (kaç koli) ile İçerik (koli içinde kaç adet) ayrımını çözer.
 * Model bu ikisini sık sık ters veriyor. Çarpımları aynı kaldığı için tutar
 * etkilenmez; burada amaç doğru okunurluk.
 *
 * Karar sırası:
 *  1) Birim etiketi ("5 KTN") varsa koli sayısı kesindir, dokunulmaz.
 *  2) Biri 1 ise: 1 olan kolidir ("12 koli × 1 adet" perakendede gerçekçi değil).
 *  3) İkisi de 1'den büyükse küçük olan koli kabul edilir (koli içi adet genelde daha büyüktür).
 */
export function resolvePackaging(
    kolli: number,
    inhalt: number,
    einheit?: unknown
): { kolli: number; inhalt: number } {
    if (kolli <= 0 || inhalt <= 0) return { kolli, inhalt };

    // 1) Birim etiketi koli sayısını işaret ediyorsa modelin verdiği sırayı koru
    if (unitKind(einheit) === 'carton') return { kolli, inhalt };

    // 2) Biri 1 ise, 1 olan koli sayısıdır
    if (inhalt === 1 && kolli > 1) return { kolli: 1, inhalt: kolli };
    if (kolli === 1) return { kolli, inhalt };

    // 3) Küçük olan koli
    return kolli > inhalt ? { kolli: inhalt, inhalt: kolli } : { kolli, inhalt };
}

// Bir fatura satırını mantıksal olarak tutarlı hale getirir:
//  - Kolli/Inhalt/Menge ilişkisini (Kolli * Inhalt = Menge) zorlar
//  - OCR'ın sütun karıştırmasını (Kolli > Inhalt) düzeltir
//  - Netto'yu (Menge * Preis) hesaplar ve OCR değeriyle birlikte tutar
export function normalizeInvoiceItem(item: any) {
    const { ArtikelNumber, ArtikelBez, Kolli, Inhalt, Menge, Preis, Netto, MwSt, Einheit, Barcode, ...rest } = item;

    let kolli = Math.round(parseNum(Kolli));
    let inhalt = Math.round(parseNum(Inhalt));
    let menge = Math.round(parseNum(Menge));

    // Ürün kodu / barkod karışmışsa düzelt
    const codes = resolveCodes(ArtikelNumber, Barcode);

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
        // Koli / içerik ayrımını çöz (çarpım değişmez, yalnızca hangisi hangisi netleşir)
        ({ kolli, inhalt } = resolvePackaging(kolli, inhalt, Einheit));
        // Tanım gereği: koli sayısı × koli içi adet = toplam adet
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
        ArtikelNumber: codes.artikelNumber,
        ArtikelBez: String(ArtikelBez ?? '').trim(),
        Kolli: kolli,
        Inhalt: inhalt,
        Menge: menge,
        Preis: preis,
        Netto: ocrNetto,
        originalNetto: calculatedNetto,
        ...(codes.barcode ? { Barcode: codes.barcode } : {}),
        ...(Einheit ? { Einheit: String(Einheit).toUpperCase().trim() } : {}),
        ...(MwSt !== undefined && MwSt !== null && String(MwSt) !== ''
            ? { MwSt: Math.round(parseNum(MwSt)) }
            : {}),
    };
}

// Tek bir sayfanın (görselin) ham AI çıktısını normalize edilmiş satırlara çevirir.
export function normalizePageItems(rawItems: any[]): any[] {
    return (Array.isArray(rawItems) ? rawItems : []).map(normalizeInvoiceItem);
}
