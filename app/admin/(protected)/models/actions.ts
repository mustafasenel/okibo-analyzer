'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface ModelInput {
  openrouterId: string;
  displayName: string;
  creditMultiplier: number;
  isActive: boolean;
  /** Analiz hata verirse bu modele düşülür (yalnızca biri işaretli olabilir) */
  isFallback?: boolean;
  sortOrder?: number;
}

/** Yedek model tekildir: başka bir model işaretlendiğinde diğerleri temizlenir. */
async function clearOtherFallbacks(keepId: string) {
  await prisma.model.updateMany({
    where: { isFallback: true, id: { not: keepId } },
    data: { isFallback: false },
  });
}

function validate(input: ModelInput): string | null {
  if (!input.openrouterId?.trim()) return 'OpenRouter model adı zorunludur (örn. qwen/qwen3-vl-8b-instruct).';
  if (!input.displayName?.trim()) return 'Görünen ad zorunludur.';
  if (!Number.isFinite(input.creditMultiplier) || input.creditMultiplier < 1) return 'Kredi çarpanı en az 1 olmalıdır.';
  return null;
}

export async function createModel(input: ModelInput) {
  const err = validate(input);
  if (err) return { success: false, error: err };
  try {
    const created = await prisma.model.create({
      data: {
        openrouterId: input.openrouterId.trim(),
        displayName: input.displayName.trim(),
        creditMultiplier: Math.round(input.creditMultiplier),
        isActive: input.isActive,
        isFallback: input.isFallback ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    if (input.isFallback) await clearOtherFallbacks(created.id);
    revalidatePath('/admin/models');
    return { success: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { success: false, error: 'Bu OpenRouter model adı zaten kayıtlı.' };
    console.error('createModel error:', e);
    return { success: false, error: 'Model oluşturulamadı.' };
  }
}

export async function updateModel(id: string, input: ModelInput) {
  const err = validate(input);
  if (err) return { success: false, error: err };
  try {
    await prisma.model.update({
      where: { id },
      data: {
        openrouterId: input.openrouterId.trim(),
        displayName: input.displayName.trim(),
        creditMultiplier: Math.round(input.creditMultiplier),
        isActive: input.isActive,
        isFallback: input.isFallback ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    if (input.isFallback) await clearOtherFallbacks(id);
    revalidatePath('/admin/models');
    return { success: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { success: false, error: 'Bu OpenRouter model adı zaten kayıtlı.' };
    console.error('updateModel error:', e);
    return { success: false, error: 'Model güncellenemedi.' };
  }
}

export async function deleteModel(id: string) {
  try {
    const inUse = await prisma.company.count({ where: { modelId: id } });
    if (inUse > 0) {
      return { success: false, error: `Bu model ${inUse} firmaya atanmış durumda, silinemez. Önce firmaların modelini değiştirin.` };
    }
    await prisma.model.delete({ where: { id } });
    revalidatePath('/admin/models');
    return { success: true };
  } catch (e) {
    console.error('deleteModel error:', e);
    return { success: false, error: 'Model silinemedi.' };
  }
}
