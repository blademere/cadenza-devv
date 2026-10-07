"use client";

import { useEffect, useState } from "react";
import {
  SearchIcon,
  Loader2Icon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { Badge } from "@/components/ui/Badge";
import { enrollmentService } from "@/services/front-desk/enrollmentService";

const formatEnrollmentReference = (id) =>
  id ? `ENR-${id.slice(0, 8).toUpperCase()}` : "—";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await enrollmentService.getEnrollments();
        setEnrollments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load enrollments.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadEnrollments();
  }, []);

  /* ----------------------------------------
     Search
  ---------------------------------------- */

  const filteredEnrollments = enrollments.filter((enrollment) =>
    `${enrollment.id} ${enrollment.student || ""} ${
      enrollment.packageName || ""
    } ${enrollment.lessons?.map((lesson) => lesson.name).join(" ") || ""} ${
      enrollment.sessions?.map((session) => session.instructorName).join(" ") ||
      ""
    }`
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

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Enrollments</h1>

              <p className="text-muted-foreground">
                Manage student course enrollments.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment Records</CardTitle>

              <CardDescription>
                Students currently enrolled in music programs.
              </CardDescription>

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
              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enrollment</TableHead>

                      <TableHead>Student</TableHead>

                      <TableHead>Package</TableHead>

                      <TableHead>Instructor</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2Icon className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredEnrollments.length > 0 ? (
                      filteredEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {formatEnrollmentReference(enrollment.id)}
                          </TableCell>

                          <TableCell>{enrollment.student}</TableCell>

                          <TableCell>
                            {enrollment.packageName || "—"}
                          </TableCell>

                          <TableCell>
                            {enrollment.sessions?.[0]?.instructorName || "—"}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                enrollment.status === "ACTIVE"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {enrollment.status || "—"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="link"
                              onClick={() => handleViewDetails(enrollment)}
                              className="h-auto p-0"
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
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


        <Dialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        >
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle>Enrollment Details</DialogTitle>

              <DialogDescription>
                Review the student, package, schedule, and payment information.
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

                      <p className="font-medium">                      {selectedEnrollment.lessons?.map((lesson) => lesson.name).join(", ") ||
                        "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Instructor
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.sessions?.[0]?.instructorName || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Instrument
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.packageName || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Package</p>

                      <p className="font-medium">
                        {selectedEnrollment.numberOfSessions} sessions
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Start Date
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.sessions?.[0]?.scheduledStart
                          ? new Date(
                              selectedEnrollment.sessions[0].scheduledStart,
                            ).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Enrollment Rate
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.price != null
                          ? `₱${Number(selectedEnrollment.price).toLocaleString()}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Payment Details</h3>

                    <Badge variant="secondary">Backend record</Badge>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Amount */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Amount Paid
                        </p>

                        <p className="text-lg font-semibold">
                          Payment details are managed through the payment
                          obligation record.
                        </p>
                      </div>

                      {/* Payment Method */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment Method
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.paymentObligationId || "—"}
                        </p>
                      </div>

                      {/* Payment Date */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment Date
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.paymentExpiresAt
                            ? new Date(
                                selectedEnrollment.paymentExpiresAt,
                              ).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>

                      {/* Reference */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reference Number
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedEnrollment.status !== "COMPLETED" && (
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
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
