'use client';

import { useState } from "react";
import type { Model, Package } from "@prisma/client";
import { DataTable } from "@/components/admin/data-table";
import { makeColumns, CompanyWithRelations } from "./columns";
import { SectionCards } from "@/components/admin/section-cards";
import { ChartAreaInteractive } from "@/components/admin/chart-area-interactive";
import { NewCompanyModal } from "@/components/admin/NewCompanyModal";

type DailyScanData = { date: string; scans: number };

interface DashboardClientProps {
    companies: CompanyWithRelations[];
    models: Model[];
    packages: Package[];
    stats: {
        totalCompanies: number;
        totalInvoices: number;
        totalScansThisMonth: number;
        totalScansToday: number;
    };
    dailyScanData: DailyScanData[];
}

export function DashboardClient({ companies, models, packages, stats, dailyScanData }: DashboardClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const columns = makeColumns(models, packages);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <SectionCards
                totalCompanies={stats.totalCompanies}
                totalInvoices={stats.totalInvoices}
                totalScansThisMonth={stats.totalScansThisMonth}
                totalScansToday={stats.totalScansToday}
            />
            <ChartAreaInteractive data={dailyScanData} />
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Firmalar</h1>
                <NewCompanyModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    onSuccess={() => setIsModalOpen(false)}
                    models={models}
                    packages={packages}
                />
            </div>
            <DataTable columns={columns} data={companies} />
        </div>
    );
}
