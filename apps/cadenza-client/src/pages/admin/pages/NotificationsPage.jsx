"use client";

import * as React from "react";
import {
  BellIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  GuitarIcon,
  UserPlusIcon,
  DoorOpenIcon,
  CheckIcon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const initialNotifications = [
  {
    id: 1,
    title: "Upcoming Class",
    message: "Piano Beginner is scheduled at 9:00 AM in Room 101.",
    time: "10 minutes ago",
    type: "schedule",
    read: false,
  },
  {
    id: 2,
    title: "Instrument Rental Overdue",
    message: "Suzuki Violin 220 rental is overdue.",
    time: "1 hour ago",
    type: "rental",
    read: false,
  },
  {
    id: 3,
    title: "New Enrollment",
    message: "A student has enrolled in a new course package.",
    time: "2 hours ago",
    type: "student",
    read: false,
  },
  {
    id: 4,
    title: "Payment Received",
    message: "A payment of ₱1,550 has been recorded.",
    time: "3 hours ago",
    type: "payment",
    read: true,
  },
  {
    id: 5,
    title: "Room Scheduled",
    message: "Room 102 has been scheduled for a guitar class.",
    time: "Yesterday",
    type: "room",
    read: true,
  },
];

function NotificationIcon({ type }) {
  if (type === "schedule") {
    return <CalendarDaysIcon className="size-5" />;
  }

  if (type === "rental") {
    return <GuitarIcon className="size-5" />;
  }

  if (type === "student") {
    return <UserPlusIcon className="size-5" />;
  }

  if (type === "payment") {
    return <CreditCardIcon className="size-5" />;
  }

  return <DoorOpenIcon className="size-5" />;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    React.useState(initialNotifications);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const markAsRead = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      })),
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Notifications
                </h1>

                {unreadCount > 0 && <Badge>{unreadCount} new</Badge>}
              </div>

              <p className="text-muted-foreground">
                Important updates from Cadenza Music Center.
              </p>
            </div>

            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckIcon />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>

              <CardDescription>
                Updates about classes, students, payments, rooms, and instrument
                rentals.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 rounded-lg border p-4 ${
                      !notification.read ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="rounded-full bg-muted p-2">
                      <NotificationIcon type={notification.type} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">{notification.title}</p>

                        <span className="text-xs text-muted-foreground">
                          {notification.time}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>

                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BellIcon className="mb-3 size-8 text-muted-foreground" />

                    <p className="font-medium">No notifications</p>

                    <p className="text-sm text-muted-foreground">
                      You're all caught up.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
