'use client';

import {
  SearchIcon,
  PlusIcon,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  CircleXIcon,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/Label';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

import { Badge } from '@/components/ui/Badge';

import { instructorService } from '@/services/front-desk/instructorService';

const dayOptions = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const date = new Date();
  date.setHours(hours, mins, 0, 0);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getDayName = (dayOfWeek) => {
  return (
    dayOptions.find((day) => day.value === Number(dayOfWeek))?.label ||
    'Unknown'
  );
};

const timeToMinutes = (time) => {
  if (!time) {
    return null;
  }

  const [hours, minutes] = time.split(':').map(Number);

  return hours * 60 + minutes;
};

const splitFullName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: '',
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const getOneHourEndTime = (startTime) => {
  if (!startTime) {
    return '';
  }

  const startMinute = timeToMinutes(startTime);

  if (startMinute === null) {
    return '';
  }

  const endMinute = startMinute + 60;

  if (endMinute > 24 * 60) {
    return '';
  }

  const endHour = Math.floor(endMinute / 60) % 24;
  const endMinuteValue = endMinute % 60;

  return `${String(endHour).padStart(2, '0')}:${String(endMinuteValue).padStart(
    2,
    '0',
  )}`;
};

const formatSelectedTime = (time) => {
  if (!time) {
    return 'Start';
  }

  const [hour, minute] = time.split(':');
  const hourNumber = Number(hour);
  const displayHour = hourNumber % 12 || 12;
  const period = hourNumber < 12 ? 'AM' : 'PM';

  return `${displayHour}:${minute} ${period}`;
};

const timeOptions = Array.from({ length: 47 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? 0 : 30;

  const value = `${String(hour).padStart(
    2,
    '0',
  )}:${String(minute).padStart(2, '0')}`;

  const displayHour = hour % 12 || 12;
  const period = hour < 12 ? 'AM' : 'PM';

  return {
    value,
    label: `${displayHour}:${String(minute).padStart(2, '0')} ${period}`,
  };
});

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);

  const [search, setSearch] = useState('');

  const [selectedInstructor, setSelectedInstructor] = useState(null);

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);

  const [showAddInstructorDialog, setShowAddInstructorDialog] = useState(false);

  const [showSpecialtyDialog, setShowSpecialtyDialog] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [selectedSpecializations, setSelectedSpecializations] = useState([]);

  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');

  const [instructorName, setInstructorName] = useState('');
  const [employmentType, setEmploymentType] = useState('PART_TIME');

  const [instructorEmail, setInstructorEmail] = useState('');
  const [instructorEmailError, setInstructorEmailError] = useState('');

  const [instructorPassword, setInstructorPassword] = useState('');

  const [schedules, setSchedules] = useState([]);

  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');

  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  const [specialtySubmitting, setSpecialtySubmitting] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadInstructors = async () => {
    try {
      setLoading(true);
      setError('');

      const [response, courseResponse] = await Promise.all([
        instructorService.getInstructors(),
        instructorService.getCourses(),
      ]);

      setInstructors(response.data || []);

      setCourses(
        (courseResponse.data || []).filter(
          (course) => course.status === 'ACTIVE',
        ),
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load instructors.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructors();
  }, []);

  const filtered = instructors.filter((instructor) => {
    const fullName = [
      instructor.person?.firstName,
      instructor.person?.middleName,
      instructor.person?.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    const specialties =
      (instructor.courseMappings || [])
        .map((mapping) => mapping.course?.name)
        .filter(Boolean)
        .join(' ') || '';

    return `${fullName} ${specialties}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const getInstructorName = (instructor) => {
    const person = instructor.person;

    if (!person) {
      return 'Unnamed Instructor';
    }

    return [person.firstName, person.middleName, person.lastName]
      .filter(Boolean)
      .join(' ');
  };

  const getInstructorEmail = (instructor) => {
    return instructor.person?.user?.email || instructor.person?.email || '—';
  };

  const getEmploymentType = (instructor) =>
    instructor?.metadata?.employmentType === 'FULL_TIME'
      ? 'FULL_TIME'
      : 'PART_TIME';

  const refreshSelectedInstructor = async (instructorId) => {
    const [instructorResponse, availabilityResponse] = await Promise.all([
      instructorService.getInstructor(instructorId),
      instructorService.getAvailability(instructorId),
    ]);

    const instructorData = instructorResponse.data;

    const availabilityData = availabilityResponse.data;

    setSelectedInstructor({
      ...instructorData,
      availabilityRules: availabilityData || [],
    });
  };

  const handleViewSchedule = async (instructor) => {
    try {
      setError('');
      setScheduleLoading(true);

      await refreshSelectedInstructor(instructor.id);

      setShowScheduleDialog(true);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load instructor schedule.',
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeactivateSpecialty = async (courseId) => {
    if (!selectedInstructor || specialtySubmitting) {
      return;
    }

    try {
      setSpecialtySubmitting(courseId);
      setError('');
      setSuccess('');

      const response = await instructorService.deactivateSpecialty(
        selectedInstructor.id,
        courseId,
      );

      setSelectedInstructor(response.data);
      setSuccess('Instructor specialty deactivated successfully.');
      await loadInstructors();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to deactivate instructor specialty.',
      );
    } finally {
      setSpecialtySubmitting('');
    }
  };

  const handleAddSpecialty = async () => {
    if (!selectedInstructor || !selectedSpecialtyId || specialtySubmitting) {
      return;
    }

    try {
      setSpecialtySubmitting('adding');
      setError('');
      setSuccess('');

      const response = await instructorService.addSpecialty(
        selectedInstructor.id,
        selectedSpecialtyId,
      );

      setSelectedInstructor(response.data);
      setSelectedSpecialtyId('');
      setShowSpecialtyDialog(false);
      setSuccess('Instructor specialty added successfully.');
      await loadInstructors();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to add instructor specialty.',
      );
    } finally {
      setSpecialtySubmitting('');
    }
  };

  const handleAddInstructor = () => {
    setError('');
    setSuccess('');
    resetForm();
    setShowAddInstructorDialog(true);
  };

  const toggleSpecialization = (specialization) => {
    setSelectedSpecializations((prev) =>
      prev.includes(specialization)
        ? prev.filter((item) => item !== specialization)
        : [...prev, specialization],
    );
  };

  const addSchedule = async () => {
    if (!selectedInstructor) {
      return;
    }

    if (!scheduleDay || !scheduleStartTime) {
      setError('Select a day and start time.');
      return;
    }

    const startMinute = timeToMinutes(scheduleStartTime);

    const endMinute = startMinute + 60;

    if (endMinute > 24 * 60) {
      setError('The schedule cannot extend past midnight.');
      return;
    }

    const existingSchedules = selectedInstructor.availabilityRules || [];

    const exists = existingSchedules.some(
      (schedule) =>
        Number(schedule.dayOfWeek) === Number(scheduleDay) &&
        startMinute < Number(schedule.endMinute) &&
        endMinute > Number(schedule.startMinute),
    );

    if (exists) {
      setError('This schedule overlaps an existing schedule.');
      return;
    }

    try {
      setScheduleSubmitting(true);
      setError('');
      setSuccess('');

      await instructorService.addAvailability(selectedInstructor.id, {
        dayOfWeek: Number(scheduleDay),
        startMinute,
        endMinute,
      });

      await refreshSelectedInstructor(selectedInstructor.id);

      setScheduleDay('');
      setScheduleStartTime('');
      setShowAvailabilityDialog(false);

      setSuccess('Schedule added successfully.');
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to add schedule.',
      );
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const removeSchedule = async (scheduleId) => {
    if (!selectedInstructor) {
      return;
    }

    try {
      setScheduleSubmitting(true);
      setError('');
      setSuccess('');

      await instructorService.deactivateAvailability(
        selectedInstructor.id,
        scheduleId,
      );

      await refreshSelectedInstructor(selectedInstructor.id);

      setSuccess('Schedule deactivated successfully.');
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to deactivate schedule.',
      );
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const resetForm = () => {
    setInstructorName('');
    setInstructorEmail('');
    setInstructorPassword('');
    setInstructorEmailError('');
    setEmploymentType('PART_TIME');
    setSelectedSpecializations([]);
    setSchedules([]);
    setScheduleDay('');
    setScheduleStartTime('');
    setSelectedSpecialtyId('');
    setShowPassword(false);
  };

  const handleSubmitInstructor = async () => {
    const trimmedName = instructorName.trim();

    const trimmedEmail = instructorEmail.trim();

    if (!trimmedName) {
      setError('Instructor name is required.');
      return;
    }

    if (!trimmedEmail) {
      setInstructorEmailError('Instructor email is required.');
      setError('Instructor email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setInstructorEmailError(
        trimmedEmail.includes('@')
          ? 'Enter a valid email address.'
          : 'Email must include the @ character.',
      );
      setError(
        trimmedEmail.includes('@')
          ? 'Enter a valid email address.'
          : 'Email must include the @ character.',
      );
      return;
    }

    if (!instructorPassword) {
      setError('Instructor password is required.');
      return;
    }

    if (instructorPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (selectedSpecializations.length === 0) {
      setError('Select at least one specialization.');
      return;
    }

    if (employmentType === 'PART_TIME' && schedules.length === 0) {
      setError('Add at least one schedule.');
      return;
    }

    const { firstName, lastName } = splitFullName(trimmedName);

    if (!firstName || !lastName) {
      setError("Please enter the instructor's first and last name.");
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await instructorService.createInstructorAccount({
        firstName,
        lastName,
        email: trimmedEmail,
        password: instructorPassword,
        courseIds: selectedSpecializations,
        availability:
          employmentType === 'PART_TIME'
            ? schedules.map(({ dayOfWeek, startMinute, endMinute }) => ({
                dayOfWeek,
                startMinute,
                endMinute,
              }))
            : [],
        metadata: {
          employmentType,
        },
      });

      if (!response.data?.id) {
        throw new Error(
          'Instructor was created but no instructor ID was returned.',
        );
      }

      setSuccess('Instructor created successfully.');

      resetForm();
      setShowAddInstructorDialog(false);

      await loadInstructors();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to create instructor.',
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
    setError('');
  };

  const handleCloseAvailabilityDialog = () => {
    if (scheduleSubmitting) {
      return;
    }

    setScheduleDay('');
    setScheduleStartTime('');
    setShowAvailabilityDialog(false);
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
                Manage instructors, specialties, and availability.
              </p>
            </div>

            <Button size="lg" onClick={handleAddInstructor}>
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
            <div className="rounded-md border px-4 py-3 text-sm">{success}</div>
          )}

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

                      <TableHead>Work Type</TableHead>

                      <TableHead>Specialization</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="text-right">Schedule</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filtered.length > 0 ? (
                      filtered.map((instructor) => (
                        <TableRow key={instructor.id}>
                          <TableCell className="py-4">
                            <div>
                              <p className="font-medium">
                                {getInstructorName(instructor)}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {getInstructorEmail(instructor)}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <Badge variant="outline">
                              {getEmploymentType(instructor) === 'FULL_TIME'
                                ? 'Full Time'
                                : 'Part Time'}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-4">
                            {(instructor.courseMappings || [])
                              .map((mapping) => mapping.course?.name)
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </TableCell>

                          <TableCell className="py-4">
                            <Badge
                              variant={
                                instructor.status === 'ACTIVE'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {instructor.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-4 text-right">
                            <Button
                              variant="outline"
                              className="p-2"
                              onClick={() => handleViewSchedule(instructor)}
                              disabled={scheduleLoading}
                            >
                              {scheduleLoading &&
                              selectedInstructor?.id === instructor.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'View'
                              )}
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
              <DialogTitle>Add Instructor</DialogTitle>

              <DialogDescription>
                Create an instructor account, choose their work type, and set
                their specialties.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Full Name</label>

                  <Input
                    placeholder="John Cruz"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>

                  <Input
                    type="email"
                    placeholder="instructor@cadenzamusic.com"
                    value={instructorEmail}
                    onChange={(e) => {
                      const value = e.target.value;

                      setInstructorEmail(value);
                      setInstructorEmailError(
                        value.trim() &&
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
                          ? value.trim().includes('@')
                            ? 'Enter a valid email address.'
                            : 'Email must include the @ character.'
                          : '',
                      );
                    }}
                    disabled={submitting}
                    className={instructorEmailError ? 'border-destructive' : ''}
                    aria-invalid={Boolean(instructorEmailError)}
                    aria-describedby={
                      instructorEmailError
                        ? 'instructor-email-error'
                        : undefined
                    }
                  />
                  {instructorEmailError && (
                    <p
                      id="instructor-email-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {instructorEmailError}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Work Type</label>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      value: 'FULL_TIME',
                      label: 'Full Time',
                      description: 'Automatically available',
                    },
                    {
                      value: 'PART_TIME',
                      label: 'Part Time',
                      description: 'Uses schedule availability',
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEmploymentType(option.value)}
                      disabled={submitting}
                      className={`rounded-md border p-3 text-left transition-colors ${
                        employmentType === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="block text-sm font-medium">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Password</label>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    className="pr-10"
                    value={instructorPassword}
                    onChange={(e) => setInstructorPassword(e.target.value)}
                    disabled={submitting}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
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
                <label className="text-sm font-medium">Specialization</label>

                <div className="flex flex-wrap gap-1.5">
                  {courses.map((course) => {
                    const isSelected = selectedSpecializations.includes(
                      course.id,
                    );

                    return (
                      <Button
                        key={course.id}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="h-8"
                        onClick={() => toggleSpecialization(course.id)}
                        disabled={submitting}
                      >
                        {course.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {employmentType === 'PART_TIME' ? (
                <div className="grid gap-2">
                  <div>
                    <label className="text-sm font-medium">
                      Schedule Availability
                    </label>

                    <p className="text-xs text-muted-foreground">
                      Add available days and one-hour time ranges.
                    </p>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="grid min-w-0 flex-1 gap-1">
                      <label className="text-xs text-muted-foreground">
                        Day
                      </label>

                      <select
                        value={scheduleDay}
                        onChange={(e) => setScheduleDay(e.target.value)}
                        disabled={submitting}
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="">Day</option>

                        {dayOptions.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label.slice(0, 3)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid min-w-0 flex-1 gap-1">
                      <label className="text-xs text-muted-foreground">
                        Start
                      </label>

                      <Select
                        value={scheduleStartTime}
                        onValueChange={setScheduleStartTime}
                        disabled={submitting}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>

                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid min-w-0 flex-1 gap-1">
                      <label className="text-xs text-muted-foreground">
                        End
                      </label>

                      <div className="flex h-9 w-full items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                        {scheduleStartTime
                          ? formatSelectedTime(
                              getOneHourEndTime(scheduleStartTime),
                            )
                          : 'End'}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => {
                        if (!scheduleDay || !scheduleStartTime) {
                          return;
                        }

                        const startMinute = timeToMinutes(scheduleStartTime);

                        const endMinute = startMinute + 60;

                        if (endMinute > 24 * 60) {
                          setError('The schedule cannot extend past midnight.');
                          return;
                        }

                        const exists = schedules.some(
                          (schedule) =>
                            schedule.dayOfWeek === Number(scheduleDay) &&
                            startMinute < schedule.endMinute &&
                            endMinute > schedule.startMinute,
                        );

                        if (exists) {
                          setError(
                            'This schedule overlaps an existing schedule.',
                          );
                          return;
                        }

                        setError('');

                        setSchedules((prev) => [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            dayOfWeek: Number(scheduleDay),
                            startMinute,
                            endMinute,
                          },
                        ]);

                        setScheduleDay('');
                        setScheduleStartTime('');
                      }}
                      disabled={
                        submitting || !scheduleDay || !scheduleStartTime
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
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-12 shrink-0 text-sm font-medium">
                              {getDayName(schedule.dayOfWeek).slice(0, 3)}
                            </span>

                            <span className="text-sm text-muted-foreground">
                              {formatTime(schedule.startMinute)} -{' '}
                              {formatTime(schedule.endMinute)}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setSchedules((prev) =>
                                prev.filter((item) => item.id !== schedule.id),
                              )
                            }
                            disabled={submitting}
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
              ) : (
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                  Full-time instructors are automatically available. No schedule
                  availability setup is required.
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={handleCloseAddDialog}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmitInstructor}
                disabled={
                  submitting ||
                  !instructorName.trim() ||
                  !instructorEmail.trim() ||
                  !instructorPassword ||
                  selectedSpecializations.length === 0 ||
                  (employmentType === 'PART_TIME' && schedules.length === 0)
                }
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {submitting ? 'Creating...' : 'Add Instructor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent className="w-[calc(100%-2rem)] max-h-[75vh] max-w-[420px] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Instructor Schedule</DialogTitle>

              <DialogDescription>
                Manage the instructor's specialties and work schedule.
              </DialogDescription>
            </DialogHeader>

            {selectedInstructor && (
              <div className="max-h-[50vh] overflow-y-auto pr-2">
                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Instructor</p>

                    <p className="font-medium">
                      {getInstructorName(selectedInstructor)}
                    </p>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Specialties</p>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSpecialtyId('');
                          setShowSpecialtyDialog(true);
                        }}
                      >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add Specialty
                      </Button>
                    </div>

                    {selectedInstructor.courseMappings?.length > 0 ? (
                      selectedInstructor.courseMappings.map((mapping) => (
                        <div
                          key={mapping.courseId}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <p className="text-sm font-medium">
                            {mapping.course?.name}
                          </p>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Deactivate specialty"
                            onClick={() =>
                              handleDeactivateSpecialty(mapping.courseId)
                            }
                            disabled={specialtySubmitting === mapping.courseId}
                          >
                            {specialtySubmitting === mapping.courseId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CircleXIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specialties assigned.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {getEmploymentType(selectedInstructor) === 'FULL_TIME'
                          ? 'Work Schedule'
                          : 'Weekly Availability'}
                      </p>

                      {getEmploymentType(selectedInstructor) ===
                        'PART_TIME' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setError('');
                            setScheduleDay('');
                            setScheduleStartTime('');
                            setShowAvailabilityDialog(true);
                          }}
                        >
                          <PlusIcon className="mr-2 h-4 w-4" />
                          Add Schedule
                        </Button>
                      )}
                    </div>

                    {getEmploymentType(selectedInstructor) === 'FULL_TIME' ? (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                        Full-time instructors are automatically available. Their
                        schedule does not require manual availability entries.
                      </div>
                    ) : selectedInstructor.availabilityRules?.length > 0 ? (
                      selectedInstructor.availabilityRules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <div className="flex items-center gap-4">
                            <p className="text-sm font-medium">
                              {getDayName(schedule.dayOfWeek)}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {formatTime(schedule.startMinute)} -{' '}
                              {formatTime(schedule.endMinute)}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeSchedule(schedule.id)}
                            disabled={scheduleSubmitting}
                            title="Deactivate schedule"
                          >
                            {scheduleSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CircleXIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No availability set.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowScheduleDialog(false)}
                disabled={scheduleSubmitting}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showAvailabilityDialog}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseAvailabilityDialog();
            }
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add Schedule</DialogTitle>

              <DialogDescription>
                Add a one-hour availability schedule for this instructor.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Day</Label>

                <select
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(e.target.value)}
                  disabled={scheduleSubmitting}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">Select a day</option>

                  {dayOptions.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Start</Label>

                  <Select
                    value={scheduleStartTime}
                    onValueChange={setScheduleStartTime}
                    disabled={scheduleSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>

                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>End</Label>

                  <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                    {scheduleStartTime
                      ? formatSelectedTime(getOneHourEndTime(scheduleStartTime))
                      : 'Auto'}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Every schedule is automatically set to exactly one hour.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAvailabilityDialog}
                disabled={scheduleSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={addSchedule}
                disabled={
                  scheduleSubmitting || !scheduleDay || !scheduleStartTime
                }
              >
                {scheduleSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {scheduleSubmitting ? 'Adding...' : 'Add Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showSpecialtyDialog}
          onOpenChange={setShowSpecialtyDialog}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add Specialty</DialogTitle>

              <DialogDescription>
                Select a course to add as an instructor specialty.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Course</Label>

                <Select
                  value={selectedSpecialtyId}
                  onValueChange={setSelectedSpecialtyId}
                >
                  <SelectTrigger id="specialty">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>

                  <SelectContent>
                    {courses
                      .filter(
                        (course) =>
                          !selectedInstructor?.courseMappings?.some(
                            (mapping) => mapping.courseId === course.id,
                          ),
                      )
                      .map((course) => (
                        <SelectItem key={course.id} value={String(course.id)}>
                          {course.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedSpecialtyId('');
                  setShowSpecialtyDialog(false);
                }}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={!selectedSpecialtyId || Boolean(specialtySubmitting)}
                onClick={handleAddSpecialty}
              >
                {specialtySubmitting === 'adding' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {specialtySubmitting === 'adding'
                  ? 'Adding...'
                  : 'Add Specialty'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
