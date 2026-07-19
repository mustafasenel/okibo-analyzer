// Örnek/başlangıç verisi: Modeller, Paketler ve bir test firması.
// Çalıştır: node scripts/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed başlıyor...');

  // --- Modeller (openrouterId benzersiz) ---
  const standart = await prisma.model.upsert({
    where: { openrouterId: 'qwen/qwen3-vl-8b-instruct' },
    update: {},
    create: {
      openrouterId: 'qwen/qwen3-vl-8b-instruct',
      displayName: 'Standart',
      creditMultiplier: 1,
      isActive: true,
      sortOrder: 0,
    },
  });

  const gelismis = await prisma.model.upsert({
    where: { openrouterId: 'mistralai/mistral-small-3.2-24b-instruct:free' },
    update: {},
    create: {
      openrouterId: 'mistralai/mistral-small-3.2-24b-instruct:free',
      displayName: 'Gelişmiş',
      creditMultiplier: 2,
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log(`✅ Modeller: ${standart.displayName} (x${standart.creditMultiplier}), ${gelismis.displayName} (x${gelismis.creditMultiplier})`);

  // --- Paketler ---
  let baslangic = await prisma.package.findFirst({ where: { name: 'Başlangıç' } });
  if (!baslangic) {
    baslangic = await prisma.package.create({ data: { name: 'Başlangıç', monthlyCredits: 100, isActive: true } });
  }
  let pro = await prisma.package.findFirst({ where: { name: 'Pro' } });
  if (!pro) {
    pro = await prisma.package.create({ data: { name: 'Pro', monthlyCredits: 1000, isActive: true } });
  }
  console.log(`✅ Paketler: ${baslangic.name} (${baslangic.monthlyCredits}), ${pro.name} (${pro.monthlyCredits})`);

  // --- Test firması (code benzersiz) ---
  const company = await prisma.company.upsert({
    where: { code: 'OKIBO01' },
    update: {
      modelId: standart.id,
      packageId: baslangic.id,
      monthlyCredits: baslangic.monthlyCredits,
    },
    create: {
      name: 'Test Market',
      code: 'OKIBO01',
      isActive: true,
      monthlyCredits: baslangic.monthlyCredits,
      usedCredits: 0,
      modelId: standart.id,
      packageId: baslangic.id,
    },
  });
  console.log(`✅ Firma: ${company.name} (${company.code}) → model=Standart, paket=Başlangıç, kota=${company.monthlyCredits}`);

  console.log('🌱 Seed tamam.');
}

main()
  .catch((e) => { console.error('❌ Seed hatası:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
