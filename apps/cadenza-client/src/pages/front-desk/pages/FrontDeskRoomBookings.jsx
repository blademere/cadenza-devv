"use client";

import { useState } from "react";
import { FileIcon, ChevronDown, Check, X } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialRoomBookings = [
  {
    id: "RB-001",
    student: "Juan Dela Cruz",
    email: "juan@example.com",
    phone: "09181234567",
    room: "Practice Room 1",
    date: "Sep 10, 2026",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    status: "Pending",
  },
  {
    id: "RB-002",
    student: "Maria Santos",
    email: "maria@example.com",
    phone: "09171234567",
    room: "Practice Room 2",
    date: "Sep 11, 2026",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    status: "Approved",
  },
  {
    id: "RB-003",
    student: "Pedro Reyes",
    email: "pedro@example.com",
    phone: "09191234567",
    room: "Music Room",
    date: "Sep 12, 2026",
    startTime: "1:00 PM",
    endTime: "3:00 PM",
    status: "Pending",
  },
  {
    id: "RB-004",
    student: "Ana Garcia",
    email: "ana@example.com",
    phone: "09181239876",
    room: "Practice Room 3",
    date: "Sep 13, 2026",
    startTime: "2:00 PM",
    endTime: "4:00 PM",
    status: "Rejected",
  },
];

export default function RoomBookingsPage() {
  const [bookings, setBookings] = useState(initialRoomBookings);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredBookings =
    statusFilter === "All"
      ? bookings
      : bookings.filter(
          (booking) => booking.status === statusFilter
        );

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  const handleApprove = () => {
    if (!selectedBooking) return;

    setBookings((current) =>
      current.map((booking) =>
        booking.id === selectedBooking.id
          ? { ...booking, status: "Approved" }
          : booking
      )
    );

    setSelectedBooking((current) =>
      current
        ? { ...current, status: "Approved" }
        : null
    );
  };

  const handleReject = () => {
    if (!selectedBooking) return;

    setBookings((current) =>
      current.map((booking) =>
        booking.id === selectedBooking.id
          ? { ...booking, status: "Rejected" }
          : booking
      )
    );

    setSelectedBooking((current) =>
      current
        ? { ...current, status: "Rejected" }
        : null
    );
  };

  const getStatusVariant = (status) => {
    if (status === "Approved") return "default";
    if (status === "Rejected") return "destructive";
    return "secondary";
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold">
              Room Bookings
            </h1>

            <p className="text-muted-foreground">
              Review and manage student room booking requests.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Room Booking Requests</CardTitle>

                  <CardDescription>
                    View and manage all room booking requests.
                  </CardDescription>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="min-w-[140px] justify-between"
                    >
                      {statusFilter === "All"
                        ? "All Bookings"
                        : statusFilter}

                      <ChevronDown className="ml-2 size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("All")}
                    >
                      All Bookings
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Pending")}
                    >
                      Pending
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Approved")}
                    >
                      Approved
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Rejected")}
                    >
                      Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {booking.id}
                          </TableCell>

                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {booking.student}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {booking.email}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {booking.room}
                          </TableCell>

                          <TableCell>
                            {booking.date}
                          </TableCell>

                          <TableCell>
                            <div>
                              <div>{booking.startTime}</div>

                              <div className="text-sm text-muted-foreground">
                                to {booking.endTime}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={getStatusVariant(
                                booking.status
                              )}
                            >
                              {booking.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View booking details"
                              onClick={() =>
                                handleViewDetails(booking)
                              }
                            >
                              <FileIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No room bookings found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={showDetails}
            onOpenChange={setShowDetails}
          >
            <DialogContent className="sm:max-w-[500px]">
              {selectedBooking && (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <DialogTitle>
                          Room Booking
                        </DialogTitle>

                        <DialogDescription>
                          {selectedBooking.id} · Booking details
                        </DialogDescription>
                      </div>

                      <Badge
                        variant={getStatusVariant(
                          selectedBooking.status
                        )}
                      >
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Student
                          </p>
                          <p className="font-medium">
                            {selectedBooking.student}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Booking ID
                          </p>
                          <p className="font-medium">
                            {selectedBooking.id}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">
                            Email
                          </p>
                          <p className="truncate font-medium">
                            {selectedBooking.email}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">
                            Phone
                          </p>
                          <p className="font-medium">
                            {selectedBooking.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold">
                        Booking Information
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Room
                          </p>
                          <p className="font-medium">
                            {selectedBooking.room}
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Date
                          </p>
                          <p className="font-medium">
                            {selectedBooking.date}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Time
                          </p>

                          <p className="font-medium">
                            {selectedBooking.startTime}{" "}
                            <span className="text-muted-foreground">
                              to
                            </span>{" "}
                            {selectedBooking.endTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="border-t pt-4">
                    {selectedBooking.status === "Pending" ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleReject}
                        >
                          <X className="mr-2 size-4" />
                          Reject
                        </Button>

                        <Button onClick={handleApprove}>
                          <Check className="mr-2 size-4" />
                          Approve Booking
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setShowDetails(false)}
                      >
                        Close
                      </Button>
                    )}
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
