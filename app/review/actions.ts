'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

// Prisma client instance
const prisma = new PrismaClient();

// Cloudinary yapılandırması
// CLOUDINARY_URL ortam değişkeni varsa, SDK yapılandırmayı otomatik olarak yapar.
cloudinary.config();

// Tipler
interface UploadedImageInfo {
    publicId: string;
    url: string;
    originalName: string;
}

interface InvoicePayload {
    invoiceMeta: any;
    invoiceData: any;
    invoiceSummary: any;
    images?: UploadedImageInfo[];
}

export async function updateInvoice(invoiceId: string, invoicePayload: InvoicePayload) {
  try {
    // 1. Faturanın ana verilerini güncelle
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        invoiceMeta: invoicePayload.invoiceMeta,
        invoiceData: invoicePayload.invoiceData,
        invoiceSummary: invoicePayload.invoiceSummary || {},
        status: 'COMPLETED',
      },
    });

    // 2. Görsel yönetimi
    if (invoicePayload.images) {
      // Mevcut görselleri veritabanından çek (sadece publicId'leri al)
      const oldImages = await prisma.invoiceImage.findMany({
        where: { invoiceId: invoiceId },
        select: { publicId: true }, // Sadece publicId'yi seçerek tip güvenliğini artır
      });

      // Eski görselleri Cloudinary'den ve veritabanından sil
      if (oldImages.length > 0) {
        const publicIdsToDelete = oldImages.map((img) => img.publicId);
        console.log(`☁️ Cloudinary'den silinecek görseller:`, publicIdsToDelete);
        if (publicIdsToDelete.length > 0) {
          await cloudinary.api.delete_resources(publicIdsToDelete);
        }
        await prisma.invoiceImage.deleteMany({
          where: { invoiceId: invoiceId },
        });
        console.log('🗑️ Eski görseller veritabanından silindi.');
      }

      // Yeni görselleri veritabanına ekle
      if (invoicePayload.images.length > 0) {
        const newImagesData = invoicePayload.images.map((image, index) => ({
          invoiceId: invoiceId,
          publicId: image.publicId,
          url: image.url,
          originalName: image.originalName,
          pageNumber: index + 1,
        }));

        await prisma.invoiceImage.createMany({
          data: newImagesData,
        });
        console.log(`✨ ${newImagesData.length} yeni görsel veritabanına eklendi.`);
      }
    }

    revalidatePath('/history');
    return { success: true, invoice: updatedInvoice };
  } catch (error) {
    console.error('Error updating invoice:', error);
    return { success: false, error: 'Failed to update invoice' };
  }
}

export async function saveInvoice(invoicePayload: InvoicePayload, companyCode: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { code: companyCode },
        });

        if (!company) {
            return { success: false, error: 'Geçersiz firma kodu.' };
        }

        // Faturayı oluştur
        const invoice = await prisma.invoice.create({
            data: {
                company: {
                    connect: { id: company.id },
                },
                invoiceMeta: invoicePayload.invoiceMeta,
                invoiceData: invoicePayload.invoiceData,
                invoiceSummary: invoicePayload.invoiceSummary || {},
                status: 'PENDING',
            },
        });

        // Görselleri veritabanına kaydet
        if (invoicePayload.images && invoicePayload.images.length > 0) {
            const imagesData = invoicePayload.images.map((image, index) => ({
                invoiceId: invoice.id,
                publicId: image.publicId,
                url: image.url,
                originalName: image.originalName,
                pageNumber: index + 1,
            }));

            await prisma.invoiceImage.createMany({
                data: imagesData,
            });
            console.log(`🖼️ ${imagesData.length} görsel referansı veritabanına kaydedildi.`);
        }

        revalidatePath('/admin/dashboard');
        revalidatePath('/history');

        return { success: true };
    } catch (error: any) {
        console.error('❌ saveInvoice hatası:', error);
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
