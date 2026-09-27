"use client";

import {
  SearchIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const instructors = [
  {
    id: 1,
    name: "John Cruz",
    email: "john@cadenzamusic.com",
    specialization: "Piano",
    students: 18,
    status: "Active",
  },
  {
    id: 2,
    name: "Anna Lee",
    email: "anna@cadenzamusic.com",
    specialization: "Violin",
    students: 12,
    status: "Active",
  },
  {
    id: 3,
    name: "Mark Reyes",
    email: "mark@cadenzamusic.com",
    specialization: "Guitar",
    students: 15,
    status: "Active",
  },
];

export default function InstructorsPage() {
  const [search, setSearch] = useState("");

  const [showInstructorDetailsDialog, setShowInstructorDetailsDialog] =
    useState(false);

  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const [selectedInstructor, setSelectedInstructor] = useState(null);

  const handleInstructorDetails = (instructor) => {
    setSelectedInstructor(instructor);
    setShowInstructorDetailsDialog(true);
  };

  const handleDeactivate = (instructor) => {
    setSelectedInstructor(instructor);
    setShowDeactivateDialog(true);
  };

  const handleConfirmDeactivate = () => {
    if (!selectedInstructor) return;

    console.log("Deactivate Instructor:", selectedInstructor.id);

    setShowDeactivateDialog(false);
    setSelectedInstructor(null);
  };

  const filtered = instructors.filter((instructor) =>
    `${instructor.name} ${instructor.specialization}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Instructors</h1>

              <p className="text-muted-foreground">
                Manage music instructors and their assigned students.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Instructor List</CardTitle>

              <CardDescription>
                All instructors currently registered in the system.
              </CardDescription>

              <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                <Input
                  className="pl-9"
                  placeholder="Search instructors..."
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((instructor) => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-medium">
                          {instructor.name}
                        </TableCell>

                        <TableCell>{instructor.email}</TableCell>

                        <TableCell>{instructor.specialization}</TableCell>

                        <TableCell>{instructor.students}</TableCell>

                        <TableCell>
                          <Badge>{instructor.status}</Badge>
                        </TableCell>

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontalIcon className="size-4" />

                                <span className="sr-only">
                                  Instructor options
                                </span>
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              sideOffset={4}
                              className="w-[160px] p-1"
                            >
                              <DropdownMenuItem
                                className="h-10 cursor-pointer gap-3 px-3"
                                onClick={() =>
                                  handleInstructorDetails(instructor)
                                }
                              >
                                <UserIcon className="size-4" />

                                <span>Instructor Details</span>
                              </DropdownMenuItem>

                              {instructor.status === "Active" && (
                                <>
                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="h-10 cursor-pointer gap-3 px-3 text-destructive focus:text-destructive"
                                    onClick={() =>
                                      handleDeactivate(instructor)
                                    }
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Instructor Details Dialog */}
        <Dialog
          open={showInstructorDetailsDialog}
          onOpenChange={setShowInstructorDetailsDialog}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Instructor Details</DialogTitle>

              <DialogDescription>
                View the instructor's account and teaching information.
              </DialogDescription>
            </DialogHeader>

            {selectedInstructor && (
              <div className="grid gap-5 py-4">
                {/* Instructor Header */}
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserIcon className="size-6 text-muted-foreground" />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {selectedInstructor.name}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      {selectedInstructor.email}
                    </p>
                  </div>
                </div>

                {/* Instructor Information */}
                <div className="rounded-lg border">
                  <div className="grid grid-cols-2 divide-x">
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Specialization
                      </p>

                      <p className="mt-1 font-medium">
                        {selectedInstructor.specialization}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Status
                      </p>

                      <div className="mt-1">
                        <Badge>{selectedInstructor.status}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 divide-x border-t">
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Assigned Students
                      </p>

                      <p className="mt-1 font-medium">
                        {selectedInstructor.students}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Instructor ID
                      </p>

                      <p className="mt-1 font-medium">
                        INS-
                        {String(selectedInstructor.id).padStart(4, "0")}
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
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>

                      <span className="text-sm font-medium">
                        {selectedInstructor.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Account Status
                      </span>

                      <Badge>{selectedInstructor.status}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowInstructorDetailsDialog(false);
                  setSelectedInstructor(null);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Dialog */}
        <Dialog
          open={showDeactivateDialog}
          onOpenChange={setShowDeactivateDialog}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Deactivate Instructor</DialogTitle>

              <DialogDescription>
                Are you sure you want to deactivate this instructor?
              </DialogDescription>
            </DialogHeader>

            {selectedInstructor && (
              <div className="rounded-lg border p-4">
                <p className="font-medium">
                  {selectedInstructor.name}
                </p>

                <p className="text-sm text-muted-foreground">
                  {selectedInstructor.email}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeactivateDialog(false);
                  setSelectedInstructor(null);
                }}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleConfirmDeactivate}
              >
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
