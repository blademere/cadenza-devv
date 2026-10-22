"use client";

import {
  SearchIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  UserIcon,
  Loader2Icon,
  RefreshCwIcon,
  AlertCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
} from "@/components/ui/Dialog";

import {
  getInstructors,
  deactivateInstructor,
} from "@/services/admin/instructorService";

function normalizeInstructor(instructor) {
  const person = instructor?.person ?? {};
  const user = person?.user ?? {};

  const firstName = person.firstName ?? "";
  const lastName = person.lastName ?? "";

  const name =
    [firstName, lastName].filter(Boolean).join(" ") ||
    instructor?.name ||
    "Unnamed Instructor";

  const courseMappings = Array.isArray(instructor?.courseMappings)
    ? instructor.courseMappings
    : [];

  const courses = courseMappings
    .filter((mapping) => {
      if (mapping?.isActive === false) return false;
      if (mapping?.status && mapping.status !== "ACTIVE") return false;

      return Boolean(mapping?.course?.name);
    })
    .map((mapping) => ({
      id: mapping.course.id,
      name: mapping.course.name,
    }))
    .filter(
      (course, index, list) =>
        list.findIndex((item) => item.id === course.id) === index,
    );

  const status = String(instructor?.status ?? "INACTIVE").toUpperCase();

  return {
    id: instructor?.id,
    name,
    email: user.email ?? person.email ?? instructor?.email ?? "—",
    courses,
    students: Array.isArray(instructor?.students)
      ? instructor.students.length
      : typeof instructor?.studentCount === "number"
        ? instructor.studentCount
        : 0,
    assignedStudents: Array.isArray(instructor?.students)
      ? instructor.students
      : [],
    status,
  };
}

function formatStatus(status) {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status || "Unknown";
  }
}

function getStatusBadgeVariant(status) {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "default";
    case "INACTIVE":
    case "SUSPENDED":
      return "destructive";
    default:
      return "secondary";
  }
}

/* Internal instructor UUIDs are intentionally not shown in the admin dialog. */
function formatInstructorId(id) {
  const value = String(id ?? "");

  if (!value) return "—";

  if (/^\d+$/.test(value)) {
    return `INS-${value.padStart(4, "0")}`;
  }

  return `INS-${value}`;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export default function InstructorsPage() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState(null);

  const [showInstructorDetailsDialog, setShowInstructorDetailsDialog] =
    useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadInstructors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getInstructors();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid instructor list.");
      }

      setInstructors(data.map(normalizeInstructor));
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Failed to load instructors. Please try again.",
      );

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstructors();
  }, [loadInstructors]);

  const filteredInstructors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query && courseFilter === "all") return instructors;

    return instructors.filter((instructor) => {
      const matchesCourse =
        courseFilter === "all" ||
        instructor.courses.some((course) => course.name === courseFilter);
      const searchableText = [
        instructor.name,
        instructor.email,
        ...instructor.courses.map((course) => course.name),
        formatStatus(instructor.status),
        instructor.id,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCourse && searchableText.includes(query);
    });
  }, [courseFilter, instructors, search]);

  const courseOptions = useMemo(() => instructors
    .flatMap((instructor) => instructor.courses)
    .filter((course, index, list) => list.findIndex((item) => item.id === course.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name)), [instructors]);

  const handleInstructorDetails = (instructor) => {
    setSelectedInstructor(instructor);
    setShowInstructorDetailsDialog(true);
  };

  const handleDeactivate = (instructor) => {
    setSelectedInstructor(instructor);
    setActionError("");
    setShowDeactivateDialog(true);
  };

  const closeDeactivateDialog = () => {
    if (deactivating) return;

    setShowDeactivateDialog(false);
    setSelectedInstructor(null);
    setActionError("");
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedInstructor?.id || deactivating) return;

    setDeactivating(true);
    setActionError("");

    try {
      await deactivateInstructor(selectedInstructor.id);

      setInstructors((currentInstructors) =>
        currentInstructors.map((instructor) =>
          instructor.id === selectedInstructor.id
            ? { ...instructor, status: "INACTIVE" }
            : instructor,
        ),
      );

      setSelectedInstructor((current) =>
        current?.id === selectedInstructor.id
          ? { ...current, status: "INACTIVE" }
          : current,
      );

      toast.success("Instructor deactivated successfully.");

      setShowDeactivateDialog(false);
      setSelectedInstructor(null);
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Failed to deactivate the instructor. Please try again.",
      );

      setActionError(message);
      toast.error(message);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Instructors</h1>

              <p className="text-muted-foreground">
                Manage music instructors and their assigned courses.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={loadInstructors}
              disabled={loading}
            >
              {loading ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="mr-2 size-4" />
              )}
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Instructor List</CardTitle>

              <CardDescription>
                All instructors currently registered in the system.
              </CardDescription>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-sm">
                  <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name, email, or course..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filter by course">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courseOptions.map((course) => (
                      <SelectItem key={course.id} value={course.name}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"
                >
                  <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />

                  <div className="flex-1">{error}</div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadInstructors}
                    disabled={loading}
                  >
                    Retry
                  </Button>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2Icon className="size-4 animate-spin" />
                            Loading instructors...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredInstructors.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-muted-foreground"
                        >
                          {error
                            ? "Unable to display instructors."
                            : search.trim()
                              ? "No instructors match your search."
                              : "No instructors found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInstructors.map((instructor) => (
                        <TableRow key={instructor.id}>
                          <TableCell className="font-medium">
                            {instructor.name}
                          </TableCell>

                          <TableCell>{instructor.email}</TableCell>

                          <TableCell>
                            {(courseFilter === "all"
                              ? instructor.courses
                              : instructor.courses.filter(
                                  (course) => course.name === courseFilter,
                                )
                            ).length > 0
                              ? (courseFilter === "all"
                                  ? instructor.courses
                                  : instructor.courses.filter(
                                      (course) => course.name === courseFilter,
                                    )
                                )
                                  .map((course) => course.name)
                                  .join(", ")
                              : "No courses assigned"}
                          </TableCell>

                          <TableCell>
                            {instructor.students ?? "—"}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(
                                instructor.status,
                              )}
                            >
                              {formatStatus(instructor.status)}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Options for ${instructor.name}`}
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                  <span className="sr-only">
                                    Instructor options
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                sideOffset={4}
                                className="w-[180px] p-1"
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

                                {instructor.status === "ACTIVE" && (
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {loading
                  ? "Loading records..."
                  : `${filteredInstructors.length} instructor${
                      filteredInstructors.length === 1 ? "" : "s"
                    } found`}
              </p>
            </CardContent>
          </Card>
        </main>

        <Dialog
          open={showInstructorDetailsDialog}
          onOpenChange={(open) => {
            setShowInstructorDetailsDialog(open);

            if (!open) {
              setSelectedInstructor(null);
            }
          }}
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
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserIcon className="size-6 text-muted-foreground" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      {selectedInstructor.name}
                    </h3>

                    <p className="break-all text-sm text-muted-foreground">
                      {selectedInstructor.email}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="grid grid-cols-2 divide-x">
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">Courses</p>

                      <p className="mt-1 break-words font-medium">
                        {selectedInstructor.courses.length > 0
                          ? selectedInstructor.courses
                              .map((course) => course.name)
                              .join(", ")
                          : "No courses assigned"}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">Status</p>

                      <div className="mt-1">
                        <Badge
                          variant={getStatusBadgeVariant(
                            selectedInstructor.status,
                          )}
                        >
                          {formatStatus(selectedInstructor.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 divide-x border-t">
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Assigned Students
                      </p>

                      <p className="mt-1 font-medium">
                        {selectedInstructor.students ?? "Not available"}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Assigned Students
                      </p>

                      <p className="mt-1 break-words font-medium">
                        {selectedInstructor.assignedStudents?.length > 0
                          ? selectedInstructor.assignedStudents
                              .map((student) => student.name)
                              .join(", ")
                          : "No assigned students"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-medium">
                    Account Information
                  </h4>

                  <div className="rounded-lg border">
                    <div className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>

                      <span className="break-all text-right text-sm font-medium">
                        {selectedInstructor.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Account Status
                      </span>

                      <Badge
                        variant={getStatusBadgeVariant(
                          selectedInstructor.status,
                        )}
                      >
                        {formatStatus(selectedInstructor.status)}
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
                  setShowInstructorDetailsDialog(false);
                  setSelectedInstructor(null);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showDeactivateDialog}
          onOpenChange={(open) => {
            if (!open) {
              closeDeactivateDialog();
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Deactivate Instructor</DialogTitle>

              <DialogDescription>
                This will change the instructor's status to inactive. Are you
                sure you want to continue?
              </DialogDescription>
            </DialogHeader>

            {selectedInstructor && (
              <div className="rounded-lg border p-4">
                <p className="font-medium">{selectedInstructor.name}</p>

                <p className="break-all text-sm text-muted-foreground">
                  {selectedInstructor.email}
                </p>
              </div>
            )}

            {actionError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"
              >
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                {actionError}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeDeactivateDialog}
                disabled={deactivating}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleConfirmDeactivate}
                disabled={deactivating || !selectedInstructor}
              >
                {deactivating && (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                )}
                {deactivating ? "Deactivating..." : "Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
