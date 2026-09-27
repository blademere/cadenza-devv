"use client";

import { useState } from "react";
import {
  SearchIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";

/* ----------------------------------------
   Mock Data
---------------------------------------- */

const enrollments = [
  {
    id: "ENR-001",
    student: "Maria Santos",
    course: "Piano Beginner",
    instructor: "John Cruz",
    rate: "₱4,000",
    startDate: "Aug 01, 2026",
    status: "Pending Approval",

    package: "2",
    instrument: "Piano",

    payment: {
      status: "Paid",
      amount: "₱4,000",
      method: "GCash",
      date: "Jul 30, 2026",
      reference: "GC-20260730-001",
    },
  },
  {
    id: "ENR-002",
    student: "Juan Dela Cruz",
    course: "Guitar Intermediate",
    instructor: "Mark Reyes",
    rate: "₱4,500",
    startDate: "Aug 05, 2026",
    status: "Pending Approval",

    package: "3",
    instrument: "Guitar",

    payment: {
      status: "Partial",
      amount: "₱2,000",
      method: "Cash",
      date: "Aug 01, 2026",
      reference: "CASH-20260801-002",
    },
  },
];

export default function EnrollmentsPage() {
  const [search, setSearch] = useState("");

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  /* ----------------------------------------
     Search
  ---------------------------------------- */

  const filteredEnrollments = enrollments.filter((enrollment) =>
    `${enrollment.id} ${enrollment.student} ${enrollment.course} ${enrollment.instructor}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  /* ----------------------------------------
     Open Enrollment Details
  ---------------------------------------- */

  const handleViewDetails = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowDetailsDialog(true);
  };

  /* ----------------------------------------
     Approve Enrollment
  ---------------------------------------- */

  const handleApprove = () => {
    console.log("Approved enrollment:", selectedEnrollment);

    setShowDetailsDialog(false);
  };

  /* ----------------------------------------
     Reject Enrollment
  ---------------------------------------- */

  const handleReject = () => {
    console.log("Rejected enrollment:", selectedEnrollment);

    setShowDetailsDialog(false);
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          {/* ----------------------------------------
              Page Header
          ---------------------------------------- */}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Enrollments</h1>

              <p className="text-muted-foreground">
                Manage student course enrollments.
              </p>
            </div>
          </div>

          {/* ----------------------------------------
              Enrollment Card
          ---------------------------------------- */}

          <Card>
            <CardHeader>
              <CardTitle>Enrollment Records</CardTitle>

              <CardDescription>
                Students currently enrolled in music programs.
              </CardDescription>

              {/* Search */}

              <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                <Input
                  className="pl-9"
                  placeholder="Search enrollments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enrollment</TableHead>

                      <TableHead>Student</TableHead>

                      <TableHead>Package</TableHead>

                      <TableHead>Instructor</TableHead>

                      <TableHead className="w-[80px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredEnrollments.length > 0 ? (
                      filteredEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {enrollment.id}
                          </TableCell>

                          <TableCell>{enrollment.student}</TableCell>

                          <TableCell>
                            {enrollment.package} {enrollment.instrument}
                          </TableCell>

                          <TableCell>{enrollment.instructor}</TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="link"
                              onClick={() => handleViewDetails(enrollment)}

                            >
                              See Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No enrollments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>


        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle>Enrollment Details</DialogTitle>

              <DialogDescription>
                Review the enrollment and payment information before approving.
              </DialogDescription>
            </DialogHeader>

            {selectedEnrollment && (
              <div className="space-y-6">

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Enrollment Information
                    </h3>

                    <Badge variant="secondary">
                      {selectedEnrollment.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Enrollment ID
                      </p>

                      <p className="font-medium">{selectedEnrollment.id}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Student</p>

                      <p className="font-medium">
                        {selectedEnrollment.student}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Course</p>

                      <p className="font-medium">{selectedEnrollment.course}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Instructor
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.instructor}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Instrument
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.instrument}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Package</p>

                      <p className="font-medium">
                        {selectedEnrollment.package} sessions
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Start Date
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.startDate}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Enrollment Rate
                      </p>

                      <p className="font-medium">{selectedEnrollment.rate}</p>
                    </div>
                  </div>
                </div>


                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Payment Details</h3>

                    <Badge
                      variant={
                        selectedEnrollment.payment.status === "Paid"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedEnrollment.payment.status}
                    </Badge>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Amount */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Amount Paid
                        </p>

                        <p className="text-lg font-semibold">
                          {selectedEnrollment.payment.amount}
                        </p>
                      </div>

                      {/* Payment Method */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment Method
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.payment.method}
                        </p>
                      </div>

                      {/* Payment Date */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment Date
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.payment.date}
                        </p>
                      </div>

                      {/* Reference */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reference Number
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.payment.reference}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedEnrollment.payment.status !== "Paid" && (
                    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                      <p className="text-sm font-medium">
                        Payment verification required
                      </p>

                      <p className="text-xs text-muted-foreground">
                        This enrollment has not been fully paid. Verify the
                        payment before approving the enrollment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleReject}>
                <XCircleIcon className="mr-2 h-4 w-4" />
                Reject
              </Button>

              <Button
                onClick={handleApprove}
                disabled={selectedEnrollment?.payment.status !== "Paid"}
              >
                <CheckCircle2Icon className="mr-2 h-4 w-4" />
                Approve Enrollment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
