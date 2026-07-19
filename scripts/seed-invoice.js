// Test faturası ekler (history/review salt-okunur akışını denemek için).
// Çalıştır: node scripts/seed-invoice.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findUnique({ where: { code: 'OKIBO01' }, include: { model: true } });
  if (!company) throw new Error('OKIBO01 firması yok, önce scripts/seed.js çalıştır.');

  const items = [
    { ArtikelNumber: '100234', ArtikelBez: 'Vollmilch 3,5% 1L', Kolli: 2, Inhalt: 12, Menge: 24, Preis: 0.89, Netto: 21.36, originalNetto: 21.36, MwSt: 7 },
    { ArtikelNumber: '100987', ArtikelBez: 'Butter 250g', Kolli: 1, Inhalt: 20, Menge: 20, Preis: 1.79, Netto: 35.80, originalNetto: 35.80, MwSt: 7 },
    { ArtikelNumber: '205511', ArtikelBez: 'Spülmittel 500ml', Kolli: 3, Inhalt: 6, Menge: 18, Preis: 1.29, Netto: 23.22, originalNetto: 23.22, MwSt: 19 },
  ];

  const invoice = await prisma.invoice.create({
    data: {
      company: { connect: { id: company.id } },
      invoiceMeta: { Firma: 'Getränke Handel GmbH', Rechnungsnummer: 'RE-2026-0042', Rechnungsdatum: '17.07.2026' },
      invoiceData: [{ page: 1, items }],
      invoiceSummary: { vat_7: 4.00, vat_19: 4.41, total_vat: 8.41, total_net: 80.38, total_gross: 88.79 },
      status: 'PENDING',
      modelUsed: company.model?.openrouterId ?? null,
      creditsCost: 1 * (company.model?.creditMultiplier || 1),
    },
  });
  console.log(`✅ Test faturası eklendi: ${invoice.id} (firma OKIBO01, ${items.length} satır)`);
}

main().catch(e => { console.error('❌', e); process.exit(1); }).finally(() => prisma.$disconnect());
