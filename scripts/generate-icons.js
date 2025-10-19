const fs = require('fs');
const path = require('path');

// Icon boyutları
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Mevcut icon'u kopyalayarak farklı boyutlarda oluştur
const sourceIcon = path.join(__dirname, '../public/icons/icon.png');
const iconsDir = path.join(__dirname, '../public/icons/');

if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found:', sourceIcon);
    process.exit(1);
}

// Her boyut için icon oluştur
sizes.forEach(size => {
    const filename = `icon-${size}x${size}.png`;
    const targetPath = path.join(iconsDir, filename);
    
    // Basit kopyalama (gerçek resize için ImageMagick gerekli)
    fs.copyFileSync(sourceIcon, targetPath);
    console.log(`Created ${filename}`);
});

console.log('Icons generated! Note: For proper resizing, use ImageMagick or online tools.');
