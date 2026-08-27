// Fatura alan adları: etiket Türkçe, faturadaki özgün (Almanca) metin altta küçük gri satır.
const MAP: Record<string, string> = {
    Firma: 'Firma',
    Rechnungsnummer: 'Fatura no',
    Rechnungsdatum: 'Fatura tarihi',
    Lieferdatum: 'Teslim tarihi',
    Lieferscheinnummer: 'İrsaliye no',
    Kundennummer: 'Müşteri no',
    Kunde: 'Müşteri',
    Zahlungsziel: 'Vade',
    UStIdNr: 'Vergi no',
    // Tablo alanları
    ArtikelBez: 'Ürün adı',
    ArtikelNumber: 'Ürün kodu',
    Kolli: 'Koli',
    Inhalt: 'İçerik',
    Menge: 'Miktar',
    Preis: 'Fiyat',
    Netto: 'Net tutar',
};

/** Bir meta anahtarı için Türkçe etiket ve özgün metni döndürür. */
export function metaLabel(key: string): { label: string; original?: string } {
    const tr = MAP[key];
    if (tr) return { label: tr, original: tr === key ? undefined : key };
    // Bilinmeyen alan: anahtarı okunur hale getir, özgün metni göster
    return { label: key.replace(/_/g, ' '), original: undefined };
}
