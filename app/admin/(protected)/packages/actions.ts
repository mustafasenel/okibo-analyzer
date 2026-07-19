'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface PackageInput {
  name: string;
  monthlyCredits: number;
  isActive: boolean;
}

function validate(input: PackageInput): string | null {
  if (!input.name?.trim()) return 'Paket adı zorunludur.';
  if (!Number.isFinite(input.monthlyCredits) || input.monthlyCredits < 0) return 'Aylık kredi 0 veya daha büyük olmalıdır.';
  return null;
}

export async function createPackage(input: PackageInput) {
  const err = validate(input);
  if (err) return { success: false, error: err };
  try {
    await prisma.package.create({
      data: {
        name: input.name.trim(),
        monthlyCredits: Math.round(input.monthlyCredits),
        isActive: input.isActive,
      },
    });
    revalidatePath('/admin/packages');
    return { success: true };
  } catch (e) {
    console.error('createPackage error:', e);
    return { success: false, error: 'Paket oluşturulamadı.' };
  }
}

export async function updatePackage(id: string, input: PackageInput) {
  const err = validate(input);
  if (err) return { success: false, error: err };
  try {
    await prisma.package.update({
      where: { id },
      data: {
        name: input.name.trim(),
        monthlyCredits: Math.round(input.monthlyCredits),
        isActive: input.isActive,
      },
    });
    revalidatePath('/admin/packages');
    return { success: true };
  } catch (e) {
    console.error('updatePackage error:', e);
    return { success: false, error: 'Paket güncellenemedi.' };
  }
}

export async function deletePackage(id: string) {
  try {
    const inUse = await prisma.company.count({ where: { packageId: id } });
    if (inUse > 0) {
      return { success: false, error: `Bu paket ${inUse} firmaya atanmış durumda, silinemez. Önce firmaların paketini değiştirin.` };
    }
    await prisma.package.delete({ where: { id } });
    revalidatePath('/admin/packages');
    return { success: true };
  } catch (e) {
    console.error('deletePackage error:', e);
    return { success: false, error: 'Paket silinemedi.' };
  }
}
