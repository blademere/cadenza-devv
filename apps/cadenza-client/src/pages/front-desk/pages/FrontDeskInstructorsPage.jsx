"use client";

import { SearchIcon, PlusIcon, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";

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

const instructors = [
  {
    id: 1,
    name: "John Cruz",
    email: "john@cadenzamusic.com",
    specialization: ["Piano", "Voice", "Guitar"],
    students: 18,
    queries: [
      {
        id: 1,
        day: "Monday",
        startTime: "09:00 AM",
        endTime: "12:00 PM",
        status: "Pending",
      },
      {
        id: 2,
        day: "Wednesday",
        startTime: "01:00 PM",
        endTime: "04:00 PM",
        status: "Pending",
      },
    ],
    status: "Active",
  },
  {
    id: 2,
    name: "Anna Lee",
    email: "anna@cadenzamusic.com",
    specialization: ["Violin", "Piano"],
    students: 12,
    queries: [
      {
        id: 3,
        day: "Tuesday",
        startTime: "10:00 AM",
        endTime: "01:00 PM",
        status: "Pending",
      },
    ],
    status: "Active",
  },
  {
    id: 3,
    name: "Mark Reyes",
    email: "mark@cadenzamusic.com",
    specialization: ["Guitar"],
    students: 15,
    queries: [
      {
        id: 4,
        day: "Friday",
        startTime: "02:00 PM",
        endTime: "05:00 PM",
        status: "Pending",
      },
      {
        id: 5,
        day: "Saturday",
        startTime: "09:00 AM",
        endTime: "12:00 PM",
        status: "Pending",
      },
    ],
    status: "Active",
  },
];

const specializationOptions = [
  "Piano",
  "Guitar",
  "Voice",
  "Violin",
  "Drums",
  "Keyboard",
];

const formatTime = (time) => {
  const [hours, minutes] = time.split(":");
  const date = new Date();

  date.setHours(Number(hours), Number(minutes));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function InstructorsPage() {
  const [search, setSearch] = useState("");

  const [selectedInstructor, setSelectedInstructor] = useState(null);

  const [showQueryDialog, setShowQueryDialog] = useState(false);
  const [showAddInstructorDialog, setShowAddInstructorDialog] =
    useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [selectedSpecializations, setSelectedSpecializations] =
    useState([]);

  const [instructorName, setInstructorName] = useState("");
  const [instructorEmail, setInstructorEmail] = useState("");
  const [instructorPassword, setInstructorPassword] = useState("");

  const [schedules, setSchedules] = useState([]);
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");

  const filtered = instructors.filter((instructor) =>
    `${instructor.name} ${instructor.specialization.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const handleSeeQuery = (instructor) => {
    setSelectedInstructor(instructor);
    setShowQueryDialog(true);
  };

  const handleAddInstructor = () => {
    setShowAddInstructorDialog(true);
  };

  const toggleSpecialization = (specialization) => {
    setSelectedSpecializations((prev) =>
      prev.includes(specialization)
        ? prev.filter((item) => item !== specialization)
        : [...prev, specialization],
    );
  };

  const addSchedule = () => {
    if (!scheduleDay || !scheduleStartTime || !scheduleEndTime) {
      return;
    }

    if (scheduleStartTime >= scheduleEndTime) {
      return;
    }

    const newSchedule = {
      id: Date.now(),
      day: scheduleDay,
      startTime: scheduleStartTime,
      endTime: scheduleEndTime,
    };

    setSchedules((prev) => [...prev, newSchedule]);

    setScheduleDay("");
    setScheduleStartTime("");
    setScheduleEndTime("");
  };

  const removeSchedule = (scheduleId) => {
    setSchedules((prev) =>
      prev.filter((schedule) => schedule.id !== scheduleId),
    );
  };

  const handleSubmitInstructor = () => {
    const newInstructor = {
      name: instructorName,
      email: instructorEmail,
      password: instructorPassword,
      specialization: selectedSpecializations,
      schedules,
    };

    console.log("New Instructor:", newInstructor);

    setInstructorName("");
    setInstructorEmail("");
    setInstructorPassword("");
    setSelectedSpecializations([]);
    setSchedules([]);
    setScheduleDay("");
    setScheduleStartTime("");
    setScheduleEndTime("");
    setShowPassword(false);

    setShowAddInstructorDialog(false);
  };

  const handleCloseAddDialog = () => {
    setShowAddInstructorDialog(false);

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
                Instructor's schedule approval.
              </p>
            </div>

            <Button
              variant="default"
              size="lg"
              onClick={handleAddInstructor}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Instructor
            </Button>
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
              <div className="w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="text-right">
                        Query
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.length > 0 ? (
                      filtered.map((instructor) => (
                        <TableRow key={instructor.id}>
                          <TableCell className="py-4 font-medium">
                            {instructor.name}
                          </TableCell>

                          <TableCell className="py-4">
                            {instructor.specialization.join(", ")}
                          </TableCell>

                          <TableCell className="py-4">
                            {instructor.students}
                          </TableCell>

                          <TableCell className="py-4 text-right">
                            <Button
                              variant="link"
                              className="h-auto p-0"
                              onClick={() =>
                                handleSeeQuery(instructor)
                              }
                            >
                              See Query
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
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
          onOpenChange={setShowAddInstructorDialog}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Instructor</DialogTitle>

              <DialogDescription>
                Create an instructor account and set their availability.
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
                      setInstructorName(e.target.value)
                    }
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
                      setInstructorEmail(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Password
                </label>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    className="pr-10"
                    value={instructorPassword}
                    onChange={(e) =>
                      setInstructorPassword(e.target.value)
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  {specializationOptions.map((specialization) => {
                    const isSelected =
                      selectedSpecializations.includes(
                        specialization,
                      );

                    return (
                      <Button
                        key={specialization}
                        type="button"
                        variant={
                          isSelected ? "default" : "outline"
                        }
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          toggleSpecialization(specialization)
                        }
                      >
                        {specialization}
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
                    Add available days and time ranges.
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
                        setScheduleDay(e.target.value)
                      }
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">Day</option>
                      <option value="Monday">Mon</option>
                      <option value="Tuesday">Tue</option>
                      <option value="Wednesday">Wed</option>
                      <option value="Thursday">Thu</option>
                      <option value="Friday">Fri</option>
                      <option value="Saturday">Sat</option>
                      <option value="Sunday">Sun</option>
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
                        setScheduleStartTime(e.target.value)
                      }
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
                        setScheduleEndTime(e.target.value)
                      }
                      className="h-9"
                    />
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9"
                    onClick={addSchedule}
                    disabled={
                      !scheduleDay ||
                      !scheduleStartTime ||
                      !scheduleEndTime ||
                      scheduleStartTime >= scheduleEndTime
                    }
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>

                {schedules.length > 0 && (
                  <div className="max-h-[150px] space-y-1.5 overflow-y-auto rounded-md border p-2">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-sm font-medium">
                            {schedule.day}
                          </span>

                          <span className="text-sm text-muted-foreground">
                            {formatTime(schedule.startTime)} -{" "}
                            {formatTime(schedule.endTime)}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            removeSchedule(schedule.id)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
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
                onClick={handleCloseAddDialog}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmitInstructor}
                disabled={
                  !instructorName ||
                  !instructorEmail ||
                  !instructorPassword ||
                  selectedSpecializations.length === 0 ||
                  schedules.length === 0
                }
              >
                Add Instructor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showQueryDialog}
          onOpenChange={setShowQueryDialog}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule Request</DialogTitle>

              <DialogDescription>
                Review the schedule requested by the instructor.
              </DialogDescription>
            </DialogHeader>

            {selectedInstructor && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Instructor
                  </p>

                  <p className="font-medium">
                    {selectedInstructor.name}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Requested Schedule
                  </p>

                  {selectedInstructor.queries.map((query) => (
                    <div
                      key={query.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {query.day}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {query.startTime} - {query.endTime}
                        </p>
                      </div>

                      <Badge variant="secondary">
                        {query.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowQueryDialog(false)}
              >
                Reject
              </Button>

              <Button
                onClick={() => {
                  console.log(
                    "Approved schedule:",
                    selectedInstructor,
                  );

                  setShowQueryDialog(false);
                }}
              >
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
