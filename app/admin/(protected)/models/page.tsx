import { prisma } from '@/lib/prisma';
import { ModelsManager } from '@/components/admin/ModelsManager';

export const dynamic = 'force-dynamic';

export default async function ModelsPage() {
  const models = await prisma.model.findMany({ orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }] });
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
      <ModelsManager models={models} />
    </div>
  );
}
