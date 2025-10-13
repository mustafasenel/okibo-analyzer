'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Tip tanımını sunucu tarafında da yapalım
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

export async function saveInvoice(invoiceData: InvoiceData, companyCode: string): Promise<{ success: boolean; message: string }> {
    if (!invoiceData || !companyCode) {
        return { success: false, message: "Fatura verileri veya firma kodu eksik." };
    }

    try {
        const company = await prisma.company.findUnique({ where: { code: companyCode } });
        if (!company) {
            return { success: false, message: "Geçersiz firma kodu. Lütfen ayarları kontrol edin." };
        }

        // Check usage limit again just before saving
        if (company.currentScanCount >= company.monthlyScanLimit) {
            return { success: false, message: "Aylık tarama limitiniz dolmuştur. Fatura kaydedilemedi." };
        }

        const [, updatedCompany] = await prisma.$transaction([
            prisma.invoice.create({
                data: {
                    invoiceMeta: invoiceData.invoice_meta || {},
                    invoiceData: invoiceData.invoice_data || [],
                    invoiceSummary: invoiceData.invoice_summary || {},
                    companyCode: companyCode,
                }
            }),
            prisma.company.update({
                where: { code: companyCode },
                data: {
                    currentScanCount: {
                        increment: 1
                    }
                }
            })
        ]);
        
        revalidatePath("/admin/dashboard");
        return { success: true, message: "Fatura başarıyla kaydedildi." };

    } catch (error) {
        console.error("Error saving invoice to DB:", error);
        return { success: false, message: "Veritabanına kaydederken bir hata oluştu." };
    }
}

export async function checkAndIncrementUsage(companyCode: string): Promise<{ success: boolean; message: string }> {
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
        if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
             await prisma.company.update({
                where: { code: companyCode },
                data: {
                    currentScanCount: 0,
                    scanCountResetAt: now,
                }
            });
            // Re-fetch company data after reset
            const updatedCompany = await prisma.company.findUnique({ where: { code: companyCode } });
            if (!updatedCompany) return { success: false, message: "Firma bulunamadı."}; // Should not happen
            
            if (updatedCompany.currentScanCount >= updatedCompany.monthlyScanLimit) {
                return { success: false, message: `Aylık tarama limitiniz (${updatedCompany.monthlyScanLimit}) dolmuştur.` };
            }
        } else {
            if (company.currentScanCount >= company.monthlyScanLimit) {
                return { success: false, message: `Aylık tarama limitiniz (${company.monthlyScanLimit}) dolmuştur.` };
            }
        }
        
        return { success: true, message: "Limit kontrolü başarılı." };
    } catch (error) {
        console.error("Error checking usage limit:", error);
        return { success: false, message: "Limit kontrolü sırasında bir hata oluştu." };
    }
}
