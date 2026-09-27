"use client";

import {
  BookOpenIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  DoorOpenIcon,
  FileChartColumnIcon,
  GraduationCapIcon,
  GuitarIcon,
  HelpCircleIcon,
  MusicIcon,
  UsersIcon,
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

const helpSections = [
  {
    title: "Students",
    description:
      "Manage student records, enrollment information, and student details.",
    icon: GraduationCapIcon,
  },
  {
    title: "Instructors",
    description:
      "Manage instructors and view the teachers available for classes.",
    icon: UsersIcon,
  },
  {
    title: "Courses",
    description:
      "Manage instruments and levels offered by the music center. Course materials can also be uploaded for students and instructors.",
    icon: MusicIcon,
  },
  {
    title: "Enrollments",
    description:
      "Register students into enrollment packages and keep track of their active enrollment.",
    icon: BookOpenIcon,
  },
  {
    title: "Class Schedule",
    description:
      "Schedule lessons by date, time, instructor, student, and room. Use the schedule to prevent room conflicts.",
    icon: CalendarDaysIcon,
  },
  {
    title: "Rooms",
    description: "Add and manage the rooms available at the music center.",
    icon: DoorOpenIcon,
  },
  {
    title: "Room Rentals",
    description: "Set the rental price and time period for rooms.",
    icon: DoorOpenIcon,
  },
  {
    title: "Instruments",
    description: "Manage the instruments available for the music center.",
    icon: GuitarIcon,
  },
  {
    title: "Instrument Rentals",
    description:
      "Set rental prices and rental periods for instruments. Rental periods can be configured using hours or days.",
    icon: GuitarIcon,
  },
  {
    title: "Payments",
    description: "Record and monitor payments made by students and customers.",
    icon: CreditCardIcon,
  },
  {
    title: "Reports",
    description:
      "View summaries and reports related to students, enrollments, payments, rentals, and operations.",
    icon: FileChartColumnIcon,
  },
];

export default function HelpPage() {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Help & Guide
            </h1>

            <p className="text-muted-foreground">
              Learn how to use the Cadenza Music Center management system.
            </p>
          </div>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <HelpCircleIcon className="size-5 text-primary" />
                </div>

                <div>
                  <CardTitle>Getting Started</CardTitle>

                  <CardDescription>
                    A quick overview of the system.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="font-medium">1. Set Up Resources</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your rooms and instruments before creating schedules or
                    rentals.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="font-medium">2. Configure Rates</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Set enrollment package prices, room rental rates, and
                    instrument rental rates.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="font-medium">3. Manage Students</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Register students, enroll them in packages, and schedule
                    their lessons.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modules */}
          <Card>
            <CardHeader>
              <CardTitle>System Modules</CardTitle>

              <CardDescription>
                Learn what each section of the system is used for.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {helpSections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <div
                      key={section.title}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-md bg-muted p-2">
                          <Icon className="size-4" />
                        </div>

                        <h3 className="font-medium">{section.title}</h3>
                      </div>

                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Important Notes</CardTitle>

              <CardDescription>
                Things to remember when managing the center.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Class Schedule</p>

                  <p className="mt-1 text-muted-foreground">
                    Check room availability before scheduling a class. A room
                    should not be assigned to two classes at the same time.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="font-medium">Enrollment Packages</p>

                  <p className="mt-1 text-muted-foreground">
                    Enrollment rates determine the package price, number of
                    sessions, session duration, and weekly frequency available
                    to students.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="font-medium">Rental Rates</p>

                  <p className="mt-1 text-muted-foreground">
                    Room and instrument rental rates should clearly specify the
                    price and the time period covered by that price.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Need assistance?</p>

                <p className="text-sm text-muted-foreground">
                  Contact the system administrator if you encounter a problem or
                  need help with the system.
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                Cadenza Music Center
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
