'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';

// Prisma client instance
const prisma = new PrismaClient();

// Görsel sıkıştırma fonksiyonu (File'dan)
async function compressImage(file: File): Promise<Buffer> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Sharp ile sıkıştırma
    const compressedBuffer = await sharp(buffer)
      .jpeg({ 
        quality: 70, // %70 kalite (varsayılan %80)
        progressive: true // Progressive JPEG
      })
      .resize(1200, 1600, { // Maksimum boyut sınırı
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
    
    console.log(`📸 Görsel sıkıştırıldı: ${(buffer.length / 1024).toFixed(1)}KB → ${(compressedBuffer.length / 1024).toFixed(1)}KB`);
    
    return compressedBuffer;
  } catch (error) {
    console.error('Görsel sıkıştırma hatası:', error);
    // Hata durumunda orijinal buffer'ı döndür
    return Buffer.from(await file.arrayBuffer());
  }
}

// Görsel sıkıştırma fonksiyonu (Buffer'dan)
async function compressImageFromBuffer(buffer: Buffer): Promise<Buffer> {
  try {
    // Sharp ile sıkıştırma
    const compressedBuffer = await sharp(buffer)
      .jpeg({ 
        quality: 70, // %70 kalite (varsayılan %80)
        progressive: true // Progressive JPEG
      })
      .resize(1200, 1600, { // Maksimum boyut sınırı
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
    
    console.log(`📸 Görsel sıkıştırıldı: ${(buffer.length / 1024).toFixed(1)}KB → ${(compressedBuffer.length / 1024).toFixed(1)}KB`);
    
    return compressedBuffer;
  } catch (error) {
    console.error('Görsel sıkıştırma hatası:', error);
    // Hata durumunda orijinal buffer'ı döndür
    return buffer;
  }
}

export async function updateInvoice(invoiceId: string, invoicePayload: InvoicePayload) {
  try {
    const updatedInvoice = await prisma.invoice.update({
      where: {
        id: invoiceId
      },
      data: {
        invoiceMeta: invoicePayload.invoiceMeta,
        invoiceData: invoicePayload.invoiceData,
        invoiceSummary: invoicePayload.invoiceSummary || {},
        status: 'COMPLETED'
      }
    });

    // Görselleri güncelle (eski görselleri sil, yenilerini ekle)
    if (invoicePayload.images && invoicePayload.images.length > 0) {
      // Eski görselleri sil
      await prisma.invoiceImage.deleteMany({
        where: { invoiceId: invoiceId }
      });

      // Yeni görselleri ekle
      for (let i = 0; i < invoicePayload.images.length; i++) {
        const base64String = invoicePayload.images[i];
        
        // Base64 string'i Buffer'a çevir
        const base64Data = base64String.split(',')[1]; // "data:image/jpeg;base64," kısmını çıkar
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Görseli sıkıştır
        const compressedBuffer = await compressImageFromBuffer(buffer);
        
        if (!prisma.invoiceImage) {
          throw new Error('InvoiceImage modeli bulunamadı!');
        }
        
        await prisma.invoiceImage.create({
          data: {
            invoiceId: invoiceId,
            filename: `${invoiceId}_page_${i + 1}_${Date.now()}.jpg`,
            originalName: `invoice_page_${i + 1}.jpg`,
            mimeType: 'image/jpeg', // Sıkıştırılmış görsel her zaman JPEG
            size: compressedBuffer.length, // Sıkıştırılmış boyut
            data: compressedBuffer,
            pageNumber: i + 1,
          }
        });
      }
    }

    revalidatePath('/history');
    return { success: true, invoice: updatedInvoice };
  } catch (error) {
    console.error('Error updating invoice:', error);
    return { success: false, error: 'Failed to update invoice' };
  }
}

interface InvoicePayload {
    invoiceMeta: any;
    invoiceData: any;
    invoiceSummary: any;
    images?: string[]; // Base64 strings
}

export async function saveInvoice(invoicePayload: InvoicePayload, companyCode: string) {
    try {
        console.log('🔍 saveInvoice başlatılıyor...');
        console.log('📊 invoicePayload:', {
            hasImages: !!invoicePayload.images,
            imageCount: invoicePayload.images?.length || 0,
            hasMeta: !!invoicePayload.invoiceMeta,
            hasData: !!invoicePayload.invoiceData,
            hasSummary: !!invoicePayload.invoiceSummary
        });
        
        const company = await prisma.company.findUnique({
            where: { code: companyCode }
        });

        if (!company) {
            return { success: false, error: "Geçersiz firma kodu." };
        }

        console.log('✅ Firma bulundu:', company.name);

        console.log('📄 Invoice oluşturuluyor...');
        const invoice = await prisma.invoice.create({
            data: {
                company: {
                    connect: {
                        id: company.id
                    }
                },
                invoiceMeta: invoicePayload.invoiceMeta,
                invoiceData: invoicePayload.invoiceData, // This is now the paginated data
                invoiceSummary: invoicePayload.invoiceSummary || {},
                status: 'PENDING'
            }
        });
        console.log('✅ Invoice oluşturuldu:', invoice.id);

        // Görselleri kaydet
        if (invoicePayload.images && invoicePayload.images.length > 0) {
            console.log(`🖼️ ${invoicePayload.images.length} görsel kaydediliyor...`);
            for (let i = 0; i < invoicePayload.images.length; i++) {
                try {
                    const base64String = invoicePayload.images[i];
                    console.log(`📸 Görsel ${i + 1} işleniyor...`);
                    console.log(`📊 Base64 string uzunluğu: ${base64String.length}`);
                    
                    // Base64 string'i Buffer'a çevir
                    const base64Data = base64String.split(',')[1]; // "data:image/jpeg;base64," kısmını çıkar
                    console.log(`📊 Base64 data uzunluğu: ${base64Data.length}`);
                    
                    const buffer = Buffer.from(base64Data, 'base64');
                    console.log(`📊 Buffer uzunluğu: ${buffer.length} bytes`);
                    
                    // Görseli sıkıştır
                    console.log(`📸 Görsel ${i + 1} sıkıştırılıyor...`);
                    let compressedBuffer;
                    try {
                        compressedBuffer = await compressImageFromBuffer(buffer);
                        console.log(`✅ Görsel ${i + 1} sıkıştırıldı`);
                    } catch (compressError) {
                        console.error(`❌ Görsel ${i + 1} sıkıştırma hatası:`, compressError);
                        console.log(`📸 Görsel ${i + 1} sıkıştırılmadan kaydediliyor...`);
                        compressedBuffer = buffer; // Sıkıştırma başarısız olursa orijinal buffer'ı kullan
                    }
                    
                    console.log(`💾 Görsel ${i + 1} veritabanına kaydediliyor...`);
                    console.log('🔍 prisma.invoiceImage:', typeof prisma.invoiceImage);
                    console.log('🔍 prisma.invoiceImage.create:', typeof prisma.invoiceImage?.create);
                    
                    if (!prisma.invoiceImage) {
                        throw new Error('InvoiceImage modeli bulunamadı!');
                    }
                    
                    await prisma.invoiceImage.create({
                        data: {
                            invoiceId: invoice.id,
                            filename: `${invoice.id}_page_${i + 1}_${Date.now()}.jpg`,
                            originalName: `invoice_page_${i + 1}.jpg`,
                            mimeType: 'image/jpeg', // Sıkıştırılmış görsel her zaman JPEG
                            size: compressedBuffer.length, // Sıkıştırılmış boyut
                            data: compressedBuffer,
                            pageNumber: i + 1,
                        }
                    });
                    console.log(`✅ Görsel ${i + 1} kaydedildi`);
                } catch (error) {
                    console.error(`❌ Görsel ${i + 1} kaydedilirken hata:`, error);
                }
            }
        } else {
            console.log('ℹ️ Kaydedilecek görsel yok');
        }

        revalidatePath('/admin/dashboard');
        revalidatePath('/history');

        return { success: true };
    } catch (error: any) {
        console.error('❌ saveInvoice hatası:', error);
        console.error('❌ Hata detayı:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return { success: false, error: error.message || 'Bilinmeyen hata' };
    }
}

export async function checkUsageLimit(companyCode: string, scanCount: number = 1): Promise<{ success: boolean; message: string }> {
    if (!companyCode) {
        return { success: false, message: "Firma kodu ayarlanmamış. Lütfen ayarlardan kontrol edin." };
    }

    try {
        const company = await prisma.company.findUnique({
            where: { code: companyCode },
        });

        if (!company) {
            return { success: false, message: "Geçersiz firma kodu. Lütfen ayarları kontrol edin." };
        }

        // Check if the scan count needs to be reset
        const now = new Date();
        const resetDate = new Date(company.scanCountResetAt);
        let currentScanCount = company.currentScanCount;
        
        if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            // Reset scan count for new month
            await prisma.company.update({
                where: { code: companyCode },
                data: {
                    currentScanCount: 0,
                    scanCountResetAt: now,
                }
            });
            currentScanCount = 0;
        }
        
        // Check if adding the scan count would exceed the limit
        if (currentScanCount + scanCount > company.monthlyScanLimit) {
            return { success: false, message: `Aylık tarama limitiniz (${company.monthlyScanLimit}) dolmuştur. Mevcut kullanım: ${currentScanCount}` };
        }
        
        return { success: true, message: "Limit kontrolü başarılı." };
    } catch (error) {
        console.error("Error checking usage limit:", error);
        return { success: false, message: "Limit kontrolü sırasında bir hata oluştu." };
    }
}

export async function incrementScanCount(companyCode: string, scanCount: number = 1): Promise<{ success: boolean; message: string }> {
    try {
        const company = await prisma.company.findUnique({
            where: { code: companyCode },
        });

        if (!company) {
            return { success: false, message: "Geçersiz firma kodu." };
        }

        // Check if the scan count needs to be reset
        const now = new Date();
        const resetDate = new Date(company.scanCountResetAt);
        let currentScanCount = company.currentScanCount;
        
        if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            // Reset scan count for new month
            await prisma.company.update({
                where: { code: companyCode },
                data: {
                    currentScanCount: 0,
                    scanCountResetAt: now,
                }
            });
            currentScanCount = 0;
        }
        
        // Increment the scan count
        await prisma.company.update({
            where: { code: companyCode },
            data: {
                currentScanCount: currentScanCount + scanCount,
            }
        });
        
        // Revalidate admin dashboard to update scan counts
        revalidatePath('/admin/dashboard');
        
        return { success: true, message: "Tarama sayısı artırıldı." };
    } catch (error) {
        console.error("Error incrementing scan count:", error);
        return { success: false, message: "Tarama sayısı artırılırken bir hata oluştu." };
    }
}
