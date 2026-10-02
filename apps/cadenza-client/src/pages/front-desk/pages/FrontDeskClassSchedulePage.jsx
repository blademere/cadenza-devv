"use client";

import { ClockIcon, DoorOpenIcon } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schedule = [
  {
    id: 1,
    start: "9:00 AM",
    end: "10:00 AM",
    course: "Piano Beginner",
    student: "Maria Santos",
    instructor: "John Cruz",
    room: "Room 101",
    status: "Scheduled",
  },
  {
    id: 2,
    start: "10:00 AM",
    end: "11:00 AM",
    course: "Guitar Intermediate",
    student: "Juan Dela Cruz",
    instructor: "Mark Reyes",
    room: "Room 102",
    status: "Scheduled",
  },
  {
    id: 3,
    start: "11:00 AM",
    end: "12:00 PM",
    course: "Violin Beginner",
    student: "Sofia Garcia",
    instructor: "Anna Lee",
    room: "Room 103",
    status: "Scheduled",
  },
  {
    id: 4,
    start: "1:00 PM",
    end: "2:00 PM",
    course: "Guitar Beginner",
    student: "Daniel Cruz",
    instructor: "Mark Reyes",
    room: "Room 101",
    status: "Scheduled",
  },
  {
    id: 5,
    start: "2:00 PM",
    end: "3:00 PM",
    course: "Piano Intermediate",
    student: "Angela Reyes",
    instructor: "John Cruz",
    room: "Room 102",
    status: "Scheduled",
  },
];

export default function ClassSchedulePage() {
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Class Schedule
              </h1>

              <p className="text-muted-foreground">
                View class schedules and room availability for the day.
              </p>
            </div>
          </div>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Classes</CardTitle>

              <CardDescription>
                Each class is scheduled for 1 hour.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-3 lg:w-44">
                      <div className="rounded-md bg-muted p-2">
                        <ClockIcon className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="font-semibold">{item.start}</p>

                        <p className="text-sm text-muted-foreground">
                          {item.end}
                        </p>
                      </div>
                    </div>

                    {/* Course */}
                    <div className="lg:w-52">
                      <p className="font-medium">{item.course}</p>

                      <p className="text-sm text-muted-foreground">
                        {item.student}
                      </p>
                    </div>

                    {/* Instructor */}
                    <div className="lg:w-40">
                      <p className="text-sm text-muted-foreground">
                        Instructor
                      </p>

                      <p className="text-sm font-medium">{item.instructor}</p>
                    </div>

                    {/* Room */}
                    <div className="flex items-center gap-2 lg:w-32">
                      <DoorOpenIcon className="h-4 w-4 text-muted-foreground" />

                      <span className="text-sm font-medium">{item.room}</span>
                    </div>

                    {/* Status */}
                    <Badge className="w-fit">{item.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Room Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Room Schedule</CardTitle>

              <CardDescription>
                Scheduled rooms.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-4 border-b bg-muted/50 p-3 text-sm font-medium">
                  <span>Time</span>
                  <span>Room 101</span>
                  <span>Room 102</span>
                  <span>Room 103</span>
                </div>

                <div className="divide-y">
                  {[
                    "9:00 AM - 10:00 AM",
                    "10:00 AM - 11:00 AM",
                    "11:00 AM - 12:00 PM",
                    "12:00 PM - 1:00 PM",
                    "1:00 PM - 2:00 PM",
                    "2:00 PM - 3:00 PM",
                  ].map((time) => {
                    const room101 = schedule.find(
                      (item) =>
                        `${item.start} - ${item.end}` === time &&
                        item.room === "Room 101",
                    );

                    const room102 = schedule.find(
                      (item) =>
                        `${item.start} - ${item.end}` === time &&
                        item.room === "Room 102",
                    );

                    const room103 = schedule.find(
                      (item) =>
                        `${item.start} - ${item.end}` === time &&
                        item.room === "Room 103",
                    );

                    return (
                      <div key={time} className="grid grid-cols-4 p-3 text-sm">
                        <span className="text-muted-foreground">{time}</span>

                        <span>
                          {room101 ? (
                            <Badge variant="secondary">{room101.course}</Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Available
                            </span>
                          )}
                        </span>

                        <span>
                          {room102 ? (
                            <Badge variant="secondary">{room102.course}</Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Available
                            </span>
                          )}
                        </span>

                        <span>
                          {room103 ? (
                            <Badge variant="secondary">{room103.course}</Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Available
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
