import { useEffect, useState } from 'react';
import { Bell, CalendarDays, Check, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { getMyNotifications } from '../services/notifications.service';

const icons = {
  PAYMENT: CreditCard,
  SCHEDULE: CalendarDays,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyNotifications()
      .then(setNotifications)
      .catch(() => toast.error('Unable to load notifications.'))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markRead = (id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
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
            onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}
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
              return (
                <div key={notification.id} className={`flex gap-4 py-4 first:pt-0 last:pb-0 ${!notification.read ? 'bg-primary/[0.03]' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{notification.title}</p>
                      {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleDateString()}</p>
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
