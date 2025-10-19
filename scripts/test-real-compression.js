const sharp = require('sharp');
const fs = require('fs');

async function testRealImageCompression() {
  try {
    console.log('📸 Gerçek görsel sıkıştırma testi...');
    
    // Daha gerçekçi test görseli (fatura benzeri)
    const testImageBuffer = await sharp({
      create: {
        width: 2480, // A4 boyutu (300 DPI)
        height: 3508,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .jpeg({ quality: 95 }) // Yüksek kalite
    .toBuffer();
    
    console.log(`📊 Orijinal fatura görseli: ${(testImageBuffer.length / 1024).toFixed(1)} KB`);
    
    // Sıkıştırma
    const compressedBuffer = await sharp(testImageBuffer)
      .jpeg({ 
        quality: 70,
        progressive: true
      })
      .resize(1200, 1600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
    
    const originalSizeKB = testImageBuffer.length / 1024;
    const compressedSizeKB = compressedBuffer.length / 1024;
    const compressionRatio = ((originalSizeKB - compressedSizeKB) / originalSizeKB * 100).toFixed(1);
    
    console.log(`📸 Sıkıştırılmış görsel: ${compressedSizeKB.toFixed(1)} KB`);
    console.log(`📈 Sıkıştırma oranı: %${compressionRatio}`);
    console.log(`💾 Tasarruf: ${(originalSizeKB - compressedSizeKB).toFixed(1)} KB`);
    console.log('');
    
    // Depolama hesaplaması
    const freeStorageMB = 512;
    const imagesPerMB = 1024 / compressedSizeKB;
    const totalImagesPossible = freeStorageMB * imagesPerMB;
    
    console.log(`🎯 Gerçekçi Depolama Kapasitesi:`);
    console.log(`   Sıkıştırılmış fatura görseli: ${compressedSizeKB.toFixed(1)} KB`);
    console.log(`   MB başına görsel sayısı: ${imagesPerMB.toFixed(0)} adet`);
    console.log(`   512 MB ile saklanabilecek: ~${totalImagesPossible.toFixed(0)} görsel`);
    console.log(`   Günlük 10 fatura ile: ~${(totalImagesPossible / 10).toFixed(0)} gün`);
    console.log(`   Aylık 300 fatura ile: ~${(totalImagesPossible / 300).toFixed(0)} ay`);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testRealImageCompression();
