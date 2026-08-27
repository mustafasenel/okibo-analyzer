// pdf.js worker'ını public/ altına kopyalar.
// PDF sayfa ayırma tarayıcıda bu worker ile çalışır; CDN'e bağımlı olmamak için
// kurulumdan sonra otomatik güncellenir.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

try {
  if (!fs.existsSync(src)) {
    console.warn('⚠ pdfjs-dist worker bulunamadı, atlanıyor:', src);
    process.exit(0);
  }
  fs.copyFileSync(src, dest);
  console.log('✓ pdf.worker public/ altına kopyalandı');
} catch (err) {
  console.warn('⚠ pdf worker kopyalanamadı:', err.message);
}
