"use client"

import { Badge } from "@/components/ui/Badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card"
import {
  GraduationCapIcon,
  UsersIcon,
  UserRoundIcon,
  PhilippinePesoIcon,
  TrendingUpIcon,
} from "lucide-react"

const defaultCards = [
  {
    title: "Active Students",
    value: "—",
    change: "Live",
    description: "From current records",
    footer: "Student enrollment",
    icon: GraduationCapIcon,
  },
  {
    title: "Instructors",
    value: "—",
    change: "Live",
    description: "From current records",
    footer: "Teaching team",
    icon: UsersIcon,
  },
  {
    title: "Front Desk Staff",
    value: "—",
    change: "Active",
    description: "Currently active staff",
    footer: "Staff accounts",
    icon: UserRoundIcon,
  },
  {
    title: "Monthly Revenue",
    value: "—",
    change: "Live",
    description: "Successful payments",
    footer: "Payment activity",
    icon: PhilippinePesoIcon,
  },
]

export function SectionCards({ cards = defaultCards, loading = false }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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
                {loading ? "—" : card.value}
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
