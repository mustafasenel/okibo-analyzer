const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function testCompression() {
  try {
    console.log('📸 Görsel sıkıştırma testi başlatılıyor...');
    
    // Test görseli oluştur (1MB'lık beyaz görsel)
    const testImageBuffer = await sharp({
      create: {
        width: 2000,
        height: 2000,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .jpeg({ quality: 90 })
    .toBuffer();
    
    console.log(`📊 Orijinal test görseli: ${(testImageBuffer.length / 1024).toFixed(1)} KB`);
    
    // Sıkıştırma testi
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
    
    // Depolama kapasitesi hesaplama
    const freeStorageMB = 512;
    const imagesPerMB = 1024 / compressedSizeKB;
    const totalImagesPossible = freeStorageMB * imagesPerMB;
    
    console.log(`🎯 Depolama Kapasitesi:`);
    console.log(`   Sıkıştırılmış görsel başına: ${compressedSizeKB.toFixed(1)} KB`);
    console.log(`   MB başına görsel sayısı: ${imagesPerMB.toFixed(0)} adet`);
    console.log(`   512 MB ile saklanabilecek: ~${totalImagesPossible.toFixed(0)} görsel`);
    console.log(`   Günlük 10 görsel ile: ~${(totalImagesPossible / 10).toFixed(0)} gün`);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testCompression();
