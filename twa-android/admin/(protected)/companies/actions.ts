'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from 'zod';

const CompanySchema = z.object({
  name: z.string().min(3, { message: "Firma adı en az 3 karakter olmalıdır." }),
  code: z.string().min(2, { message: "Firma kodu en az 2 karakter olmalıdır." }).refine(async (code) => {
    const company = await prisma.company.findUnique({ where: { code } });
    return !company;
  }, { message: "Bu firma kodu zaten kullanımda." }),
  monthlyScanLimit: z.coerce.number().int().min(0, { message: 'Limit 0 dan küçük olamaz.' }),
});

export async function createCompany(prevState: any, formData: FormData) {
  const validatedFields = await CompanySchema.safeParseAsync({
    name: formData.get('name'),
    code: formData.get('code'),
    monthlyScanLimit: formData.get('monthlyScanLimit'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  try {
    await prisma.company.create({
      data: validatedFields.data,
    });
  
    revalidatePath("/admin/dashboard");
    return { success: true, message: "Firma başarıyla oluşturuldu." };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Firma oluşturulurken bir hata oluştu." };
  }
}

const UpdateCompanySchema = CompanySchema.omit({ code: true });

export async function updateCompany(
    id: string, 
    prevState: any, 
    formData: FormData
) {
    const code = formData.get('code') as string;

    const validatedFields = UpdateCompanySchema.safeParse({
        name: formData.get('name'),
        monthlyScanLimit: formData.get('monthlyScanLimit'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Eksik veya hatalı alanlar var. Firma güncellenemedi.',
            success: false,
        };
    }
    
    const existingCompanyWithCode = await prisma.company.findFirst({
        where: {
            code: code,
            id: { not: id }
        }
    });

    if (existingCompanyWithCode) {
        return {
            errors: { code: ['Bu firma kodu zaten başka bir firma tarafından kullanılıyor.'] },
            message: 'Firma kodu benzersiz olmalı.',
            success: false,
        };
    }

    try {
        await prisma.company.update({
            where: { id },
            data: {
                ...validatedFields.data,
                code: code
            },
        });
    } catch (e) {
        return { message: 'Veritabanı Hatası: Firma güncellenemedi.', success: false };
    }

    revalidatePath('/admin/dashboard');
    return { success: true, message: 'Firma başarıyla güncellendi.' };
}

export async function deleteCompany(id: string) {
    try {
        const invoiceCount = await prisma.invoice.count({ where: { companyId: id } });

        if (invoiceCount > 0) {
            return { success: false, message: 'Bu firmanın ilişkili faturaları olduğundan silinemez.' };
        }

        await prisma.company.delete({
            where: { id },
        });

        revalidatePath('/admin/dashboard');
        return { success: true, message: 'Firma başarıyla silindi.' };
    } catch (e) {
        return { success: false, message: 'Veritabanı Hatası: Firma silinemedi.' };
    }
}
