import { IconUsers, IconScan, IconFile, IconTrendingUp } from "@tabler/icons-react"
import Link from "next/link"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  totalCompanies: number;
  totalScansThisMonth: number;
  totalInvoices: number;
}

export function SectionCards({ totalCompanies, totalScansThisMonth, totalInvoices }: SectionCardsProps) {
  const data = [
    {
      title: "Toplam Firma",
      value: totalCompanies,
      icon: IconUsers,
      action: "Tüm firmaları gör",
      url: "/admin/dashboard",
    },
    {
      title: "Bu Ayki Taramalar",
      value: totalScansThisMonth,
      icon: IconScan,
      action: "Detayları incele",
      url: "#",
    },
    {
      title: "Toplam Kayıtlı Fatura",
      value: totalInvoices,
      icon: IconFile,
      action: "Faturalara git",
      url: "#",
    },
    // Diğer kartlar buraya eklenebilir
  ]
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <Card key={item.title}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span>{item.title}</span>
              <item.icon className="text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{item.value}</div>
          </CardContent>
          <CardFooter>
            <CardAction>
                <Link
                  href={item.url}
                  className="text-sm font-medium text-primary hover:underline">
                    {item.action}
                </Link>
            </CardAction>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
