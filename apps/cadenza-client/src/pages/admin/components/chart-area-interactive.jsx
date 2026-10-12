"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const tabs = [
  { value: "bookings", label: "Total Bookings" },
  { value: "rentals", label: "Rentals" },
  { value: "enrollments", label: "Enrollments" },
]

export function ChartAreaInteractive({ data = [], loading = false }) {
  const [activeTab, setActiveTab] = React.useState("bookings")
  const tab = tabs.find((item) => item.value === activeTab) || tabs[0]
  const chartConfig = {
    activity: { label: tab.label, color: "var(--primary)" },
    successfulPayments: { label: "Successful payment", color: "var(--chart-2)" },
    transactions: { label: "Successful transactions", color: "var(--chart-3)" },
  }
  const chartData = data.map((item) => ({ ...item, activity: item[activeTab] || 0 }))

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{tab.label}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Successful payments and transactions for the last 3 months</span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[activeTab]}
            onValueChange={(value) => setActiveTab(value[0] ?? "bookings")}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {tabs.map((item) => <ToggleGroupItem key={item.value} value={item.value}>{item.label}</ToggleGroupItem>)}
          </ToggleGroup>
          <Select value={activeTab} onValueChange={(value) => value && setActiveTab(value)}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm" aria-label="Select dashboard metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {tabs.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">Loading activity...</div> : !chartData.length ? <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">No booking, rental, enrollment, or successful payment activity found.</div> : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-activity)" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="var(--color-activity)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <YAxis allowDecimals={false} width={36} tickLine={false} axisLine={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} indicator="dot" />} />
              <Legend />
              <Area dataKey="activity" name={tab.label} type="natural" fill="url(#fillActivity)" stroke="var(--color-activity)" strokeWidth={2} fillOpacity={0.45} />
              <Area dataKey="successfulPayments" name="Successful payment" type="natural" fill="none" stroke="var(--color-successfulPayments)" strokeWidth={2} />
              <Area dataKey="transactions" name="Successful transactions" type="natural" fill="none" stroke="var(--color-transactions)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
