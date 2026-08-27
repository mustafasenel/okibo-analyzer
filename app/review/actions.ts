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
    /** Mobilde masaüstü düzeltme kuyruğuna işaretlenen şüpheli hücreler */
    flaggedCells?: any[];
}

export async function saveInvoice(invoicePayload: InvoicePayload, companyCode: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { code: companyCode },
            include: { model: true },
        });

        if (!company) {
            return { success: false, error: 'Geçersiz firma kodu.' };
        }

        // Denetim: hangi model kullanıldı ve kaç kredi tüketildi (sayfa × çarpan)
        const multiplier = company.model?.creditMultiplier && company.model.creditMultiplier > 0
            ? company.model.creditMultiplier
            : 1;
        const pageCount = Array.isArray(invoicePayload.invoiceData) ? invoicePayload.invoiceData.length : 0;
        const creditsCost = Math.max(1, pageCount) * multiplier;

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
                modelUsed: company.model?.openrouterId ?? null,
                creditsCost,
                flaggedCells: invoicePayload.flaggedCells ?? [],
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

// Kredi maliyeti = tarama (görsel) sayısı × modelin kredi çarpanı.
// Company'ye atanmış model yoksa çarpan 1 kabul edilir.
function resolveMultiplier(model: { creditMultiplier: number } | null): number {
    return model?.creditMultiplier && model.creditMultiplier > 0 ? model.creditMultiplier : 1;
}

// Aylık kredi kotasının yeni aya girildiyse sıfırlanması gereken durumu uygular.
// Güncellenmiş usedCredits değerini döndürür.
async function resetCreditsIfNewMonth(
    companyCode: string,
    resetAt: Date,
    usedCredits: number
): Promise<number> {
    const now = new Date();
    const resetDate = new Date(resetAt);
    if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        await prisma.company.update({
            where: { code: companyCode },
            data: { usedCredits: 0, creditResetAt: now },
        });
        return 0;
    }
    return usedCredits;
}

export async function checkUsageLimit(companyCode: string, scanCount: number = 1): Promise<{ success: boolean; message: string; cost?: number }> {
    if (!companyCode) {
        return { success: false, message: "Firma kodu ayarlanmamış. Lütfen ayarlardan kontrol edin." };
    }

    try {
        const company = await prisma.company.findUnique({
            where: { code: companyCode },
            include: { model: true },
        });

        if (!company) {
            return { success: false, message: "Geçersiz firma kodu. Lütfen ayarları kontrol edin." };
        }

        if (!company.isActive) {
            return { success: false, message: "Firma hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin." };
        }

        const usedCredits = await resetCreditsIfNewMonth(companyCode, company.creditResetAt, company.usedCredits);
        const cost = scanCount * resolveMultiplier(company.model);

        if (usedCredits + cost > company.monthlyCredits) {
            const remaining = Math.max(0, company.monthlyCredits - usedCredits);
            return {
                success: false,
                message: `Yeterli krediniz yok. Bu işlem ${cost} kredi gerektiriyor, kalan krediniz ${remaining}. (Aylık kota: ${company.monthlyCredits})`,
                cost,
            };
        }

        return { success: true, message: "Kredi kontrolü başarılı.", cost };
    } catch (error) {
        console.error("Error checking usage limit:", error);
        return { success: false, message: "Kredi kontrolü sırasında bir hata oluştu." };
    }
}

export async function incrementScanCount(companyCode: string, scanCount: number = 1): Promise<{ success: boolean; message: string }> {
    try {
        const company = await prisma.company.findUnique({
            where: { code: companyCode },
            include: { model: true },
        });

        if (!company) {
            return { success: false, message: "Geçersiz firma kodu." };
        }

        const usedCredits = await resetCreditsIfNewMonth(companyCode, company.creditResetAt, company.usedCredits);
        const cost = scanCount * resolveMultiplier(company.model);

        await prisma.company.update({
            where: { code: companyCode },
            data: { usedCredits: usedCredits + cost },
        });

        // Revalidate admin dashboard to update credit usage
        revalidatePath('/admin/dashboard');

        return { success: true, message: "Kredi kullanımı güncellendi." };
    } catch (error) {
        console.error("Error incrementing credit usage:", error);
        return { success: false, message: "Kredi kullanımı güncellenirken bir hata oluştu." };
    }
}
