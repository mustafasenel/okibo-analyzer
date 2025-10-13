"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  scans: {
    label: "Taramalar",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

interface ChartData {
    date: string;
    scans: number;
}

export function ChartAreaInteractive({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Günlük Tarama Aktivitesi</CardTitle>
        <CardDescription>
          Son 30 gün içinde yapılan toplam tarama sayısı.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillScans" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-scans)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-scans)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("tr-TR", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("tr-TR", {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="scans"
              type="natural"
              fill="url(#fillScans)"
              stroke="var(--color-scans)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
