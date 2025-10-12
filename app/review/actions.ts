'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Tip tanımını sunucu tarafında da yapalım
type InvoiceData = {
  invoice_meta?: Record<string, string | number>;
  invoice_data?: Record<string, string | number>[];
  invoice_summary?: Record<string, string | number>;
};

export async function saveInvoice(invoiceData: InvoiceData, companyCode: string) {
  if (!invoiceData || !companyCode) {
    throw new Error('Fatura verisi veya firma kodu eksik.');
  }

  try {
    const result = await prisma.invoice.create({
      data: {
        companyCode: companyCode,
        invoiceMeta: invoiceData.invoice_meta || {},
        invoiceData: invoiceData.invoice_data || [],
        invoiceSummary: invoiceData.invoice_summary || {},
        // status alanı varsayılan olarak PENDING olacak
      },
    });

    // İsteğe bağlı: İlgili sayfaların önbelleğini temizle
    // revalidatePath('/history'); 

    return { success: true, data: result };
  } catch (error) {
    console.error('Veritabanına kaydetme hatası:', error);
    // Gerçek bir uygulamada burada daha detaylı hata yönetimi yapılabilir
    return { success: false, error: 'Fatura kaydedilemedi.' };
  }
}
