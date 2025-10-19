const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStorageUsage() {
  try {
    console.log('💾 Depolama kullanımı kontrol ediliyor...');
    
    // Toplam görsel sayısı ve boyutu
    const images = await prisma.invoiceImage.findMany({
      select: {
        size: true,
        originalName: true,
        createdAt: true
      }
    });

    const totalImages = images.length;
    const totalSizeBytes = images.reduce((sum, img) => sum + img.size, 0);
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const totalSizeKB = (totalSizeBytes / 1024).toFixed(2);

    console.log(`📊 Görsel İstatistikleri:`);
    console.log(`   Toplam görsel sayısı: ${totalImages}`);
    console.log(`   Toplam boyut: ${totalSizeMB} MB (${totalSizeKB} KB)`);
    console.log(`   Ortalama görsel boyutu: ${totalImages > 0 ? (totalSizeBytes / totalImages / 1024).toFixed(1) : 0} KB`);
    console.log('');

    // Fatura sayısı
    const invoiceCount = await prisma.invoice.count();
    console.log(`📄 Toplam fatura sayısı: ${invoiceCount}`);
    console.log(`📈 Fatura başına ortalama görsel: ${invoiceCount > 0 ? (totalImages / invoiceCount).toFixed(1) : 0}`);
    console.log('');

    // Depolama limitleri
    const freeStorageMB = 512; // MongoDB Atlas ücretsiz tier
    const usedPercentage = ((totalSizeBytes / (1024 * 1024)) / freeStorageMB * 100).toFixed(1);
    
    console.log(`🎯 Depolama Durumu:`);
    console.log(`   Kullanılan: ${totalSizeMB} MB / ${freeStorageMB} MB`);
    console.log(`   Kullanım oranı: %${usedPercentage}`);
    console.log(`   Kalan alan: ${(freeStorageMB - parseFloat(totalSizeMB)).toFixed(2)} MB`);
    console.log('');

    // Tahminler
    if (totalImages > 0) {
      const avgImageSizeKB = totalSizeBytes / totalImages / 1024;
      const remainingImages = Math.floor((freeStorageMB * 1024 - totalSizeBytes / 1024) / avgImageSizeKB);
      
      console.log(`🔮 Tahminler:`);
      console.log(`   Ortalama görsel boyutu: ${avgImageSizeKB.toFixed(1)} KB`);
      console.log(`   Daha saklayabileceğiniz görsel: ~${remainingImages} adet`);
      console.log(`   Günlük 10 görsel ile: ~${Math.floor(remainingImages / 10)} gün`);
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStorageUsage();
