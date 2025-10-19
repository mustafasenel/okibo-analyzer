const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function incrementTestCompany() {
  try {
    console.log('🔧 Test firmasının tarama sayısını artırıyorum...');
    
    const company = await prisma.company.findFirst({
      where: { code: '180698' }
    });

    if (!company) {
      console.log('❌ Test firması bulunamadı!');
      return;
    }

    console.log(`📊 Mevcut durum: ${company.currentScanCount} / ${company.monthlyScanLimit}`);

    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: {
        currentScanCount: company.currentScanCount + 2
      }
    });

    console.log(`✅ Güncellenmiş durum: ${updatedCompany.currentScanCount} / ${updatedCompany.monthlyScanLimit}`);
    console.log(`📈 Kullanım oranı: ${((updatedCompany.currentScanCount / updatedCompany.monthlyScanLimit) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

incrementTestCompany();
