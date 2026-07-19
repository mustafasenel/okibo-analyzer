import { prisma } from '@/lib/prisma';
import { PackagesManager } from '@/components/admin/PackagesManager';

export const dynamic = 'force-dynamic';

export default async function PackagesPage() {
  const packages = await prisma.package.findMany({ orderBy: { monthlyCredits: 'asc' } });
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
      <PackagesManager packages={packages} />
    </div>
  );
}
