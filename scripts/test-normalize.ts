// OCR normalizasyon algoritmalarının testi.
// Çalıştır: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-normalize.ts
import { parseNum, normalizeInvoiceItem } from '../lib/normalize';

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

console.log(`\nSonuç: ${pass} geçti, ${fail} kaldı`);
process.exit(fail > 0 ? 1 : 0);
