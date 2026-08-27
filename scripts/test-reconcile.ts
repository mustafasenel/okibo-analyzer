// Fatura düzeyinde mutabakat testleri (Akar GmbH faturasından türetilmiş)
import { findCulpritLine, findOutlierLines } from '../lib/reconcile';

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? '✅' : '❌'} ${name} → ${JSON.stringify(actual)}${ok ? '' : ' (beklenen: ' + JSON.stringify(expected) + ')'}`);
    ok ? pass++ : fail++;
}

const item = (bez: string, kolli: number, inhalt: number, preis: number, netto: number) =>
    ({ ArtikelNumber: '', ArtikelBez: bez, Kolli: kolli, Inhalt: inhalt, Menge: kolli * inhalt,
       Preis: preis, Netto: netto, originalNetto: netto }) as any;

// Gerçek fatura: EURO PALETTE 1 STK x 11,00 = 11,00 olmalı.
// Model ağırlığı (25 kg) adet sanmış → 25 x 11 = 275,00 yazmış.
const bozuk = [{ items: [
    item('EURO PALETTE A KLASS', 1, 25, 11.00, 275.00),   // hatalı satır
    item('CIZI PEYNIRLI KRAKER', 1, 12, 1.65, 19.80),
    item('HALK KREMALI BISKÜVI', 1, 8, 1.63, 13.04),
    item('SAKLIKÖY CIKOLATALI', 1, 8, 2.82, 22.56),
]}];
// Faturanın yazdığı doğru net toplam: 11,00 + 19,80 + 13,04 + 22,56
const dogruToplam = 11.00 + 19.80 + 13.04 + 22.56;

const suclu = findCulpritLine(bozuk, dogruToplam);
check('hatalı satırı bulur', suclu && { row: suclu.row, suggested: suclu.suggestedNetto, h: suclu.hypothesis },
      { row: 0, suggested: 11, h: 'quantityInflated' });
check('ürün adını taşır', suclu?.product, 'EURO PALETTE A KLASS');

// Toplam zaten tutuyorsa suçlama yapılmaz
const saglam = [{ items: [ item('A', 1, 12, 1.65, 19.80), item('B', 1, 8, 1.63, 13.04) ] }];
check('tutan faturada suçlu yok', findCulpritLine(saglam, 19.80 + 13.04), null);

// Fark birden fazla satırdan geliyorsa (belirsiz) suçlama yapılmaz
const belirsiz = [{ items: [ item('A', 1, 10, 1.00, 100.00), item('B', 1, 10, 1.00, 100.00) ] }];
check('belirsizse suçlama yok', findCulpritLine(belirsiz, 110), null);

// Ondalık kayması: 198,00 yerine 19,80 olmalı
const ondalik = [{ items: [ item('A', 1, 12, 1.65, 198.00), item('B', 1, 8, 1.63, 13.04) ] }];
const ok2 = findCulpritLine(ondalik, 19.80 + 13.04);
check('ondalık kaymasını yakalar', ok2 && { row: ok2.row, suggested: ok2.suggestedNetto }, { row: 0, suggested: 19.8 });

// Özet yoksa aykırı satır ikinci savunma hattı
check('aykırı satırı işaretler', findOutlierLines(bozuk), [{ page: 0, row: 0 }]);

console.log(`\nSonuç: ${pass} geçti, ${fail} kaldı`);
process.exit(fail > 0 ? 1 : 0);
