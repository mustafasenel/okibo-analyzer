// OCR normalizasyon algoritmalarının testi.
// Çalıştır: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-normalize.ts
import { parseNum, normalizeInvoiceItem, resolvePackaging, resolveCodes } from '../lib/normalize';

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? '✅' : '❌'} ${name} → ${JSON.stringify(actual)}${ok ? '' : ' (beklenen: ' + JSON.stringify(expected) + ')'}`);
    ok ? pass++ : fail++;
}

console.log('--- parseNum ---');
check('zero-padding "2,3900000"', parseNum('2,3900000'), 2.39);
check('zero-padding "15,50000"', parseNum('15,50000'), 15.5);
check('thousands "1.234,56"', parseNum('1.234,56'), 1234.56);
check('comma decimal "1,234"', parseNum('1,234'), 1.234);
check('us format "1,234.56"', parseNum('1,234.56'), 1234.56);
check('currency "€ 3,49"', parseNum('€ 3,49'), 3.49);
check('number passthrough', parseNum(5.5), 5.5);
check('empty', parseNum(''), 0);

console.log('\n--- normalizeInvoiceItem ---');

// 1) Kolli>Inhalt sütun karışması → swap + Menge=Kolli*Inhalt
check('column swap',
    (({ Kolli, Inhalt, Menge }) => ({ Kolli, Inhalt, Menge }))(
        normalizeInvoiceItem({ ArtikelNumber: 'A', ArtikelBez: 'x', Kolli: 12, Inhalt: 2, Menge: 5, Preis: '1,00', Netto: '24' })),
    { Kolli: 2, Inhalt: 12, Menge: 24 });

// 2) Eksik Kolli → 1, Menge=Inhalt
check('missing Kolli',
    (({ Kolli, Inhalt, Menge }) => ({ Kolli, Inhalt, Menge }))(
        normalizeInvoiceItem({ ArtikelBez: 'x', Inhalt: 10, Preis: '2,00', Netto: '20' })),
    { Kolli: 1, Inhalt: 10, Menge: 10 });

// 3) Kolli, Menge'den türetilir (Menge/Inhalt)
check('derive Kolli from Menge/Inhalt',
    (({ Kolli, Inhalt, Menge }) => ({ Kolli, Inhalt, Menge }))(
        normalizeInvoiceItem({ ArtikelBez: 'x', Inhalt: 12, Menge: 24, Preis: '1,00', Netto: '24' })),
    { Kolli: 2, Inhalt: 12, Menge: 24 });

// 4) Netto hesaplama (Menge*Preis) + zero-padding fiyat
check('calculated netto',
    normalizeInvoiceItem({ ArtikelBez: 'Milch', Kolli: 2, Inhalt: 12, Preis: '0,8900000', Netto: '21,36' }).originalNetto,
    21.36);

// 5) MwSt yoksa alan eklenmez
check('no MwSt field when absent',
    'MwSt' in normalizeInvoiceItem({ ArtikelBez: 'x', Kolli: 1, Inhalt: 1, Preis: '1', Netto: '1' }),
    false);

// 6) MwSt varsa integer
check('MwSt integer',
    normalizeInvoiceItem({ ArtikelBez: 'x', Kolli: 1, Inhalt: 1, Preis: '1', Netto: '1', MwSt: '19' }).MwSt,
    19);

console.log('\n--- gerçek fatura satırları (Akar GmbH) ---');

// Rabatlı satır: 5 KTN × 18 adet, net birim 0,650 → 90 adet, 58,50
check('indirimli satır (5 KTN x 18)',
    (({ Kolli, Inhalt, Menge, originalNetto }) => ({ Kolli, Inhalt, Menge, originalNetto }))(
        normalizeInvoiceItem({ ArtikelNumber:'01151-01', ArtikelBez:'BISKREM DUO BISKÜVI',
            Kolli:5, Inhalt:18, Menge:5, Preis:'0,650', Netto:'58,50' })),
    { Kolli: 5, Inhalt: 18, Menge: 90, originalNetto: 58.5 });

// Model "Menge ME"yi toplam adet sanmış: 1 KTN × 12 → 12 adet, 19,80
check('koli sayısı toplam adet sanılmış',
    (({ Kolli, Inhalt, Menge, originalNetto }) => ({ Kolli, Inhalt, Menge, originalNetto }))(
        normalizeInvoiceItem({ ArtikelNumber:'00771-03', ArtikelBez:'CIZI PEYNIRLI KRAKER',
            Kolli:1, Inhalt:12, Menge:1, Preis:'1,650', Netto:'19,80' })),
    { Kolli: 1, Inhalt: 12, Menge: 12, originalNetto: 19.8 });

// Tek parça: 1 STK
check('tek parça satır (1 STK)',
    (({ Kolli, Inhalt, Menge, originalNetto }) => ({ Kolli, Inhalt, Menge, originalNetto }))(
        normalizeInvoiceItem({ ArtikelNumber:'00000-10', ArtikelBez:'EURO PALETTE',
            Kolli:1, Inhalt:1, Menge:1, Preis:'11,000', Netto:'11,00' })),
    { Kolli: 1, Inhalt: 1, Menge: 1, originalNetto: 11 });

// Koli/içerik eksik: toplam adet fiyat ve tutardan tamamlanır
check('koli/içerik eksik → tutardan tamamla',
    (({ Kolli, Inhalt, Menge }) => ({ Kolli, Inhalt, Menge }))(
        normalizeInvoiceItem({ ArtikelBez:'X', Preis:'0,650', Netto:'58,50' })),
    { Kolli: 1, Inhalt: 90, Menge: 90 });

console.log('\n--- koli / içerik ayrımı (ekranda ters çıkan satırlar) ---');

const pack = (k: number, i: number, e?: string) => resolvePackaging(k, i, e);

check('12 koli x 1 adet → 1 koli x 12 adet', pack(12, 1), { kolli: 1, inhalt: 12 });
check('11 koli x 1 adet → 1 koli x 11 adet', pack(11, 1), { kolli: 1, inhalt: 11 });
check('18 koli x 1 adet → 1 koli x 18 adet', pack(18, 1), { kolli: 1, inhalt: 18 });
check('1 koli x 12 adet (doğru) korunur', pack(1, 12), { kolli: 1, inhalt: 12 });
check('tek parça 1x1 korunur', pack(1, 1), { kolli: 1, inhalt: 1 });
// Birim etiketi varsa modelin sırası korunur: 24 koli x 6 adet gerçek olabilir
check('birim etiketi KTN → sıra korunur', pack(24, 6, 'KTN'), { kolli: 24, inhalt: 6 });
check('etiket yokken büyük olan içerik sayılır', pack(24, 6), { kolli: 6, inhalt: 24 });

// Uçtan uca: modelin ters verdiği satır düzelir, tutar değişmez
check('ters satır normalize → tutar aynı',
    (({ Kolli, Inhalt, Menge, originalNetto }) => ({ Kolli, Inhalt, Menge, originalNetto }))(
        normalizeInvoiceItem({ ArtikelNumber:'00771-03', ArtikelBez:'CIZI PEYNIRLI KRAKER',
            Kolli:12, Inhalt:1, Menge:12, Preis:'1,65', Netto:'19,80' })),
    { Kolli: 1, Inhalt: 12, Menge: 12, originalNetto: 19.8 });

// Etiketli gerçek satır: 5 KTN x 18
check('5 KTN x 18 (etiketli) korunur',
    (({ Kolli, Inhalt, Menge, originalNetto }) => ({ Kolli, Inhalt, Menge, originalNetto }))(
        normalizeInvoiceItem({ ArtikelBez:'BISKREM', Kolli:5, Inhalt:18, Einheit:'KTN',
            Preis:'0,650', Netto:'58,50' })),
    { Kolli: 5, Inhalt: 18, Menge: 90, originalNetto: 58.5 });

console.log('\n--- ürün kodu / barkod ayrımı (Sofra Kosovare) ---');

check('doğru sıra korunur', resolveCodes('001', '4260059980036'),
      { artikelNumber: '001', barcode: '4260059980036' });
check('ters verilmişse düzeltilir', resolveCodes('4260059980036', '001'),
      { artikelNumber: '001', barcode: '4260059980036' });
check('tireli kod korunur', resolveCodes('098-2', '3902634650095'),
      { artikelNumber: '098-2', barcode: '3902634650095' });
check('sadece ürün kodu varsa dokunulmaz', resolveCodes('00771-03', ''),
      { artikelNumber: '00771-03', barcode: '' });
check('ikisi de barkod gibiyse dokunulmaz', resolveCodes('4260059980036', '8004248002002'),
      { artikelNumber: '4260059980036', barcode: '8004248002002' });

// Uçtan uca: ters gelen satır düzelir ve barkod korunur
check('ters satır normalize edilir',
    (({ ArtikelNumber, Barcode }) => ({ ArtikelNumber, Barcode }))(
        normalizeInvoiceItem({ ArtikelNumber:'4260059980036', Barcode:'001',
            ArtikelBez:'Kosova Suxhuk mild', Kolli:7, Inhalt:1, Preis:'5,699', Netto:'39,89' })),
    { ArtikelNumber: '001', Barcode: '4260059980036' });

console.log('\n--- ondalıklı miktarlar (kilo bazlı ve yarım koli satırlar) ---');

const q = (item: any) => (({ Kolli, Inhalt, Menge, originalNetto }) =>
    ({ Kolli, Inhalt, Menge, originalNetto }))(normalizeInvoiceItem(item));

check('0,5 koli x 12 @1,00 = 6,00',
    q({ ArtikelBez:'X', Kolli:'0,5', Inhalt:'12', Preis:'1,00', Netto:'6,00' }),
    { Kolli: 0.5, Inhalt: 12, Menge: 6, originalNetto: 6 });

check('1,5 koli x 6 @2,00 = 18,00',
    q({ ArtikelBez:'Y', Kolli:'1,5', Inhalt:'6', Preis:'2,00', Netto:'18,00' }),
    { Kolli: 1.5, Inhalt: 6, Menge: 9, originalNetto: 18 });

check('2,5 kg @8,00 = 20,00',
    q({ ArtikelBez:'Kıyma', Menge:'2,5', Einheit:'KG', Preis:'8,00', Netto:'20,00' }),
    { Kolli: 1, Inhalt: 2.5, Menge: 2.5, originalNetto: 20 });

check('12,340 kg @10,00 = 123,40',
    q({ ArtikelBez:'Peynir', Menge:'12,340', Einheit:'KG', Preis:'10,00', Netto:'123,40' }),
    { Kolli: 1, Inhalt: 12.34, Menge: 12.34, originalNetto: 123.4 });

// Ondalıklı değerlerde koli/içerik takası yapılmamalı
check('0,5 x 12 takas edilmez', resolvePackaging(0.5, 12), { kolli: 0.5, inhalt: 12 });
check('12 x 0,5 takas edilmez', resolvePackaging(12, 0.5), { kolli: 12, inhalt: 0.5 });

// Miktar eksikken tutardan türetme de ondalık verebilmeli
check('eksik miktar → 2,5 türetilir',
    q({ ArtikelBez:'Z', Preis:'8,00', Netto:'20,00' }),
    { Kolli: 1, Inhalt: 2.5, Menge: 2.5, originalNetto: 20 });

console.log(`\nSonuç: ${pass} geçti, ${fail} kaldı`);
process.exit(fail > 0 ? 1 : 0);
