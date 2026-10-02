"use client";

import {
  UsersIcon,
  CreditCardIcon,
  GraduationCapIcon,
  CalendarDaysIcon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

const reports = [
  {
    title: "Student Report",
    description: "View student registrations and enrollment status.",
    icon: GraduationCapIcon,
  },
  {
    title: "Enrollment Report",
    description: "Analyze course enrollments and active students.",
    icon: UsersIcon,
  },
  {
    title: "Payment Report",
    description: "Review tuition payments and revenue.",
    icon: CreditCardIcon,
  },
  {
    title: "Schedule Report",
    description: "Review classes, rooms, and instructor schedules.",
    icon: CalendarDaysIcon,
  },
];

export default function ReportsPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Reports</h1>

            <p className="text-muted-foreground">
              Generate and review Cadenza Music Center reports.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((report) => {
              const Icon = report.icon;

              return (
                <Card key={report.title}>
                  <CardHeader>
                    <Icon className="size-6 text-muted-foreground" />

                    <CardTitle>{report.title}</CardTitle>

                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <Button variant="outline">View Report</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
