"use client";

import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

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

const attendance = [
  {
    student: "Maria Santos",
    course: "Piano Beginner",
    instructor: "John Cruz",
    date: "Aug 31, 2026",
    status: "Present",
  },
  {
    student: "Juan Dela Cruz",
    course: "Guitar Intermediate",
    instructor: "Mark Reyes",
    date: "Aug 31, 2026",
    status: "Present",
  },
  {
    student: "Sofia Garcia",
    course: "Violin Beginner",
    instructor: "Anna Lee",
    date: "Aug 31, 2026",
    status: "Absent",
  },
];

export default function AttendancePage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Attendance</h1>

            <p className="text-muted-foreground">
              Monitor student attendance and class participation.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>

              <CardDescription>Recent attendance records.</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {attendance.map((record, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{record.student}</p>

                      <p className="text-sm text-muted-foreground">
                        {record.course} · {record.instructor}
                      </p>
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {record.date}
                    </span>

                    <Badge
                      variant={
                        record.status === "Present" ? "default" : "destructive"
                      }
                    >
                      {record.status === "Present" ? (
                        <CheckCircle2Icon />
                      ) : (
                        <XCircleIcon />
                      )}

                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
