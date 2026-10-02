"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  GraduationCapIcon,
  BookIcon,
  TrendingUpIcon,
  Toolbox
} from "lucide-react"

const cards = [
  {
    title: "Current Students",
    value: "248",
    change: "+8.2%",
    footer: "Today's student schedule",
    icon: GraduationCapIcon,
  },
  {
    title: "Today's Bookings",
    value: "18",
    change: "+2",
    footer: "Today's class schedule",
    icon: BookIcon,
  },
  {
    title: "Instrument Rentals",
    value: "7",
    change: "Active",
    footer: "Today's rentals",
    icon: Toolbox,
  },

]

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card key={card.title} className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Icon className="size-4" />
                {card.title}
              </CardDescription>

              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>

              <CardAction>
                <Badge variant="outline">
                  <TrendingUpIcon className="size-3" />
                  {card.change}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {card.footer}
              </div>

              <div className="text-muted-foreground">
                {card.description}
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
