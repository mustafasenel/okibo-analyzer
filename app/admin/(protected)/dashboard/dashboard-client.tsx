'use client';

import { useState } from "react";
import { Prisma } from "@prisma/client";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { SectionCards } from "@/components/admin/section-cards";
import { ChartAreaInteractive } from "@/components/admin/chart-area-interactive";
import { NewCompanyModal } from "@/components/admin/NewCompanyModal";

type CompanyWithData = Prisma.Company;
type DailyScanData = { date: string; scans: number };

interface DashboardClientProps {
    companies: CompanyWithData[];
    stats: {
        totalCompanies: number;
        totalInvoices: number;
        totalScansThisMonth: number;
    };
    dailyScanData: DailyScanData[];
}

export function DashboardClient({ companies, stats, dailyScanData }: DashboardClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSuccess = () => {
        setIsModalOpen(false);
        // revalidatePath in server action will handle the data refresh
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <SectionCards 
                totalCompanies={stats.totalCompanies}
                totalInvoices={stats.totalInvoices}
                totalScansThisMonth={stats.totalScansThisMonth}
            />
            <ChartAreaInteractive data={dailyScanData} />
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Firmalar</h1>
                <NewCompanyModal 
                    open={isModalOpen} 
                    onOpenChange={setIsModalOpen} 
                    onSuccess={handleSuccess} 
                />
            </div>
             <DataTable columns={columns} data={companies} />
        </div>
    );
}
