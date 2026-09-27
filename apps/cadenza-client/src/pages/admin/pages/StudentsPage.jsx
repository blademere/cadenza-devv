"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  MoreHorizontalIcon,
  SearchIcon,
  Trash2Icon,
  UserIcon,
  UserRoundIcon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const students = [
  {
    id: 1,
    name: "Maria Santos",
    email: "[maria@example.com](mailto:maria@example.com)",
    phone: "09171234567",
    instrument: "Piano",
    instructor: "John Cruz",
    status: "Active",
    guardian: "Luis Santos",
  },
  {
    id: 2,
    name: "Juan Dela Cruz",
    email: "[juan@example.com](mailto:juan@example.com)",
    phone: "09181234567",
    instrument: "Guitar",
    instructor: "Mark Reyes",
    status: "Active",
    guardian: "Ana Dela Cruz",
  },
  {
    id: 3,
    name: "Sofia Garcia",
    email: "[sofia@example.com](mailto:sofia@example.com)",
    phone: "09191234567",
    instrument: "Violin",
    instructor: "Anna Lee",
    status: "Inactive",
    guardian: "Carlos Garcia",
  },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showStudentDetailsDialog, setShowStudentDetails] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.email} ${student.instrument}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const handleStudentDetails = (student) => {
    setSelectedStudent(student);
    setShowStudentDetails(true);
  };

  const handleDeactivate = (student) => {
    setSelectedStudent(student);
    setShowDeactivateDialog(true);
  };

  const handleConfirmDeactivate = () => {
    if (!selectedStudent) return;
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      {" "}
      <AppSidebar variant="inset" />
      ```
      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Students
              </h1>

              <p className="text-muted-foreground">
                Manage students registered at Cadenza Music Center.
              </p>
            </div>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle>Student List</CardTitle>

              <CardDescription>
                View and manage all registered students.
              </CardDescription>

              {/* Search */}
              <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                <Input
                  placeholder="Search students..."
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-sm text-muted-foreground">
                            No students found.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          {/* Student */}
                          <TableCell>
                            <div>
                              <div className="font-medium">{student.name}</div>

                              <div className="text-sm text-muted-foreground">
                                {student.email}
                              </div>
                            </div>
                          </TableCell>

                          {/* Instrument */}
                          <TableCell>{student.instrument}</TableCell>

                          {/* Instructor */}
                          <TableCell>{student.instructor}</TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              variant={
                                student.status === "Active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {student.status}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontalIcon className="size-4" />

                                  <span className="sr-only">
                                    Student options
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                sideOffset={4}
                                className="w-[160px] p-1"
                              >
                                {/* Student Details */}
                                <DropdownMenuItem
                                  className="h-10 cursor-pointer gap-3 px-3"
                                  onClick={() => handleStudentDetails(student)}
                                >
                                  <UserIcon className="size-4" />

                                  <span>Student Details</span>
                                </DropdownMenuItem>

                                {/* Deactivate */}
                                {student.status === "Active" && (
                                  <>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      className="h-10 cursor-pointer gap-3 px-3 text-destructive focus:text-destructive"
                                      onClick={() => handleDeactivate(student)}
                                    >
                                      <Trash2Icon className="size-4" />

                                      <span>Deactivate</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
      <Dialog
        open={showStudentDetailsDialog}
        onOpenChange={setShowStudentDetails}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>

            <DialogDescription>
              View the student's account and enrollment information.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="grid gap-5 py-4">
              {/* Student Profile */}
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserRoundIcon className="size-6 text-muted-foreground" />
                </div>

                <div>
                  <h3 className="font-semibold">{selectedStudent.name}</h3>
                </div>
              </div>

              {/* Student Information */}
              <div className="rounded-lg border">
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">Phone</p>

                    <p className="mt-1 font-medium">{selectedStudent.phone}</p>
                  </div>

                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">Guardian</p>

                    <div className="mt-1">{selectedStudent.guardian}</div>
                  </div>
                </div>

                {/* Instrument / Instructor */}
                <div className="grid grid-cols-2 divide-x border-t">
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">Instrument</p>

                    <p className="mt-1 font-medium">
                      {selectedStudent.instrument}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">Instructor</p>

                    <p className="mt-1 font-medium">
                      {selectedStudent.instructor}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h4 className="mb-3 text-sm font-medium">
                  Account Information
                </h4>

                <div className="rounded-lg border">
                  {/* Student ID */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      Student ID
                    </span>

                    <span className="text-sm font-medium">
                      STU-
                      {String(selectedStudent.id).padStart(4, "0")}
                    </span>
                  </div>

                  {/* Account Status */}
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      Account Status
                    </span>

                    <Badge
                      variant={
                        selectedStudent.status === "Active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedStudent.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStudentDetails(false);
                setSelectedStudent(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* =========================================================
      DEACTIVATE CONFIRMATION DIALOG
      ========================================================= */}
      <Dialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangleIcon className="size-5 text-destructive" />
              </div>

              <div>
                <DialogTitle>Deactivate Student</DialogTitle>

                <DialogDescription className="mt-1">
                  This will deactivate the student's account.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedStudent && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <UserRoundIcon className="size-4 text-muted-foreground" />
                </div>

                <div>
                  <p className="font-medium">{selectedStudent.name}</p>

                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm leading-6 text-muted-foreground">
            Are you sure you want to deactivate this student? The student will
            no longer be considered active.
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeactivateDialog(false);
                setSelectedStudent(null);
              }}
            >
              Cancel
            </Button>

            <Button variant="destructive" onClick={handleConfirmDeactivate}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
