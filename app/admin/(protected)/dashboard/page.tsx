import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

async function getCompanies() {
  const companies = await prisma.company.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  return companies;
}

async function getStats() {
    const totalCompanies = await prisma.company.count();
    const totalInvoices = await prisma.invoice.count();
    const companies = await prisma.company.findMany();
    const totalScansThisMonth = companies.reduce((sum, company) => {
        const now = new Date();
        const resetDate = new Date(company.scanCountResetAt);
        if (now.getMonth() === resetDate.getMonth() && now.getFullYear() === resetDate.getFullYear()) {
            return sum + company.currentScanCount;
        }
        return sum;
    }, 0);
    return { totalCompanies, totalInvoices, totalScansThisMonth };
}

async function getDailyScanData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyScans = await prisma.invoice.groupBy({
    by: ['createdAt'],
    _count: { createdAt: true },
    where: { createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'asc' },
  });

  const formattedData = dailyScans.map(item => ({
    date: item.createdAt.toISOString().split('T')[0],
    scans: item._count.createdAt,
  }));

  return formattedData;
}

export default async function Page() {
  const companies = await getCompanies();
  const stats = await getStats();
  const dailyScanData = await getDailyScanData();

  return (
    <DashboardClient 
        companies={companies}
        stats={stats}
        dailyScanData={dailyScanData}
    />
  )
}
