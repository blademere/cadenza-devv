"use client";

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
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

import { enrollmentService } from '@/services/front-desk/enrollmentService';
import { getRooms } from '@/services/admin/roomsService';
import { getHoursForDate, getOperatingHours } from '@/services/operatingHoursService';
import { apiClient } from '@/core/api/apiClient';

const getDateAfterDays = (days, baseDate = new Date()) => {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const formatDateKey = (date) => {
  const value = new Date(date);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getManilaWeekday = (date) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  weekday: 'long',
}).format(new Date(date));

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

const getNextSameWeekdayDate = (date) => {
  const value = new Date(`${date}T00:00:00+08:00`);
  value.setDate(value.getDate() + 7);
  return formatDateKey(value);
};

const getSameWeekdayDates = (date, count = 7) => {
  const start = new Date(`${date}T00:00:00+08:00`);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + ((index + 1) * 7));
    return value;
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

  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type === 'hour' || part.type === 'minute').map((part) => [part.type, Number(part.value)]));
  return values.hour * 60 + values.minute;
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

const fallbackSchedule = [
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

const buildGeneratedSchedules = (request) => {
  const requestDate = new Date(request.rescheduleFromDate || request.requestedAt);
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
    const date = request.rescheduleToDate
      ? new Date(`${request.rescheduleToDate}T00:00:00+08:00`)
      : windowDates[option.dayOffset];
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
            {item.room ? 'Change Room' : 'Assign Room'}
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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const processMode = location.pathname.includes('/manage-request')
    ? 'manage-request'
    : location.pathname.endsWith('/emergency')
      ? 'emergency'
      : 'schedule';
  const processTitle = processMode === 'manage-request'
    ? 'Manage Reschedule Request'
    : processMode === 'emergency'
      ? 'Emergency Center Reschedule'
      : 'Class Schedule';
  const processDescription = processMode === 'manage-request'
    ? 'Review generated schedules, matching preferences, and required approvals.'
    : processMode === 'emergency'
      ? 'Select a closure date and reschedule affected enrolled classes.'
      : 'View today and weekly classes, assigned rooms, instructors, and students.';
  const [schedule, setSchedule] = useState([]);
  const [lessonRooms, setLessonRooms] = useState([]);
  const [roomBookings, setRoomBookings] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [operatingHours, setOperatingHours] = useState(null);
  const [operatingHoursError, setOperatingHoursError] = useState('');
  const [activeTab, setActiveTab] = useState('today');
  const [currentDayKey, setCurrentDayKey] = useState(() => formatDateKey(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDayKey(formatDateKey(new Date())), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const [selectedDay, setSelectedDay] = useState(formatDateKey(today));
  const [weeklySearch, setWeeklySearch] = useState('');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  const [generatedSchedules, setGeneratedSchedules] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [submittedOptions, setSubmittedOptions] = useState(false);
  const [submitOptionsError, setSubmitOptionsError] = useState('');
  const [submittingOptions, setSubmittingOptions] = useState(false);

  const [instructorChoices, setInstructorChoices] = useState([]);

  const [finalSchedule, setFinalSchedule] = useState(null);
  const [confirmedSchedule, setConfirmedSchedule] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingReschedule, setRejectingReschedule] = useState(false);
  const [emergencySaving, setEmergencySaving] = useState(false);
  const [emergencySaveError, setEmergencySaveError] = useState('');

  useEffect(() => {
    [scheduleError, operatingHoursError, submitOptionsError, emergencySaveError]
      .filter(Boolean)
      .forEach((message) => toast.error(message));
  }, [scheduleError, operatingHoursError, submitOptionsError, emergencySaveError]);
  const [studentApproved, setStudentApproved] = useState(false);
  const [instructorApproved, setInstructorApproved] = useState(false);

  const [noMatchNotificationSent, setNoMatchNotificationSent] =
    useState(false);

  const [centerRescheduleState, setCenterReschedule] = useState(false);
  const centerReschedule = centerRescheduleState && processMode === 'emergency';
  const [centerStartMessage, setCenterStartMessage] = useState('');
  const [emergencyDate, setEmergencyDate] = useState(() => formatDateKey(today));
  const [emergencyTargetDate, setEmergencyTargetDate] = useState('');

  const [assignedRooms, setAssignedRooms] = useState({});

  const [roomAssignmentClass, setRoomAssignmentClass] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [assigningRoom, setAssigningRoom] = useState(false);
  const [roomChangeReason, setRoomChangeReason] = useState('');
  const [roomAssignmentMessage, setRoomAssignmentMessage] =
    useState('');

  const weekDates = useMemo(() => getWeekDates(today), []);

  useEffect(() => {
    let active = true;
    const loadSchedule = async () => {
      try {
        setScheduleLoading(true);
        setScheduleError('');
        const [enrollmentPage, roomsResponse, bookingsResponse] = await Promise.all([
          enrollmentService.getEnrollments({ page: 1, limit: 100 }),
          getRooms(),
          apiClient.get('/room-bookings'),
        ]);
        const databaseRooms = Array.isArray(roomsResponse) ? roomsResponse : [];
        const bookings = bookingsResponse?.data?.data ?? bookingsResponse?.data ?? [];
        if (active) {
          setLessonRooms(databaseRooms.filter((room) => room.roomType === 'LESSON_ROOM' && room.status === 'AVAILABLE' && room.resource?.status === 'ACTIVE'));
          setRoomBookings(Array.isArray(bookings) ? bookings : []);
        }
        const enrollments = [...(enrollmentPage.items || [])];
        let page = enrollmentPage.pagination?.page || 1;
        const totalPages = enrollmentPage.pagination?.pages || page;

        while (page < totalPages) {
          page += 1;
          const nextPage = await enrollmentService.getEnrollments({
            page,
            limit: 100,
          });
          enrollments.push(...(nextPage.items || []));
        }
        const roomById = new Map(databaseRooms.map((room) => [room.id, room.roomName || room.resource?.name || room.roomType]));
        const items = (enrollments || []).flatMap((enrollment) => (enrollment.sessions || []).map((session) => {
          const start = new Date(session.scheduledStart);
          const end = new Date(session.scheduledEnd);
          return {
            id: session.id,
            roomId: session.roomId,
            courseId: enrollment.courseId,
            studentId: enrollment.customerId,
            instructorId: session.instructorId,
            date: formatDateKey(start),
            scheduledStart: session.scheduledStart,
            scheduledEnd: session.scheduledEnd,
            time: `${start.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}`,
            weekday: getManilaWeekday(start),
            course: enrollment.lessons?.[0]?.name || enrollment.packageName || 'Lesson',
            student: enrollment.student || 'Unassigned',
            instructor: session.instructorName || 'Unassigned',
            room: roomById.get(session.roomId) || null,
            status: session.status || 'UPCOMING',
            enrolled: true,
          };
        }));
        if (active) setSchedule(items);
      } catch (error) {
        if (active) {
          setSchedule([]);
          setLessonRooms([]);
          setRoomBookings([]);
          setScheduleError(error?.response?.data?.message || error.message || 'Unable to load class schedule.');
        }
      } finally {
        if (active) setScheduleLoading(false);
      }
    };
    loadSchedule();
    const refreshTimer = window.setInterval(loadSchedule, 15000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    getOperatingHours()
      .then((config) => { if (active) setOperatingHours(config); })
      .catch((error) => {
        if (active) setOperatingHoursError(error?.response?.data?.message || 'Unable to load operating hours.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadRescheduleRequests = () => apiClient.get('/enrollments/reschedule-requests')
      .then((response) => {
        if (active) {
          const requests = Array.isArray(response?.data) ? response.data : [];
          setRescheduleRequests(requests);
          setSelectedRequest((current) => {
            if (!current) return current;
            return requests.find((request) => request.id === current.id) || current;
          });
        }
      })
      .catch(() => { if (active) setRescheduleRequests([]); });
    loadRescheduleRequests();
    const refreshTimer = window.setInterval(loadRescheduleRequests, 15000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  const todayKey = currentDayKey;


  const emergencySchedules = useMemo(
    () => schedule.filter((item) => item.date === emergencyDate),
    [schedule, emergencyDate],
  );
  const emergencyHours = useMemo(
    () => getHoursForDate(operatingHours, emergencyDate),
    [operatingHours, emergencyDate],
  );
  const customizedOperatingDates = useMemo(
    () => Object.entries(operatingHours?.dateOverrides || {}).sort(([first], [second]) => first.localeCompare(second)),
    [operatingHours],
  );

  const todaySchedules = useMemo(() => {
    return schedule.filter((item) => item.date === todayKey).sort((first, second) => new Date(first.scheduledStart) - new Date(second.scheduledStart));
  }, [schedule, todayKey]);

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

        return start > currentMinutes && start - currentMinutes <= 10 && item.enrolled && !['CANCELLED', 'COMPLETED', 'REJECTED'].includes(String(item.status).toUpperCase());
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
    }).sort((first, second) => new Date(first.scheduledStart) - new Date(second.scheduledStart));
  }, [schedule, selectedDay, weeklySearch]);

  const matchingSchedules = useMemo(() => {
    const options = selectedRequest?.generatedOptions?.length
      ? selectedRequest.generatedOptions
      : generatedSchedules;
    const studentIds = new Set(
      selectedRequest?.studentChoice ? [selectedRequest.studentChoice] : [],
    );
    return options.filter(
      (option) => studentIds.has(option.id),
    );
  }, [generatedSchedules, selectedRequest]);

  const selectedRequestWindow = useMemo(() => {
    if (!selectedRequest) {
      return [];
    }

    if (centerReschedule && selectedRequest.rescheduleFromDate) {
      return getSameWeekdayDates(selectedRequest.rescheduleFromDate);
    }
    return getRescheduleWindow(selectedRequest.requestedAt);
  }, [selectedRequest, centerReschedule]);

  const roomConflicts = useMemo(() => {
    if (!roomAssignmentClass) return [];
    return todaySchedules.filter((item) =>
      item.id !== roomAssignmentClass.id &&
      item.roomId === selectedRoomId &&
      !['CANCELLED', 'REJECTED'].includes(String(item.status).toUpperCase()) &&
      isScheduleConflict(item, roomAssignmentClass),
    );
  }, [roomAssignmentClass, selectedRoomId, todaySchedules]);

  const instructorConflicts = useMemo(() => {
    if (!roomAssignmentClass || roomAssignmentClass.instructor === 'Unassigned') return [];
    return todaySchedules.filter((item) =>
      item.id !== roomAssignmentClass.id &&
      (roomAssignmentClass.instructorId ? item.instructorId === roomAssignmentClass.instructorId : item.instructor === roomAssignmentClass.instructor) &&
      !['CANCELLED', 'REJECTED'].includes(String(item.status).toUpperCase()) &&
      isScheduleConflict(item, roomAssignmentClass),
    );
  }, [roomAssignmentClass, todaySchedules]);

  const studentConflicts = useMemo(() => {
    if (!roomAssignmentClass) return [];
    return todaySchedules.filter((item) =>
      item.id !== roomAssignmentClass.id &&
      (roomAssignmentClass.studentId ? item.studentId === roomAssignmentClass.studentId : item.student === roomAssignmentClass.student) &&
      !['CANCELLED', 'REJECTED'].includes(String(item.status).toUpperCase()) &&
      isScheduleConflict(item, roomAssignmentClass),
    );
  }, [roomAssignmentClass, todaySchedules]);

  const availableRooms = useMemo(() => {
    if (!roomAssignmentClass) return [];

    const occupiedRoomIds = new Set(todaySchedules.filter((item) =>
      item.id !== roomAssignmentClass.id &&
      item.roomId &&
      !['CANCELLED', 'REJECTED'].includes(String(item.status).toUpperCase()) &&
      isScheduleConflict(item, roomAssignmentClass),
    ).map((item) => item.roomId));
    const targetStart = roomAssignmentClass.scheduledStart;
    const targetEnd = roomAssignmentClass.scheduledEnd;

    for (const booking of roomBookings) {
      if (
        booking.roomId &&
        !['CANCELLED', 'REJECTED'].includes(String(booking.status).toUpperCase()) &&
        new Date(booking.scheduledStart) < new Date(targetEnd) &&
        new Date(booking.scheduledEnd) > new Date(targetStart)
      ) {
        occupiedRoomIds.add(booking.roomId);
      }
    }

    return lessonRooms.filter((room) =>
      (room.id === roomAssignmentClass.roomId || !occupiedRoomIds.has(room.id)) &&
      (!roomAssignmentClass.courseId ||
        (Array.isArray(room.courseIds) && room.courseIds.includes(roomAssignmentClass.courseId))),
    ).map((room) => ({
      id: room.id,
      name: room.roomName || room.resource?.name || room.roomType,
      type: 'Lesson Room',
    }));
  }, [roomAssignmentClass, roomConflicts, roomBookings, lessonRooms]);

  const openRoomAssignment = (classItem) => {
    setRoomAssignmentClass(classItem);
    setSelectedRoomId(classItem.roomId || null);
    setRoomChangeReason('');
    setRoomAssignmentMessage('');
  };

  const closeRoomAssignment = () => {
    setRoomAssignmentClass(null);
    setSelectedRoomId(null);
    setRoomChangeReason('');
    setRoomAssignmentMessage('');
  };

  const assignRoom = async () => {
    if (!roomAssignmentClass || !selectedRoomId || assigningRoom) return;
    if (selectedRoomId === roomAssignmentClass.roomId) return;
    if (roomAssignmentClass.roomId && (roomChangeReason.trim().length < 3 || roomChangeReason.trim().length > 500)) {
      setRoomAssignmentMessage('Please provide a room change reason (3–500 characters).');
      return;
    }
    const selectedRoom = availableRooms.find((room) => room.id === selectedRoomId);
    if (!selectedRoom) {
      setRoomAssignmentMessage('This lesson room is no longer available for the selected class.');
      return;
    }
    if (instructorConflicts.length) {
      setRoomAssignmentMessage(`${roomAssignmentClass.instructor} already has another enrolled class during this time.`);
      return;
    }
    if (studentConflicts.length) {
      setRoomAssignmentMessage(`${roomAssignmentClass.student} is already enrolled in another class during this time.`);
      return;
    }

    setAssigningRoom(true);
    try {
      await apiClient.patch(
        `/enrollments/sessions/${roomAssignmentClass.id}/room`,
        { roomId: selectedRoom.id, ...(roomAssignmentClass.roomId ? { reason: roomChangeReason.trim() } : {}) },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      setAssignedRooms((current) => ({
        ...current,
        [roomAssignmentClass.id]: { roomId: selectedRoom.id, roomName: selectedRoom.name },
      }));
      setSchedule((current) => current.map((item) =>
        item.id === roomAssignmentClass.id
          ? { ...item, roomId: selectedRoom.id, room: selectedRoom.name }
          : item,
      ));
      setRoomAssignmentClass((current) => current && current.id === roomAssignmentClass.id
        ? { ...current, roomId: selectedRoom.id, room: selectedRoom.name }
        : current,
      );
      closeRoomAssignment();
      toast.success(`${selectedRoom.name} has been ${roomAssignmentClass.roomId ? 'updated' : 'assigned'} successfully.`);
    } catch (error) {
      setRoomAssignmentMessage(error?.response?.data?.message || 'Unable to save the room assignment.');
    } finally {
      setAssigningRoom(false);
    }
  };

  const getRoomForSchedule = (item) => {
    return assignedRooms[item.id]?.roomName ?? item.room;
  };

  const openNormalReschedule = (request) => {
    if (processMode !== 'manage-request') {
      navigate(`/front-desk/schedule/manage-request?requestId=${encodeURIComponent(request.id)}`);
    }
    setCenterReschedule(false);
    setSelectedRequest(request);
    setSelectedClass(null);
    const savedOptions = request.generatedOptions || [];
    setGenerated(savedOptions.length > 0);
    setSubmittedOptions(savedOptions.length > 0 || request.workflowStatus === 'AWAITING_PARTICIPANT_CHOICES' || request.workflowStatus === 'AWAITING_TWO_APPROVALS');
    setGeneratedSchedules(savedOptions);
    setInstructorChoices(request.instructorChoices || []);
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setStudentApproved(false);
    setInstructorApproved(false);
    setNoMatchNotificationSent(false);
  };

  const openCenterReschedule = (classItem) => {
    if (!classItem) {
      setCenterStartMessage('No class schedule is available for today. Select another date or refresh the schedule after the class data loads.');
      return;
    }
    setCenterStartMessage('');
    const request = {
      id: `center-${classItem.id}`,
      classId: classItem.id,
      reason: `Center emergency or closure on ${formatFullDate(classItem.date)}.`,
      requestedBy: 'Music Center',
      requestedAt: formatDateKey(today),
      rescheduleFromDate: classItem.date,
      rescheduleToDate: emergencyTargetDate || getNextSameWeekdayDate(classItem.date),
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
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setStudentApproved(false);
    setInstructorApproved(false);
    setNoMatchNotificationSent(false);
  };

  const openEmergencyReschedule = () => {
    setCenterStartMessage('');
    const affectedClass = emergencySchedules[0];
    if (!affectedClass) {
      const message = `No enrolled class was found for ${formatFullDate(emergencyDate)}. The closure alert is ready, but a class is required before replacement schedules can be generated.`;
      setCenterStartMessage(message);
      window.setTimeout(() => setCenterStartMessage(''), 3000);
      return;
    }
    openCenterReschedule(affectedClass);
  };

  const generateSchedules = () => {
    if (!selectedRequest || submittedOptions || selectedRequest.generatedOptions?.length) {
      return;
    }

    const options = buildGeneratedSchedules(selectedRequest);

    setGeneratedSchedules(options);
    if (centerReschedule) setFinalSchedule(options[0] || null);
    setGenerated(true);
    setSubmittedOptions(false);
    setInstructorChoices([]);
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setNoMatchNotificationSent(false);
  };

  const submitGeneratedSchedules = async () => {
    if (!generatedSchedules.length) {
      return;
    }
    if (!selectedRequest || submittingOptions) return;
    setSubmittingOptions(true);
    setSubmitOptionsError('');
    try {
      await apiClient.post(`/enrollments/${selectedRequest.id}/submit-options`, { options: generatedSchedules });
      setSubmittedOptions(true);
      setInstructorChoices([]);
      toast.success('Replacement schedule options submitted successfully.');
    } catch (error) {
      setSubmitOptionsError(error?.message || 'Unable to submit replacement schedule options.');
    } finally {
      setSubmittingOptions(false);
    }
  };

  const toggleInstructorChoice = (id) => {
    setInstructorChoices((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

    setFinalSchedule(null);
    setStudentApproved(false);
    setInstructorApproved(false);
    setNoMatchNotificationSent(false);
  };

  const submitFinalSchedule = async (scheduleOverride = null) => {
    const scheduleToSave = scheduleOverride?.id ? scheduleOverride : finalSchedule;
    if (!scheduleToSave) {
      return;
    }

    if (centerReschedule) {
      setEmergencySaving(true);
      setEmergencySaveError('');
      const parsed = parseTime(scheduleToSave.time);
      const date = scheduleToSave.date;
      const toIso = (minutes) => {
        const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mins = String(minutes % 60).padStart(2, '0');
        return `${date}T${hours}:${mins}:00+08:00`;
      };
      try {
        await apiClient.post('/enrollments/emergency-reschedule', {
          sessionIds: emergencySchedules.map((item) => item.id),
          targetStart: toIso(parsed.start),
          targetEnd: toIso(parsed.end),
        });
      } catch (error) {
        setEmergencySaveError(error?.response?.data?.message || error.message || 'Unable to update the emergency schedule.');
        setEmergencySaving(false);
        return;
      }
      setEmergencySaving(false);
      toast.success('Emergency schedule updated successfully.');
    } else {
      try {
        await apiClient.post(`/enrollments/${selectedRequest.id}/confirm-reschedule`, { option: scheduleToSave });
        toast.success('Class schedule confirmed successfully.');
      } catch (error) {
        setSubmitOptionsError(error?.message || 'Unable to confirm the matching schedule.');
        return;
      }
    }
    setConfirmedSchedule(scheduleToSave);
    navigate('/front-desk/schedule');
  };

  const rejectSelectedReschedule = async () => {
    const reason = rejectionReason.trim();
    if (reason.length < 3) {
      toast.error('Enter a rejection reason before rejecting this request.');
      return;
    }
    setRejectingReschedule(true);
    try {
      await apiClient.post(`/enrollments/${selectedRequest.id}/reject-reschedule`, { reason });
      toast.success('Reschedule request rejected.');
      resetReschedule();
      navigate('/front-desk/schedule');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to reject the reschedule request.');
    } finally {
      setRejectingReschedule(false);
    }
  };

  const resetReschedule = () => {
    setSelectedRequest(null);
    setSelectedClass(null);
    setGeneratedSchedules([]);
    setGenerated(false);
    setSubmittedOptions(false);
    setInstructorChoices([]);
    setFinalSchedule(null);
    setConfirmedSchedule(null);
    setRejectionReason('');
    setStudentApproved(false);
    setInstructorApproved(false);
    setNoMatchNotificationSent(false);
    setCenterReschedule(false);
    setCenterStartMessage('');
  };

  useEffect(() => {
    if (processMode === 'manage-request' && centerReschedule) {
      setCenterReschedule(false);
    }
    if (selectedRequest) return;
    if (processMode === 'manage-request') {
      const requestId = searchParams.get('requestId');
      const request = requestId ? rescheduleRequests.find((item) => item.id === requestId) : null;
      if (request) openNormalReschedule(request);
    }
    if (processMode === 'emergency' && emergencySchedules[0]) {
      openCenterReschedule(emergencySchedules[0]);
    }
  }, [processMode, searchParams, selectedRequest, emergencySchedules]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          {processMode === 'schedule' && !centerReschedule && <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>{processTitle}</CardTitle>

                  <CardDescription>
                    {processDescription}
                  </CardDescription>
                </div>

                {processMode !== 'schedule' && <Button
                  variant="outline"
                  onClick={() => navigate('/front-desk/schedule')}
                >
                  Back to Class Schedule
                </Button>}
                {processMode === 'schedule' && <Button
                  onClick={() => {
                    setActiveTab('today');
                    openEmergencyReschedule();
                  }}
                >
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                  Re-Sched
                </Button>}
              </div>
            </CardHeader>

            <CardContent>
              {centerStartMessage && (
                <div role="alert" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {centerStartMessage}
                </div>
              )}
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
                              Enrollment rooms are assigned automatically.
                              Change a room only when an adjustment is necessary.
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
                              {roomAssignmentClass.roomId ? 'Change Room' : 'Assign Room'}
                            </CardTitle>

                            <CardDescription>
                              {roomAssignmentClass.roomId ? 'Change the assigned room for ' : 'Select a room for '}
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
                          {roomAssignmentClass.room && (
                            <p className="mb-3 text-sm font-medium">Assigned Room: {roomAssignmentClass.room}</p>
                          )}
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

                        {roomAssignmentClass.roomId && (
                          <div className="space-y-2">
                            <label htmlFor="room-change-reason" className="text-sm font-medium">Reason for changing the assigned room</label>
                            <textarea id="room-change-reason" value={roomChangeReason} onChange={(event) => setRoomChangeReason(event.target.value)} maxLength={500} rows={2} className="w-full rounded-lg border bg-background p-3 text-sm" placeholder="Enter the reason for changing the assigned room" />
                          </div>
                        )}
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
                            disabled={!selectedRoomId || assigningRoom || selectedRoomId === roomAssignmentClass.roomId || (roomAssignmentClass.roomId && roomChangeReason.trim().length < 3) || !availableRooms.some((room) => room.id === selectedRoomId)}
                            onClick={assignRoom}
                          >
                            <CheckCircle2Icon className="mr-2 h-4 w-4" />
                            {assigningRoom ? 'Saving Room...' : roomAssignmentClass.roomId ? 'Confirm Room Change' : 'Confirm Room Assignment'}
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
                          item.enrolled &&
                          !['CANCELLED', 'COMPLETED', 'REJECTED'].includes(String(item.status).toUpperCase());

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
          </Card>}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{centerReschedule ? 'Emergency Reschedule' : 'Instructor & Student Schedule Requests'}</CardTitle>
                {!centerReschedule && rescheduleRequests.length > 0 && <Badge variant="destructive">{rescheduleRequests.length} pending</Badge>}
              </div>
              <CardDescription>
                {centerReschedule
                  ? 'Manage the affected class schedules for the Admin-customized date.'
                  : 'Instructor and student schedule requests fetched from the database.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {!selectedRequest && (
                <>
                  <div className="grid gap-4">
                    {rescheduleRequests.length ? rescheduleRequests.map((request) => (
                      <div key={request.id} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{request.course}</p>
                            <Badge variant="secondary">{request.requesterType || 'Schedule'} Request</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{request.reason}</p>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5"><UserIcon className="h-4 w-4" />{request.student}</span>
                            <span className="inline-flex items-center gap-1.5"><UsersIcon className="h-4 w-4" />{request.instructor}</span>
                            <span className="inline-flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4" />Requested {formatFullDate(request.requestedAt)}</span>
                          </div>
                        </div>
                        <Button onClick={() => openNormalReschedule(request)}>Manage Request</Button>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No pending schedule requests from instructors or students.</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold">
                          Emergency Center Reschedule
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Frontdesk can start a center-initiated reschedule
                          for an emergency, closure, event, or other center
                          schedule change.
                        </p>
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                          <div className="space-y-1">
                            <label htmlFor="emergency-reschedule-date" className="text-xs font-medium">Closed / affected date</label>
                            <input
                              id="emergency-reschedule-date"
                              type="date"
                              value={emergencyDate}
                              onChange={(event) => {
                                setEmergencyDate(event.target.value);
                                setEmergencyTargetDate(getNextSameWeekdayDate(event.target.value));
                                setCenterStartMessage('');
                              }}
                              className="block h-9 rounded-md border bg-background px-3 text-sm"
                            />
                          </div>
                          <p className="pb-2 text-sm text-muted-foreground">
                            {emergencySchedules.length} enrolled class{emergencySchedules.length === 1 ? '' : 'es'} affected on this date.
                          </p>
                        </div>
                        {operatingHoursError && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{operatingHoursError}</p>}
                        {!operatingHoursError && customizedOperatingDates.length > 0 && (
                          <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
                            <p className="font-semibold">Admin customized operating dates</p>
                            <p className="mt-1">These dates may require Frontdesk emergency rescheduling because their hours differ from the regular schedule.</p>
                            <div className="mt-2 space-y-1">
                              {customizedOperatingDates.map(([date, override]) => (
                                <div key={date} className="rounded-lg border border-amber-300/70 bg-background/70 p-3">
                                  <button type="button" className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setEmergencyDate(date)}>
                                    {formatFullDate(date)}
                                  </button>
                                  <p className="mt-1">
                                    {override?.isClosed ? 'Closed by Admin.' : `Open ${override?.startTime}–${override?.endTime}; possible schedule conflict.`}
                                  </p>
                                  <div className="mt-2 space-y-1 text-muted-foreground">
                                    {schedule.filter((item) => item.date === date).length > 0 ? schedule.filter((item) => item.date === date).map((item) => (
                                      <p key={item.id}>
                                        {item.time} · {item.course} · {item.student} · {item.instructor}
                                      </p>
                                    )) : <p>No class schedule found for this customized date.</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => openEmergencyReschedule()}
                      >
                        <RefreshCwIcon className="mr-2 h-4 w-4" />
                        Start Emergency Re-Schedule
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
                      onClick={() => {
                        resetReschedule();
                        navigate('/front-desk/schedule', { replace: true });
                      }}
                    >
                      Back
                    </Button>
                  </div>

                  {!centerReschedule && <div className="rounded-xl border bg-background p-5">
                    <p className="font-semibold">Instructor choice</p>
                    {!selectedRequest.instructorChoices?.length && <p className="mt-1 text-sm text-muted-foreground">Waiting for the instructor to submit choices.</p>}
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Selected schedules</p><p className="mt-1 font-medium">{selectedRequest.instructorChoices?.length ? selectedRequest.instructorChoices.map((id) => selectedRequest.generatedOptions?.find((option) => option.id === id)).filter(Boolean).map((option) => `${option.date} · ${option.time}`).join(', ') : 'Not submitted'}</p></div>
                  </div>}

                  {!centerReschedule && !confirmedSchedule && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                      <p className="font-semibold">Review Reschedule Request</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Approve the selected schedule below, or reject this request when the reason is invalid.
                      </p>
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        placeholder="Required only when rejecting"
                        maxLength={500}
                        rows={3}
                        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="destructive"
                          disabled={rejectingReschedule || rejectionReason.trim().length < 3}
                          onClick={rejectSelectedReschedule}
                        >
                          {rejectingReschedule ? 'Rejecting...' : 'Reject Request'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {centerReschedule && !generated && (
                    <div className="rounded-xl border bg-background p-5">
                      <div className="mb-4">
                        <p className="font-semibold">
                          Affected Classes
                        </p>

                        <p className="text-sm text-muted-foreground">
                          All enrolled classes on {formatFullDate(emergencyDate)} are included automatically.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {emergencySchedules.map((classItem) => (
                          <div
                            key={classItem.id}
                            className="w-full rounded-lg border p-4 text-left"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className="font-medium">{classItem.course}</p>
                                <p className="text-sm text-muted-foreground">{classItem.student} · {classItem.instructor}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{formatFullDate(classItem.date)} · {classItem.time} · {getRoomForSchedule(classItem) || 'Room Unassigned'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {!emergencySchedules.length && (
                          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                            <p className="font-semibold">No Affected Schedule</p>
                            <p className="mt-1">No enrolled class schedule was found for {formatFullDate(emergencyDate)}. There are no schedules to reschedule for this date.</p>
                          </div>
                        )}
                      </div>
                      {false && selectedClass && <div className="rounded-lg border bg-muted/30 p-4">
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
                      </div>}
                    </div>
                  )}

                  {selectedRequest && !generated && (
                    <div className="rounded-xl border p-5">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold">
                            Generate Available Schedules
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {centerReschedule
                              ? `Choose a replacement ${new Date(`${selectedRequest.rescheduleFromDate}T00:00:00+08:00`).toLocaleDateString('en-US', { weekday: 'long' })}. Other weekdays are not allowed.`
                              : 'Available schedules will be generated from the reschedule request date through the next 7 calendar days.'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedRequestWindow.map(
                              (date, index) => (
                                <Badge
                                  key={formatDateKey(date)}
                                  variant="outline"
                                >
                                {centerReschedule ? 'Replacement' : `Day ${index + 1}:`}{' '}
                                  {formatShortDate(date)}
                                </Badge>
                              ),
                            )}
                          </div>
                          {centerReschedule && (
                            <div className="mt-4 max-w-xs space-y-2">
                              <label htmlFor="emergency-target-date" className="text-sm font-medium">New schedule date</label>
                              <input
                                id="emergency-target-date"
                                type="date"
                                value={emergencyTargetDate || getNextSameWeekdayDate(emergencyDate)}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  const sourceWeekday = new Date(`${emergencyDate}T00:00:00+08:00`).getDay();
                                  const targetWeekday = new Date(`${value}T00:00:00+08:00`).getDay();
                                  if (sourceWeekday !== targetWeekday) {
                                    setCenterStartMessage(`Choose a ${new Date(`${emergencyDate}T00:00:00+08:00`).toLocaleDateString('en-US', { weekday: 'long' })}. The affected classes must move together to the same weekday.`);
                                    return;
                                  }
                                  setEmergencyTargetDate(value);
                                  setCenterStartMessage('');
                                }}
                                className="block h-9 w-full rounded-md border bg-background px-3 text-sm"
                              />
                              <p className="text-xs text-muted-foreground">All {emergencySchedules.length} affected class{emergencySchedules.length === 1 ? '' : 'es'} will be moved to this date.</p>
                            </div>
                          )}
                        </div>

                        <Button onClick={generateSchedules} disabled={generated || submittedOptions || selectedRequest?.generatedOptions?.length > 0}>
                          <CalendarDaysIcon className="mr-2 h-4 w-4" />
                          {generated || submittedOptions || selectedRequest?.generatedOptions?.length > 0
                            ? 'Schedules Generated'
                            : centerReschedule ? 'Choose New Schedule' : 'Generate'}
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
                              <CardTitle>{centerReschedule ? 'Affected Schedule' : 'Generated Schedule Options'}</CardTitle>

                              <CardDescription>
                                {centerReschedule
                                  ? 'All classes affected by the selected Admin closure or customized date.'
                                  : 'Replacement schedules generated for this reschedule request.'}
                              </CardDescription>
                            </div>

                            {!centerReschedule && !submittedOptions && (
                              <Button
                                onClick={
                                  submitGeneratedSchedules
                                }
                              >
                                <SendIcon className="mr-2 h-4 w-4" />
                                {submittingOptions ? 'Submitting...' : 'Submit Options'}
                              </Button>
                            )}
                            {centerReschedule && (
                              <Button disabled={!emergencySchedules.length || !generatedSchedules.length || emergencySaving} onClick={() => {
                                const schedule = finalSchedule || generatedSchedules[0];
                                setFinalSchedule(schedule);
                                submitFinalSchedule(schedule);
                              }}>
                                <CheckCircle2Icon className="mr-2 h-4 w-4" />
                                {emergencySaving ? 'Updating...' : 'Update Emergency Schedule'}
                              </Button>
                            )}
                          </div>
                          {submitOptionsError && <p role="alert" className="mt-3 text-sm text-destructive">{submitOptionsError}</p>}
                          {emergencySaveError && <p role="alert" className="mt-3 text-sm text-destructive">{emergencySaveError}</p>}
                        </CardHeader>

                        {!centerReschedule && <CardContent>
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
                        </CardContent>}
                      </Card>

                      {false && centerReschedule && (
                        <Card className="border-amber-300">
                          <CardContent className="space-y-3">
                            {generatedSchedules.map((option) => {
                              const selected = finalSchedule?.id === option.id;
                              return (
                                <button key={option.id} type="button" onClick={() => setFinalSchedule(option)} className={`w-full rounded-xl border p-4 text-left transition ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-semibold">{formatFullDate(option.date)}</p>
                                      <p className="mt-1 text-sm text-muted-foreground">{option.time} · {option.room}</p>
                                    </div>
                                    {selected && <CheckCircle2Icon className="size-5 text-primary" />}
                                  </div>
                                </button>
                              );
                            })}
                            <div className="flex justify-end pt-2">
                              <Button disabled={!finalSchedule} onClick={submitFinalSchedule}>
                                <CheckCircle2Icon className="mr-2 size-4" /> Confirm Emergency Reschedule
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {!centerReschedule && submittedOptions && (
                        <>
                          <Card>
                            <CardHeader>
                              <CardTitle>
                                Student Schedule Selection
                              </CardTitle>

                              <CardDescription>
                                The student selected one generated schedule for Front Desk approval.
                              </CardDescription>
                            </CardHeader>

                            <CardContent>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {generatedSchedules.map((option) => {
                                  const selected = selectedRequest?.studentChoice === option.id;

                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      disabled
                                      className={`rounded-xl border p-4 text-left transition ${confirmedSchedule ? 'cursor-not-allowed opacity-70' : ''} ${
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
                                Student Submitted Schedule
                              </CardTitle>

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
                                        disabled={!!confirmedSchedule}
                                        onClick={() =>
                                          setFinalSchedule(option)
                                        }
                                        className={`w-full rounded-xl border p-5 text-left transition ${
                                          confirmedSchedule ? 'cursor-not-allowed opacity-70' : ''
                                        } ${
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

                                  {!confirmedSchedule && <div className="flex justify-end pt-3">
                                    <Button
                                      disabled={!finalSchedule}
                                      onClick={submitFinalSchedule}
                                    >
                                      <CheckCircle2Icon className="mr-2 h-4 w-4" />
                                      Confirm Final Schedule
                                    </Button>
                                  </div>}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed p-6">
                                  <div className="flex flex-col gap-4">
                                    <div className="flex items-start gap-3">
                                      <BellIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />

                                      <div>
                                        <p className="font-semibold">
                                          No Student Schedule Submitted
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                          The student has not submitted a
                                          schedule choice yet. The
                                          reschedule process will remain
                                          active until the student submits
                                          one option.
                                        </p>
                                      </div>
                                    </div>

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
                                        Schedule Updated
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
                                        The updated schedule is now saved for the student and instructor.
                                      </p>
                                      {centerReschedule && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                          {emergencySchedules.length} affected class{emergencySchedules.length === 1 ? '' : 'es'} moved from {formatFullDate(emergencyDate)} to the saved replacement schedule.
                                        </p>
                                      )}
                                    </div>
                                  </div>

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
