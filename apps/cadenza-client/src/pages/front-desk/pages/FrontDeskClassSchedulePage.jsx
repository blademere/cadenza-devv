"use client";

import { useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DoorOpenIcon,
  RefreshCwIcon,
  SendIcon,
  UserIcon,
  UsersIcon,
  BellIcon,
  SearchIcon,
  MapPinIcon,
  AlertCircleIcon,
} from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

const rooms = [
  {
    id: 'room-1',
    name: 'Room 1',
    capacity: 1,
    type: 'Private',
  },
  {
    id: 'room-2',
    name: 'Room 2',
    capacity: 1,
    type: 'Private',
  },
  {
    id: 'room-3',
    name: 'Room 3',
    capacity: 1,
    type: 'Private',
  },
  {
    id: 'room-4',
    name: 'Room 4',
    capacity: 1,
    type: 'Private',
  },
  {
    id: 'band-room',
    name: 'Band Room',
    capacity: 6,
    type: 'Group',
  },
  {
    id: 'lesson-room',
    name: 'Lesson Room',
    capacity: 4,
    type: 'Group',
  },
];

const getDateAfterDays = (days, baseDate = new Date()) => {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const formatDateKey = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatFullDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const formatShortDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

const formatTime = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:00 ${period}`;
};

const getWeekDates = (date = new Date()) => {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(current);
  monday.setDate(current.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(monday);
    value.setDate(monday.getDate() + index);
    return value;
  });
};

const getRescheduleWindow = (requestDate) => {
  const startDate = new Date(requestDate);
  startDate.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
};

const parseTime = (time) => {
  const match = time.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) {
    return null;
  }

  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const startPeriod = match[3].toUpperCase();

  const endHour = Number(match[4]);
  const endMinute = Number(match[5]);
  const endPeriod = match[6].toUpperCase();

  const convertToMinutes = (hour, minute, period) => {
    let normalizedHour = hour % 12;

    if (period === 'PM') {
      normalizedHour += 12;
    }

    return normalizedHour * 60 + minute;
  };

  return {
    start: convertToMinutes(startHour, startMinute, startPeriod),
    end: convertToMinutes(endHour, endMinute, endPeriod),
  };
};

const getCurrentMinutes = () => {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
};

const getScheduleStartMinutes = (time) => {
  const parsed = parseTime(time);

  return parsed?.start ?? null;
};

const getScheduleEndMinutes = (time) => {
  const parsed = parseTime(time);

  return parsed?.end ?? null;
};

const isScheduleConflict = (firstSchedule, secondSchedule) => {
  if (firstSchedule.date !== secondSchedule.date) {
    return false;
  }

  const firstTime = parseTime(firstSchedule.time);
  const secondTime = parseTime(secondSchedule.time);

  if (!firstTime || !secondTime) {
    return false;
  }

  return (
    firstTime.start < secondTime.end &&
    firstTime.end > secondTime.start
  );
};

const today = new Date();

const schedule = [
  {
    id: 1,
    date: formatDateKey(today),
    time: '7:00 AM - 8:00 AM',
    course: 'Piano Beginner',
    student: 'Maria Santos',
    instructor: 'John Cruz',
    room: 'Room 1',
    status: 'COMPLETED',
    enrolled: true,
  },
  {
    id: 2,
    date: formatDateKey(today),
    time: '9:00 AM - 10:00 AM',
    course: 'Guitar Basics',
    student: 'James Reyes',
    instructor: 'Anna Lee',
    room: 'Room 2',
    status: 'COMPLETED',
    enrolled: true,
  },
  {
    id: 3,
    date: formatDateKey(today),
    time: '11:00 AM - 12:00 PM',
    course: 'Vocal Training',
    student: 'Sofia Garcia',
    instructor: 'Mark Reyes',
    room: 'Room 3',
    status: 'COMPLETED',
    enrolled: true,
  },
  {
    id: 10,
    date: formatDateKey(today),
    time: '1:00 PM - 2:00 PM',
    course: 'Drum Fundamentals',
    student: 'Kevin Tan',
    instructor: 'Mark Reyes',
    room: 'Band Room',
    status: 'ONGOING',
    enrolled: true,
  },
  {
    id: 11,
    date: formatDateKey(today),
    time: '3:00 PM - 4:00 PM',
    course: 'Piano Beginner',
    student: 'Daniel Cruz',
    instructor: 'John Cruz',
    room: null,
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 12,
    date: formatDateKey(today),
    time: '3:00 PM - 4:00 PM',
    course: 'Guitar Basics',
    student: 'Angela Lim',
    instructor: 'Anna Lee',
    room: null,
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 13,
    date: formatDateKey(today),
    time: '3:00 PM - 4:00 PM',
    course: 'Vocal Training',
    student: 'Sofia Garcia',
    instructor: 'Mark Reyes',
    room: null,
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 14,
    date: formatDateKey(today),
    time: '4:00 PM - 5:00 PM',
    course: 'Drum Fundamentals',
    student: 'Carlos Dela Cruz',
    instructor: 'Mark Reyes',
    room: null,
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 4,
    date: formatDateKey(getDateAfterDays(1)),
    time: '8:00 AM - 9:00 AM',
    course: 'Piano Beginner',
    student: 'Daniel Cruz',
    instructor: 'John Cruz',
    room: 'Room 1',
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 5,
    date: formatDateKey(getDateAfterDays(2)),
    time: '10:00 AM - 11:00 AM',
    course: 'Guitar Basics',
    student: 'Angela Lim',
    instructor: 'Anna Lee',
    room: 'Room 2',
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 6,
    date: formatDateKey(getDateAfterDays(3)),
    time: '1:00 PM - 2:00 PM',
    course: 'Drum Fundamentals',
    student: 'Kevin Tan',
    instructor: 'Mark Reyes',
    room: 'Room 4',
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 7,
    date: formatDateKey(getDateAfterDays(4)),
    time: '3:00 PM - 4:00 PM',
    course: 'Piano Intermediate',
    student: 'Rachel Ong',
    instructor: 'John Cruz',
    room: 'Room 1',
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 8,
    date: formatDateKey(getDateAfterDays(5)),
    time: '4:00 PM - 5:00 PM',
    course: 'Vocal Training',
    student: 'Carlos Dela Cruz',
    instructor: 'Mark Reyes',
    room: 'Room 3',
    status: 'UPCOMING',
    enrolled: true,
  },
  {
    id: 9,
    date: formatDateKey(getDateAfterDays(6)),
    time: '10:00 AM - 11:00 AM',
    course: 'Piano Intermediate',
    student: 'Julia Tan',
    instructor: 'John Cruz',
    room: 'Room 1',
    status: 'UPCOMING',
    enrolled: true,
  },
];

const rescheduleRequests = [
  {
    id: 1,
    classId: 1,
    reason: 'Instructor requested a schedule change.',
    requestedBy: 'John Cruz',
    requestedAt: formatDateKey(today),
    course: 'Piano Beginner',
    student: 'Maria Santos',
    instructor: 'John Cruz',
    currentDate: formatDateKey(today),
    currentTime: '7:00 AM - 8:00 AM',
    currentRoom: 'Room 1',
  },
  {
    id: 2,
    classId: 2,
    reason: 'Student requested a schedule change.',
    requestedBy: 'James Reyes',
    requestedAt: formatDateKey(today),
    course: 'Guitar Basics',
    student: 'James Reyes',
    instructor: 'Anna Lee',
    currentDate: formatDateKey(today),
    currentTime: '9:00 AM - 10:00 AM',
    currentRoom: 'Room 2',
  },
];

const buildGeneratedSchedules = (request) => {
  const requestDate = new Date(request.requestedAt);
  const windowDates = getRescheduleWindow(requestDate);

  const options = [
    {
      dayOffset: 0,
      hour: 7,
      room: 'Room 1',
    },
    {
      dayOffset: 0,
      hour: 9,
      room: 'Room 2',
    },
    {
      dayOffset: 1,
      hour: 10,
      room: 'Room 1',
    },
    {
      dayOffset: 2,
      hour: 1,
      room: 'Room 3',
    },
    {
      dayOffset: 3,
      hour: 3,
      room: 'Room 2',
    },
    {
      dayOffset: 4,
      hour: 5,
      room: 'Room 1',
    },
    {
      dayOffset: 5,
      hour: 11,
      room: 'Room 3',
    },
    {
      dayOffset: 6,
      hour: 2,
      room: 'Room 4',
    },
    {
      dayOffset: 2,
      hour: 7,
      room: 'Room 4',
    },
    {
      dayOffset: 5,
      hour: 6,
      room: 'Room 2',
    },
  ];

  return options.map((option, index) => {
    const date = windowDates[option.dayOffset];
    const endHour = option.hour + 1;

    return {
      id: `${request.id}-${index + 1}`,
      requestId: request.id,
      date: formatDateKey(date),
      time: `${formatTime(option.hour)} - ${formatTime(endHour)}`,
      course: request.course,
      student: request.student,
      instructor: request.instructor,
      room: option.room,
    };
  });
};

function ScheduleRow({
  item,
  onReschedule,
  onAssignRoom,
  canAssignRoom,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-background p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock3Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{item.course}</p>

            <Badge
              variant={
                item.status === 'ONGOING'
                  ? 'default'
                  : item.status === 'UPCOMING'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {item.status}
            </Badge>

            {item.room && (
              <Badge variant="outline">
                <DoorOpenIcon className="mr-1 h-3 w-3" />
                {item.room}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {item.time}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5" />
              {item.student}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5" />
              {item.instructor}
            </span>

            {item.room && (
              <span className="inline-flex items-center gap-1.5">
                <DoorOpenIcon className="h-3.5 w-3.5" />
                {item.room}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {canAssignRoom && (
          <Button
            variant="outline"
            onClick={() => onAssignRoom(item)}
          >
            <MapPinIcon className="mr-2 h-4 w-4" />
            Assign Room
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => onReschedule(item)}
        >
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          Re-Sched
        </Button>
      </div>
    </div>
  );
}

export default function ClassSchedule() {
  const [activeTab, setActiveTab] = useState('today');
  const [selectedDay, setSelectedDay] = useState(formatDateKey(today));
  const [weeklySearch, setWeeklySearch] = useState('');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const [generatedSchedules, setGeneratedSchedules] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [submittedOptions, setSubmittedOptions] = useState(false);

  const [instructorChoices, setInstructorChoices] = useState([]);
  const [studentChoices, setStudentChoices] = useState([]);

  const [finalSchedule, setFinalSchedule] = useState(null);
  const [confirmedSchedule, setConfirmedSchedule] = useState(null);

  const [noMatchNotificationSent, setNoMatchNotificationSent] =
    useState(false);

  const [centerReschedule, setCenterReschedule] = useState(false);

  const [assignedRooms, setAssignedRooms] = useState({});

  const [roomAssignmentClass, setRoomAssignmentClass] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomAssignmentMessage, setRoomAssignmentMessage] =
    useState('');

  const weekDates = useMemo(() => getWeekDates(today), []);

  const todayKey = formatDateKey(today);

  const todaySchedules = useMemo(() => {
    return schedule.filter((item) => item.date === todayKey);
  }, [todayKey]);

  const ongoingSchedules = useMemo(() => {
    const currentMinutes = getCurrentMinutes();

    return todaySchedules.filter((item) => {
      const start = getScheduleStartMinutes(item.time);
      const end = getScheduleEndMinutes(item.time);

      if (start === null || end === null) {
        return false;
      }

      return currentMinutes >= start && currentMinutes < end;
    });
  }, [todaySchedules]);

  const nextUpcomingSchedules = useMemo(() => {
    const currentMinutes = getCurrentMinutes();

    return todaySchedules
      .filter((item) => {
        const start = getScheduleStartMinutes(item.time);

        if (start === null) {
          return false;
        }

        return start > currentMinutes && item.enrolled;
      })
      .sort((a, b) => {
        return (
          getScheduleStartMinutes(a.time) -
          getScheduleStartMinutes(b.time)
        );
      });
  }, [todaySchedules]);

  const schedulesReadyForRoomAssignment = useMemo(() => {
    if (!nextUpcomingSchedules.length) {
      return [];
    }

    const nextStart = getScheduleStartMinutes(
      nextUpcomingSchedules[0].time,
    );

    return nextUpcomingSchedules.filter(
      (item) =>
        getScheduleStartMinutes(item.time) === nextStart,
    );
  }, [nextUpcomingSchedules]);

  const weeklySchedules = useMemo(() => {
    const search = weeklySearch.trim().toLowerCase();

    return schedule.filter((item) => {
      if (item.date !== selectedDay) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        item.course,
        item.student,
        item.instructor,
        item.room,
        item.time,
        item.status,
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search),
      );
    });
  }, [selectedDay, weeklySearch]);

  const matchingSchedules = useMemo(() => {
    return generatedSchedules.filter(
      (option) =>
        instructorChoices.includes(option.id) &&
        studentChoices.includes(option.id),
    );
  }, [generatedSchedules, instructorChoices, studentChoices]);

  const selectedRequestWindow = useMemo(() => {
    if (!selectedRequest) {
      return [];
    }

    return getRescheduleWindow(selectedRequest.requestedAt);
  }, [selectedRequest]);

  const roomConflicts = useMemo(() => {
    if (!roomAssignmentClass) {
      return [];
    }

    return todaySchedules.filter((item) => {
      if (item.id === roomAssignmentClass.id) {
        return false;
      }

      if (!item.room) {
        return false;
      }

      return isScheduleConflict(item, roomAssignmentClass);
    });
  }, [roomAssignmentClass, todaySchedules]);

  const instructorConflicts = useMemo(() => {
    if (!roomAssignmentClass) {
      return [];
    }

    return todaySchedules.filter((item) => {
      if (item.id === roomAssignmentClass.id) {
        return false;
      }

      if (item.instructor !== roomAssignmentClass.instructor) {
        return false;
      }

      return isScheduleConflict(item, roomAssignmentClass);
    });
  }, [roomAssignmentClass, todaySchedules]);

  const studentConflicts = useMemo(() => {
    if (!roomAssignmentClass) {
      return [];
    }

    return todaySchedules.filter((item) => {
      if (item.id === roomAssignmentClass.id) {
        return false;
      }

      if (item.student !== roomAssignmentClass.student) {
        return false;
      }

      return isScheduleConflict(item, roomAssignmentClass);
    });
  }, [roomAssignmentClass, todaySchedules]);

  const availableRooms = useMemo(() => {
    if (!roomAssignmentClass) {
      return [];
    }

    const conflictingRoomNames = new Set(
      roomConflicts.map((item) => item.room),
    );

    return rooms.filter(
      (room) => !conflictingRoomNames.has(room.name),
    );
  }, [roomAssignmentClass, roomConflicts]);

  const openRoomAssignment = (classItem) => {
    setRoomAssignmentClass(classItem);
    setSelectedRoomId(
      assignedRooms[classItem.id]?.roomId ?? null,
    );
    setRoomAssignmentMessage('');
  };

  const closeRoomAssignment = () => {
    setRoomAssignmentClass(null);
    setSelectedRoomId(null);
    setRoomAssignmentMessage('');
  };

  const assignRoom = () => {
    if (!roomAssignmentClass || !selectedRoomId) {
      return;
    }

    const selectedRoom = rooms.find(
      (room) => room.id === selectedRoomId,
    );

    if (!selectedRoom) {
      return;
    }

    const conflictingRoom = roomConflicts.find(
      (item) => item.room === selectedRoom.name,
    );

    if (conflictingRoom) {
      setRoomAssignmentMessage(
        `${selectedRoom.name} is already occupied by ${conflictingRoom.course} from ${conflictingRoom.time}.`,
      );
      return;
    }

    if (instructorConflicts.length) {
      setRoomAssignmentMessage(
        `${roomAssignmentClass.instructor} already has another enrolled class during this time.`,
      );
      return;
    }

    if (studentConflicts.length) {
      setRoomAssignmentMessage(
        `${roomAssignmentClass.student} is already enrolled in another class during this time.`,
      );
      return;
    }

    setAssignedRooms((current) => ({
      ...current,
      [roomAssignmentClass.id]: {
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
      },
    }));

    setRoomAssignmentMessage(
      `${selectedRoom.name} has been assigned successfully.`,
    );
  };

  const getRoomForSchedule = (item) => {
    return assignedRooms[item.id]?.roomName ?? item.room;
  };

  const openNormalReschedule = (request) => {
    setCenterReschedule(false);
    setSelectedRequest(request);
    setSelectedClass(null);
    setGenerated(false);
    setSubmittedOptions(false);
    setGeneratedSchedules([]);
    setInstructorChoices([]);
    setStudentChoices([]);
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setNoMatchNotificationSent(false);
  };

  const openCenterReschedule = (classItem) => {
    const request = {
      id: `center-${classItem.id}`,
      classId: classItem.id,
      reason: 'Music Center schedule change.',
      requestedBy: 'Music Center',
      requestedAt: formatDateKey(today),
      course: classItem.course,
      student: classItem.student,
      instructor: classItem.instructor,
      currentDate: classItem.date,
      currentTime: classItem.time,
      currentRoom:
        getRoomForSchedule(classItem) || 'Unassigned',
    };

    setCenterReschedule(true);
    setSelectedClass(classItem);
    setSelectedRequest(request);
    setGenerated(false);
    setSubmittedOptions(false);
    setGeneratedSchedules([]);
    setInstructorChoices([]);
    setStudentChoices([]);
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setNoMatchNotificationSent(false);
  };

  const generateSchedules = () => {
    if (!selectedRequest) {
      return;
    }

    const options = buildGeneratedSchedules(selectedRequest);

    setGeneratedSchedules(options);
    setGenerated(true);
    setSubmittedOptions(false);
    setInstructorChoices([]);
    setStudentChoices([]);
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setNoMatchNotificationSent(false);
  };

  const submitGeneratedSchedules = () => {
    if (!generatedSchedules.length) {
      return;
    }

    setSubmittedOptions(true);

    setInstructorChoices(
      [
        generatedSchedules[0]?.id,
        generatedSchedules[2]?.id,
        generatedSchedules[4]?.id,
        generatedSchedules[6]?.id,
        generatedSchedules[8]?.id,
      ].filter(Boolean),
    );

    setStudentChoices(
      [
        generatedSchedules[0]?.id,
        generatedSchedules[1]?.id,
        generatedSchedules[3]?.id,
        generatedSchedules[6]?.id,
        generatedSchedules[9]?.id,
      ].filter(Boolean),
    );
  };

  const toggleInstructorChoice = (id) => {
    setInstructorChoices((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

    setFinalSchedule(null);
    setNoMatchNotificationSent(false);
  };

  const toggleStudentChoice = (id) => {
    setStudentChoices((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

    setFinalSchedule(null);
    setNoMatchNotificationSent(false);
  };

  const notifyParticipants = () => {
    setNoMatchNotificationSent(true);
  };

  const submitFinalSchedule = () => {
    if (!finalSchedule) {
      return;
    }

    setConfirmedSchedule(finalSchedule);
  };

  const resetReschedule = () => {
    setSelectedRequest(null);
    setSelectedClass(null);
    setGeneratedSchedules([]);
    setGenerated(false);
    setSubmittedOptions(false);
    setInstructorChoices([]);
    setStudentChoices([]);
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setNoMatchNotificationSent(false);
    setCenterReschedule(false);
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Class Schedule</CardTitle>

                  <CardDescription>
                    View today's classes, weekly schedules, assign rooms
                    ahead of time, and manage class rescheduling.
                  </CardDescription>
                </div>

                <Button
                  onClick={() => {
                    setActiveTab('today');

                    const firstClass = todaySchedules[0];

                    if (firstClass) {
                      openCenterReschedule(firstClass);
                    }
                  }}
                >
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                  Re-Sched
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="mb-5 flex flex-wrap gap-2 border-b pb-4">
                <Button
                  variant={
                    activeTab === 'today' ? 'default' : 'outline'
                  }
                  onClick={() => setActiveTab('today')}
                >
                  <CalendarDaysIcon className="mr-2 h-4 w-4" />
                  Today's Schedule
                </Button>

                <Button
                  variant={
                    activeTab === 'weekly' ? 'default' : 'outline'
                  }
                  onClick={() => {
                    setActiveTab('weekly');
                    setSelectedDay(formatDateKey(weekDates[0]));
                  }}
                >
                  <CalendarDaysIcon className="mr-2 h-4 w-4" />
                  Weekly Schedule
                </Button>
              </div>

              {activeTab === 'today' && (
                <div className="space-y-5">
                  {schedulesReadyForRoomAssignment.length > 0 && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-5 w-5 text-primary" />

                              <CardTitle className="text-base">
                                Prepare Upcoming Classes
                              </CardTitle>
                            </div>

                            <CardDescription className="mt-1">
                              The next enrolled classes can be assigned a
                              room before the instructor and student arrive.
                              Rooms are filtered automatically to prevent
                              conflicts.
                            </CardDescription>
                          </div>

                          <Badge variant="secondary">
                            {schedulesReadyForRoomAssignment.length}{' '}
                            Upcoming
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {schedulesReadyForRoomAssignment.map(
                          (item) => {
                            const assignedRoom =
                              getRoomForSchedule(item);

                            return (
                              <div
                                key={item.id}
                                className="flex flex-col gap-4 rounded-xl border bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">
                                      {item.course}
                                    </p>

                                    <Badge variant="secondary">
                                      {item.time}
                                    </Badge>

                                    {assignedRoom && (
                                      <Badge variant="outline">
                                        <DoorOpenIcon className="mr-1 h-3 w-3" />
                                        {assignedRoom}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                      <UserIcon className="h-3.5 w-3.5" />
                                      {item.student}
                                    </span>

                                    <span className="inline-flex items-center gap-1.5">
                                      <UsersIcon className="h-3.5 w-3.5" />
                                      {item.instructor}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  variant={
                                    assignedRoom
                                      ? 'outline'
                                      : 'default'
                                  }
                                  onClick={() =>
                                    openRoomAssignment(item)
                                  }
                                >
                                  <MapPinIcon className="mr-2 h-4 w-4" />

                                  {assignedRoom
                                    ? 'Change Room'
                                    : 'Assign Room'}
                                </Button>
                              </div>
                            );
                          },
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {roomAssignmentClass && (
                    <Card className="border-primary/30">
                      <CardHeader>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <CardTitle>
                              Assign Room Ahead of Time
                            </CardTitle>

                            <CardDescription>
                              Select a room for{' '}
                              <span className="font-medium text-foreground">
                                {roomAssignmentClass.course}
                              </span>{' '}
                              before the class starts.
                            </CardDescription>
                          </div>

                          <Button
                            variant="outline"
                            onClick={closeRoomAssignment}
                          >
                            Close
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-5">
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-semibold">
                                {roomAssignmentClass.course}
                              </p>

                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatFullDate(
                                  roomAssignmentClass.date,
                                )}{' '}
                                · {roomAssignmentClass.time}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span>
                                  Student:{' '}
                                  <span className="font-medium text-foreground">
                                    {roomAssignmentClass.student}
                                  </span>
                                </span>

                                <span>
                                  Instructor:{' '}
                                  <span className="font-medium text-foreground">
                                    {roomAssignmentClass.instructor}
                                  </span>
                                </span>
                              </div>
                            </div>

                            <Badge>
                              Enrolled Class
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <div className="mb-3">
                            <p className="font-semibold">
                              Available Rooms
                            </p>

                            <p className="text-sm text-muted-foreground">
                              Rooms already occupied during this class
                              schedule are automatically removed.
                            </p>
                          </div>

                          {availableRooms.length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {availableRooms.map((room) => {
                                const selected =
                                  selectedRoomId === room.id;

                                return (
                                  <button
                                    key={room.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedRoomId(room.id)
                                    }
                                    className={`rounded-xl border p-4 text-left transition ${
                                      selected
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'hover:bg-muted/50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <DoorOpenIcon className="h-5 w-5 text-primary" />

                                          <p className="font-semibold">
                                            {room.name}
                                          </p>
                                        </div>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                          {room.type}
                                        </p>
                                      </div>

                                      {selected && (
                                        <CheckCircle2Icon className="h-5 w-5 text-primary" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed p-6 text-center">
                              <AlertCircleIcon className="mx-auto h-6 w-6 text-muted-foreground" />

                              <p className="mt-2 font-semibold">
                                No Available Rooms
                              </p>

                              <p className="mt-1 text-sm text-muted-foreground">
                                All rooms are occupied during this
                                schedule.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Room Conflicts
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              {roomConflicts.length
                                ? `${roomConflicts.length} conflict${
                                    roomConflicts.length > 1
                                      ? 's'
                                      : ''
                                  }`
                                : 'No conflicts'}
                            </p>
                          </div>

                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Instructor
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              {instructorConflicts.length
                                ? 'Already scheduled'
                                : 'Available'}
                            </p>
                          </div>

                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Enrolled Student
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              {studentConflicts.length
                                ? 'Already scheduled'
                                : 'Available'}
                            </p>
                          </div>
                        </div>

                        {roomAssignmentMessage && (
                          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                            {roomAssignmentMessage}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            disabled={!selectedRoomId}
                            onClick={assignRoom}
                          >
                            <CheckCircle2Icon className="mr-2 h-4 w-4" />
                            Confirm Room Assignment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {ongoingSchedules.length > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        <Clock3Icon className="mt-0.5 h-5 w-5 text-primary" />

                        <div>
                          <p className="font-semibold">
                            Ongoing Class
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {ongoingSchedules
                              .map(
                                (item) =>
                                  `${item.course} · ${item.student} · ${getRoomForSchedule(
                                    item,
                                  ) || 'Room Unassigned'}`,
                              )
                              .join(' • ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {todaySchedules.length ? (
                      todaySchedules.map((item) => {
                        const start =
                          getScheduleStartMinutes(item.time);
                        const currentMinutes =
                          getCurrentMinutes();

                        const isUpcoming =
                          start !== null &&
                          start > currentMinutes &&
                          item.enrolled;

                        return (
                          <ScheduleRow
                            key={item.id}
                            item={{
                              ...item,
                              room: getRoomForSchedule(item),
                            }}
                            onReschedule={
                              openCenterReschedule
                            }
                            onAssignRoom={openRoomAssignment}
                            canAssignRoom={isUpcoming}
                          />
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No classes scheduled for today.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'weekly' && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {weekDates.map((date) => {
                        const dateKey = formatDateKey(date);
                        const active = selectedDay === dateKey;

                        return (
                          <Button
                            key={dateKey}
                            variant={
                              active ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() =>
                              setSelectedDay(dateKey)
                            }
                          >
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
                            })}
                          </Button>
                        );
                      })}
                    </div>

                    <div className="relative w-full lg:w-72">
                      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        type="text"
                        value={weeklySearch}
                        onChange={(event) =>
                          setWeeklySearch(event.target.value)
                        }
                        placeholder="Search schedule..."
                        className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {weeklySchedules.length ? (
                      weeklySchedules.map((item) => (
                        <ScheduleRow
                          key={item.id}
                          item={{
                            ...item,
                            room: getRoomForSchedule(item),
                          }}
                          onReschedule={openCenterReschedule}
                          onAssignRoom={openRoomAssignment}
                          canAssignRoom={false}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No schedules found for this day.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Re-Schedule</CardTitle>

              <CardDescription>
                Manage participant requests and music center initiated
                schedule changes.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {!selectedRequest && (
                <>
                  <div className="grid gap-4">
                    {rescheduleRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">
                              {request.course}
                            </p>

                            <Badge variant="secondary">
                              Reschedule Request
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {request.reason}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <UserIcon className="h-4 w-4" />
                              {request.student}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <UsersIcon className="h-4 w-4" />
                              {request.instructor}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDaysIcon className="h-4 w-4" />
                              Requested{' '}
                              {formatFullDate(
                                request.requestedAt,
                              )}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() =>
                            openNormalReschedule(request)
                          }
                        >
                          Manage Request
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-dashed p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold">
                          Music Center Reschedule
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Use this when a class must be rescheduled because
                          of a calamity, event, closure, or another music
                          center schedule change.
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => {
                          const firstClass = todaySchedules[0];

                          if (firstClass) {
                            openCenterReschedule(firstClass);
                          }
                        }}
                      >
                        <RefreshCwIcon className="mr-2 h-4 w-4" />
                        Re-Sched Class
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {selectedRequest && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">
                          {selectedRequest.course}
                        </p>

                        <Badge>
                          {centerReschedule
                            ? 'Music Center Request'
                            : 'Participant Request'}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedRequest.reason}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Student
                          </p>

                          <p className="text-sm font-medium">
                            {selectedRequest.student}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Instructor
                          </p>

                          <p className="text-sm font-medium">
                            {selectedRequest.instructor}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Current Schedule
                          </p>

                          <p className="text-sm font-medium">
                            {formatShortDate(
                              selectedRequest.currentDate,
                            )}{' '}
                            · {selectedRequest.currentTime}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Request Date
                          </p>

                          <p className="text-sm font-medium">
                            {formatFullDate(
                              selectedRequest.requestedAt,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={resetReschedule}
                    >
                      Close
                    </Button>
                  </div>

                  {centerReschedule && !generated && (
                    <div className="rounded-xl border bg-background p-5">
                      <div className="mb-4">
                        <p className="font-semibold">
                          Select Affected Class
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Select the class affected by the calamity, event,
                          closure, or music center schedule change.
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium">
                              {selectedRequest.course}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {selectedRequest.student} ·{' '}
                              {selectedRequest.instructor}
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatFullDate(
                                selectedRequest.currentDate,
                              )}{' '}
                              · {selectedRequest.currentTime} ·{' '}
                              {selectedRequest.currentRoom}
                            </p>
                          </div>

                          <Badge variant="secondary">
                            Selected
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {!generated && (
                    <div className="rounded-xl border p-5">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold">
                            Generate Available Schedules
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Available schedules will be generated from the
                            reschedule request date through the next 7
                            calendar days.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedRequestWindow.map(
                              (date, index) => (
                                <Badge
                                  key={formatDateKey(date)}
                                  variant="outline"
                                >
                                  Day {index + 1}:{' '}
                                  {formatShortDate(date)}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>

                        <Button onClick={generateSchedules}>
                          <CalendarDaysIcon className="mr-2 h-4 w-4" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  )}

                  {generated && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <CardTitle>
                                Generated Schedule Options
                              </CardTitle>

                              <CardDescription>
                                These schedules were generated within the
                                7-day reschedule window and checked for
                                conflicts.
                              </CardDescription>
                            </div>

                            {!submittedOptions && (
                              <Button
                                onClick={
                                  submitGeneratedSchedules
                                }
                              >
                                <SendIcon className="mr-2 h-4 w-4" />
                                Submit Options
                              </Button>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {generatedSchedules.map((option) => (
                              <div
                                key={option.id}
                                className="rounded-xl border p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold">
                                      {formatFullDate(
                                        option.date,
                                      )}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {option.time}
                                    </p>
                                  </div>

                                  <DoorOpenIcon className="h-5 w-5 text-muted-foreground" />
                                </div>

                                <div className="mt-3 text-sm text-muted-foreground">
                                  {option.room}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {submittedOptions && (
                        <>
                          <Card>
                            <CardHeader>
                              <CardTitle>
                                Instructor Choices
                              </CardTitle>

                              <CardDescription>
                                The instructor can freely choose multiple
                                generated schedules.
                              </CardDescription>
                            </CardHeader>

                            <CardContent>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {generatedSchedules.map((option) => {
                                  const selected =
                                    instructorChoices.includes(
                                      option.id,
                                    );

                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() =>
                                        toggleInstructorChoice(
                                          option.id,
                                        )
                                      }
                                      className={`rounded-xl border p-4 text-left transition ${
                                        selected
                                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                          : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-medium">
                                            {formatFullDate(
                                              option.date,
                                            )}
                                          </p>

                                          <p className="mt-1 text-sm text-muted-foreground">
                                            {option.time}
                                          </p>
                                        </div>

                                        {selected && (
                                          <CheckCircle2Icon className="h-5 w-5 text-primary" />
                                        )}
                                      </div>

                                      <p className="mt-3 text-sm text-muted-foreground">
                                        {option.room}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>
                                Student Choices
                              </CardTitle>

                              <CardDescription>
                                The student can freely choose multiple
                                generated schedules.
                              </CardDescription>
                            </CardHeader>

                            <CardContent>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {generatedSchedules.map((option) => {
                                  const selected =
                                    studentChoices.includes(
                                      option.id,
                                    );

                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() =>
                                        toggleStudentChoice(
                                          option.id,
                                        )
                                      }
                                      className={`rounded-xl border p-4 text-left transition ${
                                        selected
                                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                          : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-medium">
                                            {formatFullDate(
                                              option.date,
                                            )}
                                          </p>

                                          <p className="mt-1 text-sm text-muted-foreground">
                                            {option.time}
                                          </p>
                                        </div>

                                        {selected && (
                                          <CheckCircle2Icon className="h-5 w-5 text-primary" />
                                        )}
                                      </div>

                                      <p className="mt-3 text-sm text-muted-foreground">
                                        {option.room}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>
                                Matching Schedules
                              </CardTitle>

                              <CardDescription>
                                Every schedule selected by both the
                                instructor and student is shown here.
                                Select exactly one for confirmation.
                              </CardDescription>
                            </CardHeader>

                            <CardContent>
                              {matchingSchedules.length > 0 ? (
                                <div className="space-y-3">
                                  {matchingSchedules.map((option) => {
                                    const selected =
                                      finalSchedule?.id ===
                                      option.id;

                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() =>
                                          setFinalSchedule(option)
                                        }
                                        className={`w-full rounded-xl border p-5 text-left transition ${
                                          selected
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/50'
                                        }`}
                                      >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <CalendarDaysIcon className="h-5 w-5 text-primary" />

                                              <p className="font-semibold">
                                                {formatFullDate(
                                                  option.date,
                                                )}
                                              </p>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                              <span className="inline-flex items-center gap-1.5">
                                                <Clock3Icon className="h-4 w-4" />
                                                {option.time}
                                              </span>

                                              <span className="inline-flex items-center gap-1.5">
                                                <DoorOpenIcon className="h-4 w-4" />
                                                {option.room}
                                              </span>
                                            </div>
                                          </div>

                                          {selected && (
                                            <Badge>
                                              Selected
                                            </Badge>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}

                                  <div className="flex justify-end pt-3">
                                    <Button
                                      disabled={!finalSchedule}
                                      onClick={submitFinalSchedule}
                                    >
                                      <CheckCircle2Icon className="mr-2 h-4 w-4" />
                                      Confirm Final Schedule
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed p-6">
                                  <div className="flex flex-col gap-4">
                                    <div className="flex items-start gap-3">
                                      <BellIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />

                                      <div>
                                        <p className="font-semibold">
                                          No Matching Schedules
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                          The instructor and student
                                          currently have no common
                                          schedule from their selected
                                          options. The reschedule process
                                          will remain active. They can
                                          change their choices from the
                                          generated schedules and try again.
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <Button
                                        variant="outline"
                                        onClick={
                                          notifyParticipants
                                        }
                                      >
                                        <BellIcon className="mr-2 h-4 w-4" />
                                        Notify Them
                                      </Button>
                                    </div>

                                    {noMatchNotificationSent && (
                                      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                                        Notification sent to the
                                        instructor and student. The
                                        reschedule process remains active
                                        until a matching schedule is
                                        selected and confirmed.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {confirmedSchedule && (
                            <Card className="border-primary/30 bg-primary/5">
                              <CardContent className="p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex items-start gap-3">
                                    <CheckCircle2Icon className="mt-0.5 h-6 w-6 text-primary" />

                                    <div>
                                      <p className="font-semibold">
                                        Schedule Confirmed
                                      </p>

                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {formatFullDate(
                                          confirmedSchedule.date,
                                        )}{' '}
                                        ·{' '}
                                        {confirmedSchedule.time} ·{' '}
                                        {confirmedSchedule.room}
                                      </p>

                                      <p className="mt-1 text-sm text-muted-foreground">
                                        The instructor and student will be
                                        notified of the final schedule.
                                      </p>
                                    </div>
                                  </div>

                                  <Button
                                    variant="outline"
                                    onClick={resetReschedule}
                                  >
                                    Done
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}