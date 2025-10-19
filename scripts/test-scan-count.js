const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testScanCount() {
  try {
    console.log('🔍 Mevcut firma durumları:');
    
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        monthlyScanLimit: true,
        currentScanCount: true,
        scanCountResetAt: true,
      }
    });

    companies.forEach(company => {
      console.log(`📊 ${company.name} (${company.code}):`);
      console.log(`   Limit: ${company.monthlyScanLimit}`);
      console.log(`   Mevcut: ${company.currentScanCount}`);
      console.log(`   Reset Tarihi: ${company.scanCountResetAt}`);
      console.log(`   Kullanım Oranı: ${((company.currentScanCount / company.monthlyScanLimit) * 100).toFixed(1)}%`);
      console.log('');
    });

    console.log('📈 Toplam istatistikler:');
    const totalCompanies = await prisma.company.count();
    const totalInvoices = await prisma.invoice.count();
    
    const totalScansThisMonth = companies.reduce((sum, company) => {
      const now = new Date();
      const resetDate = new Date(company.scanCountResetAt);
      if (now.getMonth() === resetDate.getMonth() && now.getFullYear() === resetDate.getFullYear()) {
        return sum + company.currentScanCount;
      }
      return sum;
    }, 0);

    console.log(`   Toplam Firma: ${totalCompanies}`);
    console.log(`   Toplam Fatura: ${totalInvoices}`);
    console.log(`   Bu Ayki Taramalar: ${totalScansThisMonth}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testScanCount();
