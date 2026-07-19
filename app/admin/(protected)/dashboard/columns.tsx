"use client"

import type { Company, Model, Package } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { EditCompanyModal } from "@/components/admin/EditCompanyModal"
import { DeleteCompanyModal } from "@/components/admin/DeleteCompanyModal"

export type CompanyWithRelations = Company & {
  model: Model | null
  package: Package | null
}

export function makeColumns(models: Model[], packages: Package[]): ColumnDef<CompanyWithRelations>[] {
  return [
    {
      accessorKey: "name",
      header: "Firma Adı",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>
        </div>
      ),
    },
    {
      id: "model",
      header: "Model",
      cell: ({ row }) => {
        const m = row.original.model
        return m ? (
          <Badge variant="outline">{m.displayName} ×{m.creditMultiplier}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Varsayılan</span>
        )
      },
    },
    {
      id: "package",
      header: "Paket",
      cell: ({ row }) => row.original.package?.name ?? <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      id: "usage",
      header: "Kredi Kullanımı",
      cell: ({ row }) => {
        const usage = row.original.usedCredits
        const limit = row.original.monthlyCredits
        const pct = limit > 0 ? (usage / limit) * 100 : 0
        let variant: "default" | "secondary" | "destructive" = "default"
        if (pct > 90) variant = "destructive"
        else if (pct > 70) variant = "secondary"
        return <Badge variant={variant}>{usage} / {limit}</Badge>
      },
    },
    {
      id: "status",
      header: "Durum",
      cell: ({ row }) =>
        row.original.isActive ? <Badge>Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const company = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Menüyü aç</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(company.code)}>
                Firma Kodunu Kopyala
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <EditCompanyModal company={company} models={models} packages={packages} />
              <DeleteCompanyModal company={company} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
