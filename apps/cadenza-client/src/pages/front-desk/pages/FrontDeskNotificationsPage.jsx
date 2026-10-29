import { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  ClipboardList,
  DoorOpen,
  Guitar,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '@/core/api/apiClient';
import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

const unwrapList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : [];
};

const personName = (record) => {
  const person = record.customer?.person;
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'A client';
};

const buildNotifications = (enrollments, bookings, rentals) => [
  ...enrollments.map((item) => ({
    id: `enrollment-${item.id}`,
    href: `/front-desk/enrollments?enrollmentId=${encodeURIComponent(item.id)}`,
    type: 'enrollment',
    title: 'New enrollment request',
    message: `${item.student || 'A client'} submitted ${item.packageName || 'an enrollment'} for review.`,
    createdAt: item.createdAt,
    read: false,
  })),
  ...bookings.map((item) => ({
    id: `booking-${item.id}`,
    href: `/front-desk/room-bookings?bookingId=${encodeURIComponent(item.id)}`,
    type: 'booking',
    title: 'Room booking request',
    message: `${personName(item)} requested ${item.room?.name || 'a room booking'}.`,
    createdAt: item.createdAt || item.scheduledStart,
    read: false,
  })),
  ...rentals.map((item) => ({
    id: `rental-${item.id}`,
    href: `/front-desk/rentals?rentalId=${encodeURIComponent(item.id)}`,
    type: 'rental',
    title: 'Instrument rental request',
    message: `${personName(item)} submitted an instrument rental request.`,
    createdAt: item.createdAt || item.scheduledStart,
    read: false,
  })),
].sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0));

const icons = {
  enrollment: ClipboardList,
  booking: DoorOpen,
  rental: Guitar,
};

export default function FrontDeskNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/enrollments'),
      apiClient.get('/room-bookings'),
      apiClient.get('/instrument-rentals'),
    ])
      .then((results) => {
        const [enrollments, bookings, rentals] = results.map((result) =>
          result.status === 'fulfilled' ? unwrapList(result.value) : [],
        );
        setNotifications(buildNotifications(enrollments, bookings, rentals));
      })
      .catch(() => toast.error('Unable to load front-desk notifications.'))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const markAsRead = (id) =>
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
                {unreadCount > 0 && <Badge>{unreadCount} new</Badge>}
              </div>
              <p className="text-muted-foreground">Live activity from client enrollments, room bookings, and rentals.</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}>
                <Check /> Mark all as read
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent client activity</CardTitle>
              <CardDescription>Requests fetched from the client records.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">No client activity yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const Icon = icons[notification.type] || CalendarDays;
                    const openNotification = () => {
                      markAsRead(notification.id);
                      navigate(notification.href);
                    };
                    return (
                      <div
                        key={notification.id}
                        role="link"
                        tabIndex={0}
                        onClick={(event) => {
                          if (!event.target.closest('button')) openNotification();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openNotification();
                          }
                        }}
                        className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 ${!notification.read ? 'bg-muted/50' : ''}`}
                      >
                        <div className="rounded-full bg-muted p-2"><Icon className="size-5" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <button type="button" onClick={openNotification} className="text-left font-medium hover:text-primary hover:underline">{notification.title}</button>
                            <span className="text-xs text-muted-foreground">
                              {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Recently'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                        {!notification.read && <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>Mark as read</Button>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
