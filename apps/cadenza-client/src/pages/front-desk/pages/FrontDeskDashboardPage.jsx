import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  Guitar,
  Loader2,
} from 'lucide-react';

import { apiClient } from '@/core/api/apiClient';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '../components/app-sidebar';
import { SectionCards } from '../components/section-cards';
import { SiteHeader } from '../components/site-header';

const unwrapList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : [];
};

const pending = (status) =>
  [
    'FOR_APPROVAL',
    'PENDING',
    'PENDING_PAYMENT',
    'PENDING_CONFIRMATION',
    'PARTIALLY_PAID',
  ].includes(
    String(status || '')
      .toUpperCase()
      .replace(/[ -]/g, '_'),
  );
const personName = (record) => {
  const person = record.customer?.person;
  return (
    [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
    record.student ||
    'Client'
  );
};
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Recently';
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

const buildRoomTimeline = (room) => {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const bookings = (room.bookings || [])
    .filter((booking) => !['CANCELLED', 'REJECTED'].includes(booking.status))
    .map((booking) => ({
      ...booking,
      start: new Date(booking.scheduledStart),
      end: new Date(booking.scheduledEnd),
    }))
    .filter((booking) => booking.end > dayStart && booking.start < dayEnd)
    .sort((first, second) => first.start - second.start);
  const points = [dayStart, dayEnd];
  bookings.forEach((booking) =>
    points.push(
      new Date(Math.max(booking.start, dayStart)),
      new Date(Math.min(booking.end, dayEnd)),
    ),
  );
  points.sort((first, second) => first - second);
  return points
    .slice(0, -1)
    .map((start, index) => {
      const end = points[index + 1];
      const booking = bookings.find(
        (item) => item.start < end && item.end > start,
      );
      return { start, end, booking };
    })
    .filter((slot) => slot.end > slot.start);
};

const requestGroups = [
  {
    key: 'enrollments',
    label: 'Enrollment',
    path: '/front-desk/enrollments',
    icon: ClipboardList,
  },
  {
    key: 'roomBookings',
    label: 'Room booking',
    path: '/front-desk/room-bookings',
    icon: DoorOpen,
  },
  {
    key: 'rentals',
    label: 'Instrument rental',
    path: '/front-desk/rentals',
    icon: Guitar,
  },
];

export default function FrontDeskDashboardPage() {
  const [records, setRecords] = useState({
    enrollments: [],
    roomBookings: [],
    rentals: [],
    rooms: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomFilter, setRoomFilter] = useState('ALL');

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/enrollments'),
      apiClient.get('/room-bookings'),
      apiClient.get('/instrument-rentals'),
      apiClient.get('/rooms'),
    ])
      .then(([enrollments, roomBookings, rentals, rooms]) => {
        const next = {
          enrollments:
            enrollments.status === 'fulfilled'
              ? unwrapList(enrollments.value)
              : [],
          roomBookings:
            roomBookings.status === 'fulfilled'
              ? unwrapList(roomBookings.value)
              : [],
          rentals:
            rentals.status === 'fulfilled' ? unwrapList(rentals.value) : [],
          rooms: rooms.status === 'fulfilled' ? unwrapList(rooms.value) : [],
        };
        setRecords(next);
        if (
          !Object.values(next).some((items) => items.length) &&
          [enrollments, roomBookings, rentals, rooms].every(
            (result) => result.status === 'rejected',
          )
        ) {
          setLoadError('Unable to load the Front Desk work queue.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const roomAvailability = useMemo(() => {
    const now = new Date();
    return records.rooms.map((room) => {
      const activeBooking = records.roomBookings.find((booking) => {
        if (
          booking.roomId !== room.id ||
          ['CANCELLED', 'REJECTED', 'COMPLETED'].includes(booking.status)
        )
          return false;
        const start = new Date(booking.scheduledStart);
        const end = new Date(booking.scheduledEnd);
        return (
          booking.status === 'CHECKED_IN' ||
          (booking.status === 'APPROVED' && start <= now && end > now)
        );
      });
      return {
        ...room,
        activeBooking,
        inUse: Boolean(activeBooking),
        bookings: records.roomBookings.filter(
          (booking) => booking.roomId === room.id,
        ),
      };
    });
  }, [records]);

  const stats = useMemo(
    () => ({
      enrollments: records.enrollments.filter((item) => pending(item.status))
        .length,
      roomBookings: records.roomBookings.filter((item) => pending(item.status))
        .length,
      rentals: records.rentals.filter((item) => pending(item.status)).length,
      billing: [
        ...records.enrollments,
        ...records.roomBookings,
        ...records.rentals,
      ].filter(
        (item) =>
          item.metadata?.paymentContinuationRequired ||
          item.metadata?.paymentStatus === 'PARTIALLY_PAID',
      ).length,
    }),
    [records],
  );

  const filteredRoomAvailability = useMemo(
    () =>
      roomFilter === 'ALL'
        ? roomAvailability
        : roomAvailability.filter((room) => room.id === roomFilter),
    [roomAvailability, roomFilter],
  );

  const queue = useMemo(
    () =>
      requestGroups
        .flatMap((group) =>
          records[group.key]
            .filter((item) => pending(item.status))
            .map((item) => ({
              ...item,
              group,
              name: personName(item),
              createdAt: item.createdAt || item.scheduledStart,
            })),
        )
        .sort(
          (first, second) =>
            new Date(second.createdAt || 0) - new Date(first.createdAt || 0),
        )
        .slice(0, 6),
    [records],
  );

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="@container/main flex flex-1 flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Front Desk Dashboard
              </h1>
              <p className="text-muted-foreground">
                Review client requests, manage today’s operations, and follow up
                on payments.
              </p>
            </div>

            <SectionCards stats={stats} loading={loading} />
            {loadError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {loadError}
              </p>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      Room availability
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Today's room status
                    </CardDescription>
                  </div>

                  <select
                    value={roomFilter}
                    onChange={(event) => {
                      setRoomFilter(event.target.value);
                      setSelectedRoom(null);
                    }}
                    className="h-8 min-w-36 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="ALL">All rooms</option>
                    {roomAvailability.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomName || room.roomType || 'Room'}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {loading ? (
                  <div className="flex min-h-12 items-center justify-center">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : roomAvailability.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    No rooms are configured.
                  </p>
                ) : filteredRoomAvailability.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    No matching room found.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredRoomAvailability.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() =>
                          setSelectedRoom((current) =>
                            current?.id === room.id ? null : room,
                          )
                        }
                        className={`flex min-w-0 items-center justify-between gap-2 rounded-md border p-2.5 text-left transition-colors hover:bg-muted/50 ${
                          selectedRoom?.id === room.id ? 'bg-muted' : ''
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">
                            {room.roomName || room.roomType || 'Room'}
                          </span>
                        </span>

                        <Badge
                          variant={room.inUse ? 'destructive' : 'outline'}
                          className="shrink-0 text-[10px]"
                        >
                          {room.inUse ? 'In use' : 'Available'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {selectedRoom && (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {selectedRoom.roomName ||
                            selectedRoom.roomType ||
                            'Room'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Today's schedule
                        </p>
                      </div>

                      <Badge
                        variant={selectedRoom.inUse ? 'destructive' : 'outline'}
                      >
                        {selectedRoom.inUse ? 'In use' : 'Available'}
                      </Badge>
                    </div>

                    <div className="max-h-64 space-y-1.5 overflow-y-auto">
                      {buildRoomTimeline(selectedRoom).map((slot, index) => (
                        <div
                          key={`${slot.start.toISOString()}-${index}`}
                          className={`flex items-center justify-between gap-3 rounded-md border px-2.5 py-2 ${
                            slot.booking
                              ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium">
                              {formatTime(slot.start)} – {formatTime(slot.end)}
                            </p>

                            {slot.booking && (
                              <p className="truncate text-[11px]">
                                Booked by {personName(slot.booking)}
                              </p>
                            )}
                          </div>

                          <Badge
                            variant={slot.booking ? 'destructive' : 'outline'}
                            className="shrink-0 text-[10px]"
                          >
                            {slot.booking ? 'Booked' : 'Free'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Requests to review</CardTitle>
                  <CardDescription>
                    Pending work from client enrollments, room bookings, and
                    rentals.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex min-h-40 items-center justify-center">
                      <Loader2 className="animate-spin text-muted-foreground" />
                    </div>
                  ) : queue.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center text-center">
                      <ClipboardList className="size-8 text-muted-foreground" />
                      <p className="mt-3 font-medium">
                        No requests need review.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        The Front Desk queue is clear.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {queue.map((item) => {
                        const Icon = item.group.icon;
                        return (
                          <a
                            key={`${item.group.key}-${item.id}`}
                            href={item.group.path}
                            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                          >
                            <div className="rounded-full bg-muted p-2">
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{item.name}</p>
                                <Badge variant="outline">
                                  {item.group.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {dateTime(item.createdAt)}
                              </p>
                            </div>
                            <ArrowRight className="size-4 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Front Desk flow</CardTitle>
                  <CardDescription>Common actions for today.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button
                    variant="outline"
                    className="justify-between"
                    render={<a href="/front-desk/enrollments" />}
                  >
                    Review enrollments <ArrowRight />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-between"
                    render={<a href="/front-desk/room-bookings" />}
                  >
                    Manage room bookings <ArrowRight />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-between"
                    render={<a href="/front-desk/rentals" />}
                  >
                    Manage instrument rentals <ArrowRight />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-between"
                    render={<a href="/front-desk/billing" />}
                  >
                    Open billing and receipts <ArrowRight />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-between"
                    render={<a href="/front-desk/schedule" />}
                  >
                    View class schedule <CalendarDays />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
