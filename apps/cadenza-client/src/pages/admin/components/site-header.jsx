import * as React from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { BellIcon } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { apiClient } from "@/core/api/apiClient"

export function SiteHeader({ className }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isFrontDesk = location.pathname.startsWith('/front-desk')
  const [notificationOpen, setNotificationOpen] = React.useState(false)
  const [showAllNotifications, setShowAllNotifications] = React.useState(false)
  const [notifications, setNotifications] = React.useState(() => isFrontDesk ? [] : [
    { id: 'schedule', title: 'Upcoming Class', message: 'Piano Beginner is scheduled at 9:00 AM in Room 101.', href: '/admin/schedule', read: false },
    { id: 'rental', title: 'Instrument Rental Overdue', message: 'Suzuki Violin 220 rental is overdue.', href: '/admin/instrument-rentals', read: false },
    { id: 'student', title: 'New Enrollment', message: 'A student has enrolled in a new course package.', href: '/admin/students', read: false },
    { id: 'payment', title: 'Payment Received', message: 'A payment has been recorded.', href: '/admin/payments', read: true },
    { id: 'room', title: 'Room Scheduled', message: 'Room 102 has been scheduled for a guitar class.', href: '/admin/rooms', read: true },
  ])

  React.useEffect(() => {
    if (!isFrontDesk) return undefined
    Promise.allSettled([
      apiClient.get('/enrollments'),
      apiClient.get('/room-bookings'),
      apiClient.get('/instrument-rentals'),
    ]).then((results) => {
      const labels = ['Enrollment request', 'Room booking request', 'Instrument rental request']
      const items = results.flatMap((result, index) => {
        if (result.status !== 'fulfilled') return []
        const data = result.value?.data?.data ?? result.value?.data ?? result.value
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: `${index}-${item.id}`,
          title: labels[index],
          message: item.student || item.customer?.person?.name || 'A new request needs attention.',
          href: index === 0
            ? `/front-desk/enrollments?enrollmentId=${encodeURIComponent(item.id)}`
            : index === 1
              ? `/front-desk/room-bookings?bookingId=${encodeURIComponent(item.id)}`
              : `/front-desk/rentals?rentalId=${encodeURIComponent(item.id)}`,
          read: false,
        }))
      })
      setNotifications(items)
    })
    return undefined
  }, [isFrontDesk])

  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <header className={cn("flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)", className)}>
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">Documents</h1>
        <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
          <DropdownMenuTrigger
            render={<Button type="button" variant="ghost" size="icon" className="relative ml-auto" />}
            aria-label="Open notifications"
            title="Notifications"
          >
            <BellIcon className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">Recent workspace updates</p>
              </div>
              {unreadCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs"
                  onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <div className={`${showAllNotifications ? 'max-h-[min(28rem,60vh)] overflow-y-auto' : 'max-h-80 overflow-hidden'} p-2`}>
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
              ) : notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`mb-1 w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-muted ${notification.read ? '' : 'bg-muted/50'}`}
                  onClick={() => {
                    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item))
                    if (notification.href) navigate(notification.href)
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!notification.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowAllNotifications((current) => !current)}
              >
                {showAllNotifications ? 'Show fewer notifications' : 'View all notifications'}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
