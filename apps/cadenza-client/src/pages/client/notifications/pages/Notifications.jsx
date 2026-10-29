import { useEffect, useState } from 'react';
import { Bell, CalendarDays, Check, ClipboardList, CreditCard, DoorOpen, Guitar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { getMyNotifications } from '../services/notifications.service';

const icons = {
  ENROLLMENT: ClipboardList,
  BOOKING: DoorOpen,
  RENTAL: Guitar,
  PAYMENT: CreditCard,
  SCHEDULE: CalendarDays,
};

const readStorageKey = 'cadenza-client-read-notifications';
const formatStatus = (status) => String(status || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusVariant = (status) => ['APPROVED', 'ACTIVE', 'CONFIRMED', 'COMPLETED'].includes(status) ? 'default' : ['REJECTED', 'CANCELLED'].includes(status) ? 'destructive' : 'secondary';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(readStorageKey) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const loadNotifications = () => getMyNotifications()
      .then((items) => setNotifications(items.map((item) => ({ ...item, read: readIds.includes(item.id) }))))
      .catch(() => toast.error('Unable to load notifications.'))
      .finally(() => setLoading(false));
    loadNotifications();
    const refreshTimer = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markRead = (id) => {
    const nextReadIds = [...new Set([...readIds, id])];
    setReadIds(nextReadIds);
    localStorage.setItem(readStorageKey, JSON.stringify(nextReadIds));
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  const markAllRead = () => {
    const nextReadIds = [...new Set([...readIds, ...notifications.map((item) => item.id)])];
    setReadIds(nextReadIds);
    localStorage.setItem(readStorageKey, JSON.stringify(nextReadIds));
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  return (
    <div className="space-y-8 px-4 py-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Updates about your Cadenza activities.</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Check className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const Icon = icons[notification.type] || Bell;
              const openNotification = () => {
                markRead(notification.id);
                if (notification.href) navigate(notification.href);
              };
              return (
                    <div
                      key={notification.id}
                      role={notification.href ? 'link' : undefined}
                      tabIndex={notification.href ? 0 : undefined}
                      onClick={(event) => {
                        if (notification.href && !event.target.closest('a, button')) openNotification();
                      }}
                      onKeyDown={(event) => {
                        if (notification.href && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          openNotification();
                        }
                      }}
                      className={`flex gap-4 py-4 first:pt-0 last:pb-0 ${notification.href ? 'cursor-pointer' : ''} ${!notification.read ? 'bg-primary/[0.03]' : ''}`}
                    >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={openNotification} className="text-left font-medium hover:text-primary hover:underline">{notification.title}</button>
                      {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant={statusVariant(notification.status)}>{formatStatus(notification.status)}</Badge><span className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</span></div>
                  </div>
                  {!notification.read && (
                    <button type="button" onClick={() => markRead(notification.id)} className="self-center text-xs font-medium text-primary hover:underline">
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
