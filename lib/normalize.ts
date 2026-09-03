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
const PIECE_UNITS = ['STK', 'STÜCK', 'STUECK', 'ST', 'EA', 'PCS', 'ADET', 'KG', 'GR', 'G', 'L', 'LT'];

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
 *
 * Ondalıklı değerlerde (0,5 koli / 2,5 kg) takas yapılmaz: kesirli miktar bilinçli
 * bir değerdir ve "küçük olan kolidir" varsayımı orada geçerli değildir.
 */
export function resolvePackaging(
    kolli: number,
    inhalt: number,
    einheit?: unknown
): { kolli: number; inhalt: number } {
    if (kolli <= 0 || inhalt <= 0) return { kolli, inhalt };

    // 1) Birim etiketi koli sayısını işaret ediyorsa modelin verdiği sırayı koru
    if (unitKind(einheit) === 'carton') return { kolli, inhalt };

    // Ondalıklı miktar (0,5 koli, 2,5 kg) bilinçlidir — sıralamaya karışma
    if (!Number.isInteger(kolli) || !Number.isInteger(inhalt)) return { kolli, inhalt };

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

    // Miktarlar ondalıklı olabilir: 0,5 koli · 2,5 kg · 12,340 kg gibi satırlar gerçektir.
    // Tam sayıya yuvarlamak bu satırları yapısal olarak bozuyordu.
    const qty = (v: unknown) => round(parseNum(v), 3);
    let kolli = qty(Kolli);
    let inhalt = qty(Inhalt);
    let menge = qty(Menge);

    // Ürün kodu / barkod karışmışsa düzelt
    const codes = resolveCodes(ArtikelNumber, Barcode);

    const preis = round(parseNum(Preis), 3);
    const ocrNetto = round(parseNum(Netto), 2);

    // Güvenlik ağı: satır toplamı ve birim fiyat biliniyorsa gerçek adet bunlardan çıkar.
    // (Model "Menge ME = 1 KTN" gibi koli sayısını toplam adet sanabiliyor.)
    // ── Miktar seçimi ────────────────────────────────────────────────────────
    // Elimizde üç aday var ve hangisinin doğru olduğuna SATIR TOPLAMI karar verir:
    //   a) koli × içerik      b) faturada yazan miktar      c) satır toplamı / birim fiyat
    // Toplam bir kanıttır: doğru miktar, fiyatla çarpıldığında toplamı tutturandır.
    // Bu sayede iade satırları (negatif) ve tedarikçinin yuvarladığı koli değerleri
    // (-6/16 = -0,375 ama faturada -0,38 yazar) bozulmadan geçer.
    const given = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';

    // Koli/içerik ayrımı yalnızca ikisi de pozitifken anlamlıdır
    if (kolli > 0 && inhalt > 0) {
        ({ kolli, inhalt } = resolvePackaging(kolli, inhalt, Einheit));
    }

    const candidates: number[] = [];
    if (kolli !== 0 && inhalt !== 0) candidates.push(round(kolli * inhalt, 3));
    if (menge !== 0) candidates.push(menge);
    if (preis !== 0 && ocrNetto !== 0) candidates.push(round(ocrNetto / preis, 3));

    // Faturada açıkça sıfır yazan satırlar gerçektir (teslim edilmemiş kalem)
    const explicitZero =
        (given(Kolli) && kolli === 0) || (given(Netto) && ocrNetto === 0 && preis !== 0);

    if (explicitZero) {
        menge = 0;
        if (kolli === 0 && !given(Kolli)) kolli = 0;
    } else if (candidates.length > 0) {
        if (preis !== 0 && ocrNetto !== 0) {
            // Toplamı en iyi tutturan adayı seç. Adaylar öncelik sırasında geldiği için
            // (koli×içerik → yazan miktar → toplam/fiyat) yalnızca BELİRGİN şekilde daha
            // iyi olan aday öne geçer. Aksi halde bölme işleminin ondalık gürültüsü
            // temiz 12 yerine 12,001 gibi değerler üretiyordu.
            const MEANINGFUL = 0.005; // yarım kuruş
            const err = (c: number) => Math.abs(c * preis - ocrNetto);
            menge = candidates.reduce((best, c) => (err(best) - err(c) > MEANINGFUL ? c : best));
        } else {
            menge = candidates[0];
        }
    }

    // Koli / içerik değerlerini seçilen miktarla tutarlı hale getir
    if (menge === 0) {
        if (inhalt === 0) inhalt = 0;
        if (!given(Kolli)) kolli = kolli || 0;
    } else if (round(kolli * inhalt, 3) !== menge) {
        if (inhalt !== 0) {
            kolli = round(menge / inhalt, 3);
        } else if (kolli !== 0) {
            inhalt = round(menge / kolli, 3);
        } else {
            kolli = 1;
            inhalt = menge;
        }
    }
    if (kolli === 0 && menge !== 0) kolli = 1;

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
