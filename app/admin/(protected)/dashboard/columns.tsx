"use client"

import { Prisma } from "@prisma/client"
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

type Company = Prisma.Company

export const columns: ColumnDef<Company>[] = [
  {
    accessorKey: "name",
    header: "Firma Adı",
  },
  {
    accessorKey: "code",
    header: "Firma Kodu",
  },
  {
    accessorKey: "monthlyScanLimit",
    header: "Aylık Limit",
  },
  {
    accessorKey: "currentScanCount",
    header: "Kullanım",
    cell: ({ row }) => {
      const company = row.original
      const usage = company.currentScanCount;
      const limit = company.monthlyScanLimit;
      const percentage = limit > 0 ? (usage / limit) * 100 : 0;
      
      let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
      if (percentage > 90) {
        badgeVariant = "destructive";
      } else if (percentage > 70) {
        badgeVariant = "secondary";
      }

      return <Badge variant={badgeVariant}>{`${usage} / ${limit}`}</Badge>
    }
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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(company.code)}
            >
              Firma Kodunu Kopyala
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EditCompanyModal company={company} />
            <DeleteCompanyModal company={company} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
