const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrismaClient() {
  try {
    console.log('🔍 Prisma Client test ediliyor...');
    
    // Prisma client'ın InvoiceImage modelini tanıyıp tanımadığını kontrol et
    console.log('📊 Prisma client modelleri:');
    console.log('   prisma.invoice:', typeof prisma.invoice);
    console.log('   prisma.invoiceImage:', typeof prisma.invoiceImage);
    console.log('   prisma.company:', typeof prisma.company);
    
    // InvoiceImage modelinin metodlarını kontrol et
    if (prisma.invoiceImage) {
      console.log('✅ InvoiceImage modeli mevcut');
      console.log('   create:', typeof prisma.invoiceImage.create);
      console.log('   findMany:', typeof prisma.invoiceImage.findMany);
    } else {
      console.log('❌ InvoiceImage modeli bulunamadı!');
    }
    
    // Basit bir test
    const companyCount = await prisma.company.count();
    console.log(`📊 Toplam firma sayısı: ${companyCount}`);
    
    const invoiceCount = await prisma.invoice.count();
    console.log(`📄 Toplam fatura sayısı: ${invoiceCount}`);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaClient();
