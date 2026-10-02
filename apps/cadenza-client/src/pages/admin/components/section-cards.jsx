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
  UsersIcon,
  UserRoundIcon,
  PhilippinePesoIcon,
  TrendingUpIcon,
} from "lucide-react"

const cards = [
  {
    title: "Active Students",
    value: "248",
    change: "+8.2%",
    description: "Compared to last month",
    footer: "Student enrollment is growing",
    icon: GraduationCapIcon,
  },
  {
    title: "Instructors",
    value: "18",
    change: "+2",
    description: "New instructors this month",
    footer: "Teaching team is growing",
    icon: UsersIcon,
  },
  {
    title: "Front Desk Staff",
    value: "7",
    change: "Active",
    description: "Currently active staff",
    footer: "All staff accounts are operational",
    icon: UserRoundIcon,
  },
  {
    title: "Monthly Revenue",
    value: "₱185,400",
    change: "+12.5%",
    description: "Compared to last month",
    footer: "Revenue is trending upward",
    icon: PhilippinePesoIcon,
  },
]

export function SectionCards() {
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
