import * as React from 'react';
import { BellIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getMyNotifications } from '@/pages/client/notifications/services/notifications.service';

const readStorageKey = 'cadenza-client-read-notifications';

export function SiteHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);

  const loadNotifications = React.useCallback(async () => {
    try {
      const items = await getMyNotifications();
      let readIds = [];
      try { readIds = JSON.parse(localStorage.getItem(readStorageKey) || '[]'); } catch { /* ignore invalid local state */ }
      setNotifications(items.map((item) => ({ ...item, read: readIds.includes(item.id) })));
    } catch { setNotifications([]); }
  }, []);

  React.useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const markRead = (notification) => {
    let readIds = [];
    try { readIds = JSON.parse(localStorage.getItem(readStorageKey) || '[]'); } catch { /* ignore invalid local state */ }
    localStorage.setItem(readStorageKey, JSON.stringify([...new Set([...readIds, notification.id])]));
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    if (notification.href) navigate(notification.href);
  };
  const markAllRead = () => {
    localStorage.setItem(readStorageKey, JSON.stringify(notifications.map((item) => item.id)));
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <h1 className="text-base font-medium">Documents</h1>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="relative ml-auto" />} aria-label="Open notifications" title="Notifications">
            <BellIcon className="size-5" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] p-0">
            <div className="flex items-center justify-between border-b px-4 py-3"><div><p className="font-semibold">Notifications</p><p className="text-xs text-muted-foreground">Updates about your Cadenza activities</p></div>{unreadCount > 0 && <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={markAllRead}>Mark all as read</Button>}</div>
            <div className={`${showAll ? 'max-h-[min(28rem,60vh)] overflow-y-auto' : 'max-h-80 overflow-hidden'} p-2`}>
              {notifications.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p> : notifications.map((notification) => <button key={notification.id} type="button" className={`mb-1 w-full rounded-md px-3 py-2 text-left hover:bg-muted ${notification.read ? '' : 'bg-muted/50'}`} onClick={() => markRead(notification)}><div className="flex items-start gap-2">{!notification.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}<div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{notification.title}</p><Badge variant="secondary" className="shrink-0 text-[10px]">{String(notification.status || '').replaceAll('_', ' ')}</Badge></div><p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p></div></div></button>)}
            </div>
            {notifications.length > 0 && <div className="border-t p-2"><Button type="button" variant="ghost" className="w-full" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Show fewer notifications' : 'View all notifications'}</Button></div>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
