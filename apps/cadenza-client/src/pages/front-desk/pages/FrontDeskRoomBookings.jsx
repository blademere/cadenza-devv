import TransactionRefundPanel from '../components/TransactionRefundPanel';
import { useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, FileIcon, Loader2, X } from 'lucide-react';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  approveRoomBooking,
  cancelRoomBooking,
  checkInRoomBooking,
  checkOutRoomBooking,
  getRoomBookings,
} from '@/services/front-desk/room-bookingsService';

const toDateTimeLocalValue = (value = new Date()) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : '—';
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
const formatBookingReference = (id) =>
  id ? `RB-${id.slice(0, 8).toUpperCase()}` : '—';
const isPendingBooking = (status) =>
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
const formatStatus = (status) => {
  if (status === 'FOR_APPROVAL' || status === 'PENDING') return 'Pending';
  if (status === 'APPROVED') return 'Approved';
  if (status === 'CHECKED_IN') return 'Checked In';
  if (status === 'COMPLETED') return 'Checked Out';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'Rejected';
  return status || '—';
};
const statusVariant = (status) =>
  status === 'Approved'
    ? 'default'
    : status === 'Rejected'
      ? 'destructive'
      : 'secondary';

const mapBooking = (booking) => {
  const person = booking.customer?.person;
  const metadata = booking.metadata || {};
  return {
    ...booking,
    student:
      [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
      'Client',
    email: person?.email || '—',
    roomName: booking.room?.name || 'Room',
    paymentPlan:
      metadata.paymentPlan === 'DOWN_PAYMENT'
        ? 'Partial downpayment'
        : 'Full payment',
    paymentAmount:
      metadata.initialPaymentAmount ??
      metadata.paymentAmount ??
      booking.totalAmount,
    paymentReference: metadata.paymentReference || '—',
    paymentStatus: metadata.paymentStatus || 'Pending confirmation',
    status: formatStatus(booking.status),
  };
};

export default function FrontDeskRoomBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState('All');
  const [bookingPage, setBookingPage] = useState(1);
  const bookingPageSize = 10;
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationMode, setCancellationMode] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [checkInAt, setCheckInAt] = useState(toDateTimeLocalValue());

  useEffect(() => {
    getRoomBookings()
      .then((data) =>
        setBookings((Array.isArray(data) ? data : []).map(mapBooking)),
      )
      .catch((requestError) =>
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            'Unable to load room bookings.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const inUsedRooms = bookings.filter((booking) => booking.status === 'Checked In')
    .sort((a, b) => new Date(a.scheduledEnd) - new Date(b.scheduledEnd));
  const roomOverdue = (booking) => Number.isFinite(new Date(booking.scheduledEnd).getTime()) &&
    new Date(booking.scheduledEnd).getTime() <= currentTime;

  const walkInBookings =
    statusFilter === 'All'
      ? bookings.filter((booking) => booking.metadata?.walkIn)
      : bookings.filter(
          (booking) =>
            booking.metadata?.walkIn && booking.status === statusFilter,
        );
  const filteredBookings =
    statusFilter === 'All'
      ? bookings.filter((booking) => !booking.metadata?.walkIn)
      : bookings.filter(
          (booking) =>
            !booking.metadata?.walkIn && booking.status === statusFilter,
        );
  const bookingPageCount = Math.max(
    1,
    Math.ceil(filteredBookings.length / bookingPageSize),
  );
  const paginatedBookings = filteredBookings.slice(
    (bookingPage - 1) * bookingPageSize,
    bookingPage * bookingPageSize,
  );
  const openDetails = (booking) => {
    setSelectedBooking(booking);
    setError('');
    setCancellationReason('');
    setCancellationMode(false);
    setCheckInAt(toDateTimeLocalValue());
    setShowDetails(true);
  };

  const applyDecision = async (decision) => {
    if (!selectedBooking || actionLoading) return;
    try {
      setActionLoading(true);
      setError('');
      const updated =
        decision === 'approve'
          ? await approveRoomBooking(selectedBooking.id)
          : await cancelRoomBooking(selectedBooking.id, cancellationReason);
      const next = mapBooking({ ...selectedBooking, ...updated });
      setBookings((current) =>
        current.map((booking) => (booking.id === next.id ? next : booking)),
      );
      setSelectedBooking(next);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          `Unable to ${decision} this room booking.`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const applyCheckIn = async () => {
    if (!selectedBooking || actionLoading) return;
    try {
      setActionLoading(true);
      setError('');
      const updated = await checkInRoomBooking(
        selectedBooking.id,
        new Date(checkInAt).toISOString(),
      );
      const next = mapBooking({ ...selectedBooking, ...updated });
      setBookings((current) =>
        current.map((booking) => (booking.id === next.id ? next : booking)),
      );
      setSelectedBooking(next);
      setShowCheckInDialog(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Unable to check in this room booking.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const applyCheckOut = async () => {
    if (!selectedBooking || actionLoading) return;
    try {
      setActionLoading(true);
      setError('');
      const updated = await checkOutRoomBooking(
        selectedBooking.id,
        new Date().toISOString(),
      );
      const next = mapBooking({ ...selectedBooking, ...updated });
      setBookings((current) =>
        current.map((booking) => (booking.id === next.id ? next : booking)),
      );
      setSelectedBooking(next);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Unable to check out this room booking.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Room Bookings</h1>
              <p className="text-muted-foreground">
                Review payment details and manage room booking requests.
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCwIcon className="mr-2 size-4" />
              Refresh
            </Button>
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>In Used Rooms</CardTitle>
                  <CardDescription>Checked-in rooms awaiting checkout. Overdue bookings need Front Desk attention.</CardDescription>
                </div>
                <Badge variant="secondary">{inUsedRooms.length} in use</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {inUsedRooms.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  No rooms are currently checked in.
                </p>
              ) : (
                <div className="space-y-3">
                  {inUsedRooms.map((booking) => {
                    const overdue = roomOverdue(booking);
                    return (
                      <div key={booking.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold">{booking.roomName}</p>
                          <p className="text-sm text-muted-foreground">{booking.student} · {formatBookingReference(booking.id)}</p>
                          <p className="text-sm text-muted-foreground">
                            Scheduled end: {formatDate(booking.scheduledEnd)} at {formatTime(booking.scheduledEnd)}
                          </p>
                          {overdue && (
                            <p role="alert" className="text-sm font-medium text-destructive">
                              Scheduled time ended — checkout is required.
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant={overdue ? 'destructive' : 'secondary'}>
                            {overdue ? 'Checkout overdue' : 'In use'}
                          </Badge>
                          <Button size="sm" onClick={() => openDetails(booking)}>
                            Check out
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Walk-in Room Bookings</CardTitle>
                  <CardDescription>
                    Create a room booking for a customer without a client
                    account.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => navigate('/front-desk/room-bookings/walk-in')}
                >
                  New walk-in booking
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Walk-in bookings use the same room availability, operating-hour,
                and payment validation rules.
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walkInBookings.length ? (
                      walkInBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {formatBookingReference(booking.id)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.student}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.email}
                            </div>
                          </TableCell>
                          <TableCell>{booking.roomName}</TableCell>
                          <TableCell>
                            {formatDate(booking.scheduledStart)}{' '}
                            {formatTime(booking.scheduledStart)} —{' '}
                            {formatTime(booking.scheduledEnd)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetails(booking)}
                            >
                              <FileIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-20 text-center text-muted-foreground"
                        >
                          No walk-in room bookings found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Room Booking Requests</CardTitle>
                  <CardDescription>
                    Booking decisions are saved to the client record.
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" />}>
                    {statusFilter === 'All' ? 'All Bookings' : statusFilter}
                    <ChevronDown className="ml-2 size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[
                      'All',
                      'Pending',
                      'Approved',
                      'Checked In',
                      'Checked Out',
                      'Rejected',
                    ].map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => setStatusFilter(status)}
                      >
                        {status === 'All' ? 'All Bookings' : status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2 className="mx-auto animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredBookings.length ? (
                      paginatedBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {formatBookingReference(booking.id)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.student}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.email}
                            </div>
                          </TableCell>
                          <TableCell>{booking.roomName}</TableCell>
                          <TableCell>
                            {formatDate(booking.scheduledStart)}{' '}
                            {formatTime(booking.scheduledStart)} —{' '}
                            {formatTime(booking.scheduledEnd)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size={
                                isPendingBooking(booking.status) ? 'sm' : 'icon'
                              }
                              onClick={() => openDetails(booking)}
                            >
                              {isPendingBooking(booking.status) ? (
                                'Review'
                              ) : (
                                <FileIcon className="size-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No room bookings found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {bookingPageCount > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {bookingPage} of {bookingPageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bookingPage === 1}
                      onClick={() => setBookingPage((page) => page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bookingPage === bookingPageCount}
                      onClick={() => setBookingPage((page) => page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto p-5 sm:max-w-2xl sm:p-7">
              {selectedBooking && (
                <>
                  <DialogHeader>
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-5">
                      <div>
                        <DialogTitle>Room Booking Details</DialogTitle>
                        <DialogDescription>
                          {formatBookingReference(selectedBooking.id)} · Review
                          booking information
                        </DialogDescription>
                      </div>
                      <Badge variant={statusVariant(selectedBooking.status)}>
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </DialogHeader>
                  <div className="space-y-5">
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold">Booking information</h3>
                      <div className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Student</p>
                        <p className="mt-1 break-words text-sm font-medium sm:text-base">{selectedBooking.student}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Room</p>
                        <p className="mt-1 break-words text-sm font-medium sm:text-base">
                          {selectedBooking.roomName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="mt-1 break-words text-sm font-medium sm:text-base">
                          {formatDate(selectedBooking.scheduledStart)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="mt-1 break-words text-sm font-medium sm:text-base">
                          {formatTime(selectedBooking.scheduledStart)} —{' '}
                          {formatTime(selectedBooking.scheduledEnd)}
                        </p>
                      </div>
                    </div>
                    </section>
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold">Payment details</h3>
                      <div className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment amount
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          ₱
                          {Number(
                            selectedBooking.paymentAmount || 0,
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment plan
                        </p>
                        <p className="mt-1 break-words text-sm font-medium sm:text-base">
                          {selectedBooking.paymentPlan}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment status
                        </p>
                        <p className="mt-1 break-words text-sm font-medium sm:text-base">
                          {selectedBooking.paymentStatus}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reference
                        </p>
                        <p className="mt-1 break-all font-mono text-sm">
                          {selectedBooking.paymentReference}
                        </p>
                      </div>
                    </div>
                    </section>
                    {selectedBooking.metadata?.paymentContinuationRequired && (
                      <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm">
                        Payment continuation required. Remaining balance: ₱
                        {Number(
                          selectedBooking.metadata.remainingAmount || 0,
                        ).toLocaleString()}
                        .
                      </div>
                    )}
                    {['Rejected', 'CANCELLED', 'REJECTED'].includes(selectedBooking.status) && (
                      <TransactionRefundPanel
                        type="ROOM_BOOKING"
                        transactionId={selectedBooking.id}
                        onRefundRecorded={(quote) => {
                          setSelectedBooking((current) => current ? {
                            ...current, paymentStatus: 'REFUNDED',
                            metadata: { ...current.metadata, refundStatus: 'RECORDED', refundAmount: quote.refundedAmount, paymentStatus: 'REFUNDED', netPaidAmount: 0 },
                          } : current);
                          setBookings((current) => current.map((item) => item.id === selectedBooking.id ? {
                            ...item, paymentStatus: 'REFUNDED',
                            metadata: { ...item.metadata, refundStatus: 'RECORDED', refundAmount: quote.refundedAmount, paymentStatus: 'REFUNDED' },
                          } : item));
                        }}
                      />
                    )}
                    {cancellationMode && (
                      <div>
                        <label
                          htmlFor="booking-cancellation-reason"
                          className="text-sm font-medium"
                        >
                          Cancellation reason
                        </label>
                        <textarea
                          id="booking-cancellation-reason"
                          value={cancellationReason}
                          onChange={(event) =>
                            setCancellationReason(event.target.value)
                          }
                          placeholder="Explain why this booking is being cancelled"
                          maxLength={500}
                          rows={3}
                          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>
                  <DialogFooter className="flex flex-wrap gap-2 border-t pt-4">
                    {isPendingBooking(selectedBooking.status) ? (
                      <>
                        {cancellationMode ? (
                          <>
                            <Button
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => {
                                setCancellationMode(false);
                                setCancellationReason('');
                              }}
                            >
                              Keep booking
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={
                                actionLoading ||
                                cancellationReason.trim().length < 3
                              }
                              onClick={() => applyDecision('cancel')}
                            >
                              {actionLoading && (
                                <Loader2 className="animate-spin" />
                              )}{' '}
                              Confirm cancellation
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => setCancellationMode(true)}
                          >
                            <X /> Cancel booking
                          </Button>
                        )}
                        <Button
                          disabled={actionLoading || cancellationMode}
                          onClick={() => applyDecision('approve')}
                        >
                          {actionLoading ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Check />
                          )}{' '}
                          Approve booking
                        </Button>
                      </>
                    ) : selectedBooking.status === 'Approved' ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setShowDetails(false)}
                        >
                          Close
                        </Button>
                        <Button
                          disabled={actionLoading}
                          onClick={() => {
                            setCheckInAt(toDateTimeLocalValue());
                            setShowCheckInDialog(true);
                          }}
                        >
                          <Check /> Check in
                        </Button>
                      </>
                    ) : selectedBooking.status === 'Checked In' ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setShowDetails(false)}
                        >
                          Close
                        </Button>
                        <Button
                          disabled={actionLoading}
                          onClick={applyCheckOut}
                        >
                          <Check /> Check out
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
          <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Check in client</DialogTitle>
                <DialogDescription>
                  Adjust the start time while preserving the original booked
                  duration. No extra room charge is added.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Booked start
                    </p>
                    <p className="font-medium">
                      {formatTime(
                        selectedBooking?.metadata?.originalScheduledStart ||
                          selectedBooking?.scheduledStart,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Booked end</p>
                    <p className="font-medium">
                      {formatTime(
                        selectedBooking?.metadata?.originalScheduledEnd ||
                          selectedBooking?.scheduledEnd,
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="room-check-in-time"
                    className="text-sm font-medium"
                  >
                    Actual check-in time
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="room-check-in-time"
                      type="datetime-local"
                      value={checkInAt}
                      onChange={(event) => setCheckInAt(event.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCheckInAt(toDateTimeLocalValue())}
                    >
                      Use current time
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCheckInDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={actionLoading || !checkInAt}
                  onClick={applyCheckIn}
                >
                  {actionLoading && <Loader2 className="animate-spin" />}{' '}
                  Confirm check-in
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
