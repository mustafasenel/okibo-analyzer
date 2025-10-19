const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testImageStorage() {
  try {
    console.log('🖼️ Görsel saklama testi başlatılıyor...');
    
    // Mevcut faturaları kontrol et
    const invoices = await prisma.invoice.findMany({
      include: {
        images: true
      }
    });

    console.log(`📊 Toplam fatura sayısı: ${invoices.length}`);
    
    invoices.forEach(invoice => {
      console.log(`📄 Fatura ID: ${invoice.id}`);
      console.log(`   Görsel sayısı: ${invoice.images.length}`);
      invoice.images.forEach(image => {
        console.log(`   - ${image.originalName} (${image.size} bytes, Sayfa ${image.pageNumber})`);
      });
      console.log('');
    });

    // InvoiceImage tablosunu kontrol et
    const totalImages = await prisma.invoiceImage.count();
    console.log(`🖼️ Toplam görsel sayısı: ${totalImages}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImageStorage();
