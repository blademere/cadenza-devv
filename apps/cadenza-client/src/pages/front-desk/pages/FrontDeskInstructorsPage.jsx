"use client";

import {
  SearchIcon,
  PlusIcon,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
} from "lucide-react";

import { useEffect, useState } from "react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

import { instructorService } from "@/services/front-desk/instructorService";

const dayOptions = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins,
  ).padStart(2, "0")}`;
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const date = new Date();

  date.setHours(hours, mins, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDayName = (dayOfWeek) => {
  return (
    dayOptions.find(
      (day) => day.value === dayOfWeek,
    )?.label || "Unknown"
  );
};

const timeToMinutes = (time) => {
  if (!time) return null;

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const splitFullName = (fullName) => {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);

  const [search, setSearch] = useState("");

  const [selectedInstructor, setSelectedInstructor] =
    useState(null);

  const [showScheduleDialog, setShowScheduleDialog] =
    useState(false);

  const [showAddInstructorDialog, setShowAddInstructorDialog] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [selectedSpecializations, setSelectedSpecializations] =
    useState([]);

  const [instructorName, setInstructorName] =
    useState("");

  const [instructorEmail, setInstructorEmail] =
    useState("");

  const [instructorPassword, setInstructorPassword] =
    useState("");

  const [schedules, setSchedules] = useState([]);

  const [scheduleDay, setScheduleDay] =
    useState("");

  const [scheduleStartTime, setScheduleStartTime] =
    useState("");

  const [scheduleEndTime, setScheduleEndTime] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const loadInstructors = async () => {
    try {
      setLoading(true);
      setError("");

      const [response, courseResponse] = await Promise.all([
        instructorService.getInstructors(),
        instructorService.getCourses(),
      ]);

      setInstructors(response.data || []);
      setCourses(
        (courseResponse.data || []).filter(
          (course) => course.status === "ACTIVE",
        ),
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load instructors.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructors();
  }, []);

  const filtered = instructors.filter(
    (instructor) => {
      const fullName = [
        instructor.person?.firstName,
        instructor.person?.middleName,
        instructor.person?.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      const specialties = (instructor.courseMappings || [])
        .map((mapping) => mapping.course?.name)
        .filter(Boolean)
        .join(" ") || "";

      return `${fullName} ${specialties}`
        .toLowerCase()
        .includes(search.toLowerCase());
    },
  );

  const getInstructorName = (instructor) => {
    const person = instructor.person;

    if (!person) {
      return "Unnamed Instructor";
    }

    return [
      person.firstName,
      person.middleName,
      person.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const getInstructorEmail = (instructor) => {
    return (
      instructor.person?.user?.email ||
      instructor.person?.email ||
      "—"
    );
  };

  const handleViewSchedule = async (
    instructor,
  ) => {
    try {
      setError("");

      const response =
        await instructorService.getInstructor(
          instructor.id,
        );

      setSelectedInstructor(response.data);

      setShowScheduleDialog(true);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load instructor schedule.",
      );
    }
  };

  const handleAddInstructor = () => {
    setError("");
    setSuccess("");
    resetForm();
    setShowAddInstructorDialog(true);
  };

  const toggleSpecialization = (
    specialization,
  ) => {
    setSelectedSpecializations((prev) =>
      prev.includes(specialization)
        ? prev.filter(
            (item) => item !== specialization,
          )
        : [...prev, specialization],
    );
  };

  const addSchedule = () => {
    if (
      !scheduleDay ||
      !scheduleStartTime ||
      !scheduleEndTime
    ) {
      return;
    }

    const startMinute =
      timeToMinutes(scheduleStartTime);

    const endMinute =
      timeToMinutes(scheduleEndTime);

    if (startMinute >= endMinute) {
      setError(
        "Schedule start time must be before the end time.",
      );

      return;
    }

    const exists = schedules.some(
      (schedule) =>
        schedule.dayOfWeek ===
          Number(scheduleDay) &&
        startMinute < schedule.endMinute &&
        endMinute > schedule.startMinute,
    );

    if (exists) {
      setError(
        "This schedule overlaps an existing schedule.",
      );

      return;
    }

    setError("");

    setSchedules((prev) => [
      ...prev,
      {
        id: Date.now(),
        dayOfWeek: Number(scheduleDay),
        startMinute,
        endMinute,
      },
    ]);

    setScheduleDay("");
    setScheduleStartTime("");
    setScheduleEndTime("");
  };

  const removeSchedule = (scheduleId) => {
    setSchedules((prev) =>
      prev.filter(
        (schedule) =>
          schedule.id !== scheduleId,
      ),
    );
  };

  const resetForm = () => {
    setInstructorName("");
    setInstructorEmail("");
    setInstructorPassword("");
    setSelectedSpecializations([]);
    setSchedules([]);
    setScheduleDay("");
    setScheduleStartTime("");
    setScheduleEndTime("");
    setShowPassword(false);
  };

  const handleSubmitInstructor = async () => {
    const trimmedName =
      instructorName.trim();

    const trimmedEmail =
      instructorEmail.trim();

    if (!trimmedName) {
      setError("Instructor name is required.");
      return;
    }

    if (!trimmedEmail) {
      setError("Instructor email is required.");
      return;
    }

    if (!instructorPassword) {
      setError("Instructor password is required.");
      return;
    }

    if (instructorPassword.length < 8) {
      setError(
        "Password must be at least 8 characters.",
      );
      return;
    }

    if (selectedSpecializations.length === 0) {
      setError(
        "Select at least one specialization.",
      );
      return;
    }

    if (schedules.length === 0) {
      setError(
        "Add at least one schedule.",
      );
      return;
    }

    const { firstName, lastName } =
      splitFullName(trimmedName);

    if (!firstName || !lastName) {
      setError(
        "Please enter the instructor's first and last name.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response =
        await instructorService.createInstructorAccount(
          {
            firstName,
            lastName,
            email: trimmedEmail,
            password: instructorPassword,
            courseIds: selectedSpecializations,
          },
        );

      const instructorId =
        response.data?.id;

      if (!instructorId) {
        throw new Error(
          "Instructor was created but no instructor ID was returned.",
        );
      }

      for (const schedule of schedules) {
        await instructorService.addAvailability(
          instructorId,
          {
            dayOfWeek:
              schedule.dayOfWeek,
            startMinute:
              schedule.startMinute,
            endMinute:
              schedule.endMinute,
          },
        );
      }

      setSuccess(
        "Instructor created successfully.",
      );

      resetForm();
      setShowAddInstructorDialog(false);

      await loadInstructors();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create instructor.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAddDialog = () => {
    if (submitting) {
      return;
    }

    setShowAddInstructorDialog(false);
    resetForm();
    setError("");
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                Instructors
              </h1>

              <p className="text-muted-foreground">
                Manage instructors, specialties,
                and availability.
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleAddInstructor}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Instructor
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border px-4 py-3 text-sm">
              {success}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Instructor List
              </CardTitle>

              <CardDescription>
                All instructors currently registered
                in the system.
              </CardDescription>

              <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                <Input
                  className="pl-9"
                  placeholder="Search instructors..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </div>
            </CardHeader>

            <CardContent>
              <div className="w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Instructor
                      </TableHead>

                      <TableHead>
                        Specialization
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead className="text-right">
                        Schedule
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center"
                        >
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filtered.length > 0 ? (
                      filtered.map(
                        (instructor) => (
                          <TableRow
                            key={instructor.id}
                          >
                            <TableCell className="py-4">
                              <div>
                                <p className="font-medium">
                                  {getInstructorName(
                                    instructor,
                                  )}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {getInstructorEmail(
                                    instructor,
                                  )}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              {(instructor.courseMappings || [])
                                .map((mapping) => mapping.course?.name)
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </TableCell>

                            <TableCell className="py-4">
                              <Badge
                                variant={
                                  instructor.status ===
                                  "ACTIVE"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {instructor.status}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-4 text-right">
                              <Button
                                variant="link"
                                className="h-auto p-0"
                                onClick={() =>
                                  handleViewSchedule(
                                    instructor,
                                  )
                                }
                              >
                                View Schedule
                              </Button>
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No instructors found.
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
          open={showAddInstructorDialog}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseAddDialog();
            } else {
              setShowAddInstructorDialog(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                Add Instructor
              </DialogTitle>

              <DialogDescription>
                Create an instructor account and set
                their specialties and availability.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Full Name
                  </label>

                  <Input
                    placeholder="John Cruz"
                    value={instructorName}
                    onChange={(e) =>
                      setInstructorName(
                        e.target.value,
                      )
                    }
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Email
                  </label>

                  <Input
                    type="email"
                    placeholder="instructor@cadenzamusic.com"
                    value={instructorEmail}
                    onChange={(e) =>
                      setInstructorEmail(
                        e.target.value,
                      )
                    }
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Password
                </label>

                <div className="relative">
                  <Input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter password"
                    className="pr-10"
                    value={instructorPassword}
                    onChange={(e) =>
                      setInstructorPassword(
                        e.target.value,
                      )
                    }
                    disabled={submitting}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev,
                      )
                    }
                    disabled={submitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Specialization
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {courses.map((course) => {
                      const isSelected =
                        selectedSpecializations.includes(
                          course.id,
                        );

                      return (
                        <Button
                          key={course.id}
                          type="button"
                          variant={
                            isSelected
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            toggleSpecialization(
                              course.id,
                            )
                          }
                          disabled={submitting}
                        >
                          {course.name}
                        </Button>
                      );
                    })}
                </div>
              </div>

              <div className="grid gap-2">
                <div>
                  <label className="text-sm font-medium">
                    Schedule Availability
                  </label>

                  <p className="text-xs text-muted-foreground">
                    Add available days and time
                    ranges.
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">
                      Day
                    </label>

                    <select
                      value={scheduleDay}
                      onChange={(e) =>
                        setScheduleDay(
                          e.target.value,
                        )
                      }
                      disabled={submitting}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">
                        Day
                      </option>

                      {dayOptions.map(
                        (day) => (
                          <option
                            key={day.value}
                            value={day.value}
                          >
                            {day.label.slice(
                              0,
                              3,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">
                      Start
                    </label>

                    <Input
                      type="time"
                      value={scheduleStartTime}
                      onChange={(e) =>
                        setScheduleStartTime(
                          e.target.value,
                        )
                      }
                      disabled={submitting}
                      className="h-9"
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">
                      End
                    </label>

                    <Input
                      type="time"
                      value={scheduleEndTime}
                      onChange={(e) =>
                        setScheduleEndTime(
                          e.target.value,
                        )
                      }
                      disabled={submitting}
                      className="h-9"
                    />
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9"
                    onClick={addSchedule}
                    disabled={
                      submitting ||
                      !scheduleDay ||
                      !scheduleStartTime ||
                      !scheduleEndTime ||
                      scheduleStartTime >=
                        scheduleEndTime
                    }
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>

                {schedules.length > 0 && (
                  <div className="max-h-[150px] space-y-1.5 overflow-y-auto rounded-md border p-2">
                    {schedules.map(
                      (schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-20 text-sm font-medium">
                              {getDayName(
                                schedule.dayOfWeek,
                              )}
                            </span>

                            <span className="text-sm text-muted-foreground">
                              {formatTime(
                                schedule.startMinute,
                              )}{" "}
                              -{" "}
                              {formatTime(
                                schedule.endMinute,
                              )}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              removeSchedule(
                                schedule.id,
                              )
                            }
                            disabled={submitting}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {schedules.length === 0 && (
                  <p className="text-xs text-destructive">
                    Add at least one schedule.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={
                  handleCloseAddDialog
                }
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                onClick={
                  handleSubmitInstructor
                }
                disabled={
                  submitting ||
                  !instructorName.trim() ||
                  !instructorEmail.trim() ||
                  !instructorPassword ||
                  selectedSpecializations.length ===
                    0 ||
                  schedules.length === 0
                }
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {submitting
                  ? "Creating..."
                  : "Add Instructor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showScheduleDialog}
          onOpenChange={
            setShowScheduleDialog
          }
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                Instructor Schedule
              </DialogTitle>

              <DialogDescription>
                View the instructor's specialties
                and weekly availability.
              </DialogDescription>
            </DialogHeader>

            {selectedInstructor && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Instructor
                  </p>

                  <p className="font-medium">
                    {getInstructorName(
                      selectedInstructor,
                    )}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">
                    Specialties
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ...(selectedInstructor.courseMappings || []).map(
                        (mapping) => ({
                          id: mapping.courseId,
                          name: mapping.course?.name,
                        }),
                      ),
                    ].map(
                        (specialty) => (
                          <Badge
                            key={
                              specialty.id
                            }
                            variant="secondary"
                          >
                            {
                              specialty.name
                            }
                          </Badge>
                        ),
                      )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Weekly Availability
                  </p>

                  {selectedInstructor
                    .availabilityRules
                    ?.length > 0 ? (
                    selectedInstructor.availabilityRules.map(
                      (schedule) => (
                        <div
                          key={
                            schedule.id
                          }
                          className="flex items-center justify-between rounded-md border px-3 py-2.5"
                        >
                          <p className="text-sm font-medium">
                            {getDayName(
                              schedule.dayOfWeek,
                            )}
                          </p>

                          <p className="text-sm text-muted-foreground">
                            {formatTime(
                              schedule.startMinute,
                            )}{" "}
                            -{" "}
                            {formatTime(
                              schedule.endMinute,
                            )}
                          </p>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No availability set.
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setShowScheduleDialog(
                    false,
                  )
                }
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
