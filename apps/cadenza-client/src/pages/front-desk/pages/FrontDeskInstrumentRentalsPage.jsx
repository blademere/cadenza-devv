"use client";

import { useEffect, useState } from "react";
import { FileIcon, ChevronDown, Check, X, Loader2 } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

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
} from "@/components/ui/Table";

import {
  approveInstrumentRental,
  cancelInstrumentRental,
  getInstrumentRentals,
  getReturnConditions,
  receiveInstrumentRental,
  returnInstrumentRental,
} from "@/services/front-desk/instrument-rentalsService";

const formatRentalReference = (id) =>
  id ? `RNT-${id.slice(0, 8).toUpperCase()}` : "—";

const formatRentalDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toDateTimeLocalValue = (value = new Date()) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
};

const isPendingRental = (status) =>
  [
    'PENDING',
    'PENDING_PAYMENT',
    'PENDING_CONFIRMATION',
    'PARTIALLY_PAID',
    'FOR_APPROVAL',
  ].includes(
    String(status || '')
      .toUpperCase()
      .replace(/[ -]/g, '_'),
  );

const canReviewRental = (rental) =>
  rental &&
  !['Approved', 'Returned', 'Rejected', 'CANCELLED', 'COMPLETED'].includes(
    rental.status,
  );

const canReturnRental = (rental) =>
  rental?.status === 'Approved' && Boolean(rental?.metadata?.receivedAt);

/* --------------------------------------------------
   Mock Data
-------------------------------------------------- */

const initialRentals = [
  {
    id: "RNT-001",
    student: "Juan Dela Cruz",
    email: "juan@example.com",
    phone: "09181234567",

    instrument: "Yamaha Grand Piano",
    type: "Piano",

    rentalDate: "Sep 10, 2026",
    returnDate: "Sep 17, 2026",

    rentalFee: "₱2,500",
    deposit: "₱1,000",
    totalAmount: "₱3,500",

    paymentStatus: "Paid",
    paymentMethod: "GCash",
    paymentReference: "GC-20260910-001",
    paymentDate: "Sep 9, 2026",

    status: "Pending",
  },

  {
    id: "RNT-002",
    student: "Maria Santos",
    email: "maria@example.com",
    phone: "09171234567",

    instrument: "Fender Acoustic Guitar",
    type: "Guitar",

    rentalDate: "Sep 11, 2026",
    returnDate: "Sep 18, 2026",

    rentalFee: "₱1,500",
    deposit: "₱500",
    totalAmount: "₱2,000",

    paymentStatus: "Paid",
    paymentMethod: "Cash",
    paymentReference: "CASH-20260911-001",
    paymentDate: "Sep 10, 2026",

    status: "Approved",
  },

  {
    id: "RNT-003",
    student: "Pedro Reyes",
    email: "pedro@example.com",
    phone: "09191234567",

    instrument: "Yamaha Violin",
    type: "Violin",

    rentalDate: "Sep 12, 2026",
    returnDate: "Sep 19, 2026",

    rentalFee: "₱1,200",
    deposit: "₱500",
    totalAmount: "₱1,700",

    paymentStatus: "Pending",
    paymentMethod: "GCash",
    paymentReference: "GC-20260912-003",
    paymentDate: "Sep 11, 2026",

    status: "Pending",
  },

  {
    id: "RNT-004",
    student: "Ana Garcia",
    email: "ana@example.com",
    phone: "09181239876",

    instrument: "Fender Electric Guitar",
    type: "Guitar",

    rentalDate: "Sep 13, 2026",
    returnDate: "Sep 20, 2026",

    rentalFee: "₱2,000",
    deposit: "₱1,000",
    totalAmount: "₱3,000",

    paymentStatus: "Paid",
    paymentMethod: "GCash",
    paymentReference: "GC-20260913-004",
    paymentDate: "Sep 12, 2026",

    status: "Rejected",
  },
];

/* --------------------------------------------------
   Page
-------------------------------------------------- */

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);

  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedRental, setSelectedRental] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationMode, setCancellationMode] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveAt, setReceiveAt] = useState(toDateTimeLocalValue());
  const [depositAmount, setDepositAmount] = useState('0');
  const [returnAt, setReturnAt] = useState(toDateTimeLocalValue());
  const [returnCondition, setReturnCondition] = useState("GOOD");
  const [damageFee, setDamageFee] = useState("0");
  const [returnConditions, setReturnConditions] = useState([]);

  useEffect(() => {
    const loadRentals = async () => {
      try {
        const data = await getInstrumentRentals();
        const mapped = (Array.isArray(data) ? data : []).map((rental) => {
          const person = rental.customer?.person;
          const payment = rental.metadata || {};
          const items = rental.items || [];
          const instrumentNames = items
            .map((item) => {
              const instrument = item.instrument || {};
              return (
                [instrument.brand, instrument.model]
                  .filter(Boolean)
                  .join(" ") || "Instrument"
              );
            })
            .join(", ");

          return {
            ...rental,
            student:
              [person?.firstName, person?.lastName]
                .filter(Boolean)
                .join(" ") || "Client",
            email: person?.email || "—",
            phone: person?.phone || "—",
            instrument: instrumentNames || "Instrument",
            type: "—",
            rentalDate: rental.scheduledStart,
            returnDate: rental.scheduledEnd,
            rentalFee: rental.totalAmount,
            deposit: rental.refundableDeposit,
            totalAmount: rental.totalAmount,
            paymentStatus:
              payment.paymentStatus === "PENDING_PROCEED"
                ? "Pending QR payment"
                : payment.paymentStatus || "Pending",
            paymentPlan:
              payment.paymentPlan === "DOWN_PAYMENT"
                ? "50% Down Payment"
                : payment.paymentPlan === "FULL_PAYMENT"
                  ? "Full Payment"
                  : "—",
            paymentMethod:
              payment.paymentMethod === "QR_PLACEHOLDER"
                ? "QR Payment (Placeholder)"
                : payment.paymentMethod || "—",
            paymentReference:
              payment.paymentPlan === "DOWN_PAYMENT"
                ? "50% down payment selected"
                : payment.paymentPlan === "FULL_PAYMENT"
                  ? "Full payment selected"
                  : "—",
            paymentReference: payment.paymentReference || "—",
            paymentDate: "—",
            status:
              isPendingRental(rental.status)
                ? "Pending"
                : rental.status === "APPROVED"
                  ? "Approved"
                  : rental.status === "COMPLETED"
                    ? "Returned"
                    : rental.status === "CANCELLED" || rental.status === "REJECTED"
                      ? "Rejected"
                      : rental.status,
          };
        });

        setRentals(mapped);
      } catch (error) {
        console.error("Failed to load rental requests:", error);
        setActionError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load rental requests.",
        );
      }
    };

    loadRentals();
  }, []);

  useEffect(() => {
    getReturnConditions()
      .then((conditions) => setReturnConditions(Array.isArray(conditions) ? conditions : []))
      .catch((error) => setActionError(error?.message || "Unable to load return conditions."));
  }, []);

  /* --------------------------------------------------
     Filter
  -------------------------------------------------- */

  const filteredRentals =
    statusFilter === "All"
      ? rentals
      : rentals.filter((rental) => rental.status === statusFilter);

  /* --------------------------------------------------
     View Details
  -------------------------------------------------- */

  const handleViewDetails = (rental) => {
    setSelectedRental(rental);
    setActionError("");
    setCancellationReason("");
    setCancellationMode(false);
    setReturnAt(toDateTimeLocalValue());
    setReceiveAt(toDateTimeLocalValue());
    setDepositAmount('0');
    setReturnCondition("GOOD");
    setDamageFee("0");
    setShowDetails(true);
  };

  /* --------------------------------------------------
     Approve
  -------------------------------------------------- */

  const handleApprove = async () => {
    if (!selectedRental) return;

    try {
      setActionLoading(true);
      setActionError("");
      const updated = await approveInstrumentRental(selectedRental.id);
      const next = { ...selectedRental, ...updated, status: "Approved" };
      setRentals((current) =>
        current.map((rental) => (rental.id === next.id ? next : rental)),
      );
      setSelectedRental(next);
    } catch (error) {
      setActionError(error?.response?.data?.message || error?.message || "Unable to approve this rental.");
    } finally {
      setActionLoading(false);
    }
  };

  /* --------------------------------------------------
     Reject
  -------------------------------------------------- */

  const handleReject = async () => {
    if (!selectedRental) return;

    try {
      setActionLoading(true);
      setActionError("");
      const updated = await cancelInstrumentRental(
        selectedRental.id,
        cancellationReason,
      );
      const next = { ...selectedRental, ...updated, status: "Rejected" };
      setRentals((current) =>
        current.map((rental) => (rental.id === next.id ? next : rental)),
      );
      setSelectedRental(next);
    } catch (error) {
      setActionError(error?.response?.data?.message || error?.message || "Unable to cancel this rental.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = () => {
    setReturnAt(toDateTimeLocalValue());
    setReturnCondition("GOOD");
    setDamageFee("0");
    setShowReturnDialog(true);
  };

  const handleReceive = () => {
    setReceiveAt(toDateTimeLocalValue());
    setDepositAmount('0');
    setShowReceiveDialog(true);
  };

  const handleConfirmReceive = async () => {
    if (!selectedRental) return;
    try {
      setActionLoading(true);
      setActionError('');
      const updated = await receiveInstrumentRental(selectedRental.id, {
        receivedAt: new Date(receiveAt).toISOString(),
        depositAmount: Number(depositAmount || 0),
      });
      const next = { ...selectedRental, ...updated, status: 'Approved' };
      setRentals((current) => current.map((rental) => rental.id === next.id ? next : rental));
      setSelectedRental(next);
      setShowReceiveDialog(false);
    } catch (error) {
      setActionError(error?.response?.data?.message || error?.message || 'Unable to record the instrument handover.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedRental) return;

    try {
      setActionLoading(true);
      setActionError("");
      const updated = await returnInstrumentRental(selectedRental.id, {
        returnedAt: new Date(returnAt).toISOString(),
        condition: returnCondition,
        damageFee: Number(damageFee || 0),
      });
      const next = { ...selectedRental, ...updated, status: "Returned" };
      setRentals((current) =>
        current.map((rental) => (rental.id === next.id ? next : rental)),
      );
      setSelectedRental(next);
      setShowReturnDialog(false);
    } catch (error) {
      setActionError(error?.response?.data?.message || error?.message || "Unable to mark this rental as returned.");
    } finally {
      setActionLoading(false);
    }
  };

  const selectedCondition = returnConditions.find(
    (condition) => condition.value === returnCondition,
  );
  const expectedReturnAt = selectedRental?.scheduledEnd
    ? new Date(selectedRental.scheduledEnd)
    : null;
  const actualReturnAt = returnAt ? new Date(returnAt) : null;
  const lateMinutes = expectedReturnAt && actualReturnAt
    ? Math.max(0, Math.ceil((actualReturnAt - expectedReturnAt) / (1000 * 60)))
    : 0;
  const excessHours = lateMinutes > 0 ? Math.ceil(lateMinutes / 60) : 0;
  const instrumentRate = (selectedRental?.items || []).reduce(
    (total, item) => total + Number(item.instrument?.rentalRate || 0),
    0,
  );
  const excessHourlyRate = instrumentRate / 8;
  const excessCharge = excessHours * excessHourlyRate;
  const damageCharge = Number(damageFee || 0);

  /* --------------------------------------------------
     Status Badge
  -------------------------------------------------- */

  const getStatusVariant = (status) => {
    if (status === "Approved") {
      return "default";
    }

    if (status === "Rejected") {
      return "destructive";
    }

    return "secondary";
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          {/* ---------------------------------------------
              Page Header
          --------------------------------------------- */}
          <div>
            <h1 className="text-2xl font-semibold">Rentals</h1>

            <p className="text-muted-foreground">
              Review and manage instrument rental requests.
            </p>
          </div>
          {/* ---------------------------------------------
              Rental Card
          --------------------------------------------- */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Rental Requests</CardTitle>

                  <CardDescription>
                    View and manage all instrument rental requests.
                  </CardDescription>
                </div>

                {/* -----------------------------------------
                    Status Filter
                ----------------------------------------- */}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        className="min-w-[140px] justify-between"
                      />
                    }
                  >
                    <span>
                      {statusFilter === "All" ? "All Rentals" : statusFilter}

                      <ChevronDown className="ml-2 size-4" />
                    </span>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setStatusFilter("All")}>
                      All Rentals
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

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Returned")}
                    >
                      Returned
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            {/* ---------------------------------------------
                Table
            --------------------------------------------- */}

            <CardContent>
              {actionError && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {actionError}
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rental ID</TableHead>

                      <TableHead>Student</TableHead>

                      <TableHead>Instrument</TableHead>

                      <TableHead>Rental Period</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="w-[80px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRentals.length > 0 ? (
                      filteredRentals.map((rental) => (
                        <TableRow key={rental.id}>
                          {/* Rental ID */}

                          <TableCell className="font-medium">
                            {formatRentalReference(rental.id)}
                          </TableCell>

                          {/* Student */}

                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {rental.student}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {rental.email}
                              </div>
                            </div>
                          </TableCell>

                          {/* Instrument */}

                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {rental.instrument}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {rental.type}
                              </div>
                            </div>
                          </TableCell>

                          {/* Rental Period */}

                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {formatRentalDate(rental.rentalDate)}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                to {formatRentalDate(rental.returnDate)}
                              </div>
                            </div>
                          </TableCell>

                          {/* Status */}

                          <TableCell>
                            <Badge variant={getStatusVariant(rental.status)}>
                              {rental.status}
                            </Badge>
                          </TableCell>

                          {/* Actions */}

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={
                                isPendingRental(rental.status)
                                  ? "Review rental"
                                  : "View rental details"
                              }
                              onClick={() => handleViewDetails(rental)}
                            >
                              {isPendingRental(rental.status) ? (
                                <span className="text-xs font-medium">Review</span>
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
                          No rental requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {/* ---------------------------------------------
              Rental Details Dialog
          --------------------------------------------- */}
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="sm:max-w-[520px] sm:max-h-[90vh] overflow-y-auto">
              {selectedRental && (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <DialogTitle>Rental Request</DialogTitle>
                        <DialogDescription>
                          {formatRentalReference(selectedRental.id)} · Review
                          rental information
                        </DialogDescription>
                      </div>

                      <Badge variant={getStatusVariant(selectedRental.status)}>
                        {selectedRental.status}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Student & Instrument */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Student
                          </p>
                          <p className="font-medium">
                            {selectedRental.student}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Instrument
                          </p>
                          <p className="font-medium">
                            {selectedRental.instrument}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="truncate font-medium">
                            {selectedRental.email}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedRental.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Rental Period */}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">
                        Rental Period
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Rental Date
                          </p>
                          <p className="font-medium">
                            {formatRentalDate(selectedRental.rentalDate)}
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Return Date
                          </p>
                          <p className="font-medium">
                            {formatRentalDate(selectedRental.returnDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Payment</h3>

                        <Badge
                          variant={
                            selectedRental.paymentStatus === "Paid"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedRental.paymentStatus}
                        </Badge>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Rental Fee
                            </p>
                            <p className="font-medium">
                              {selectedRental.rentalFee}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Deposit Collected
                            </p>
                            <p className="font-medium">
                              {selectedRental.metadata?.depositAmount ??
                                selectedRental.deposit ??
                                selectedRental.refundableDeposit ??
                                '—'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Instrument Handover
                            </p>
                            <p className="font-medium">
                              {selectedRental.metadata?.receivedAt
                                ? `Received ${formatRentalDate(selectedRental.metadata.receivedAt)}`
                                : 'Not received'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Total
                            </p>
                            <p className="font-semibold">
                              {selectedRental.totalAmount}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Method
                            </p>
                            <p className="font-medium">
                              {selectedRental.paymentMethod}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Payment Plan
                            </p>
                            <p className="font-medium">
                              {selectedRental.paymentPlan || "—"}
                            </p>
                          </div>

                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">
                              Reference
                            </p>
                            <p className="font-medium">
                              {selectedRental.paymentReference}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedRental.metadata?.paymentContinuationRequired && (
                      <div className="mt-3 rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                        <p className="text-sm font-medium">
                          Payment continuation required
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Remaining balance: ₱
                          {Number(
                            selectedRental.metadata.remainingAmount || 0,
                          ).toLocaleString()}. Billing continuation will be
                          handled later.
                        </p>
                      </div>
                    )}
                    {selectedRental.metadata?.excessHours > 0 && (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Late return charge</span>
                          <span>
                            ₱{Number(selectedRental.metadata.excessCharge || 0).toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedRental.metadata.excessHours} excess hour(s) at ₱
                          {Number(selectedRental.metadata.excessHourlyRate || 0).toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          per hour.
                        </p>
                      </div>
                    )}
                    {cancellationMode && (
                      <div>
                        <label
                          htmlFor="rental-cancellation-reason"
                          className="text-sm font-medium"
                        >
                          Cancellation reason
                        </label>
                        <textarea
                          id="rental-cancellation-reason"
                          value={cancellationReason}
                          onChange={(event) =>
                            setCancellationReason(event.target.value)
                          }
                          placeholder="Explain why this rental is being cancelled"
                          maxLength={500}
                          rows={3}
                          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <DialogFooter className="border-t pt-4">
                    {actionError && (
                      <p className="mr-auto text-sm text-destructive">
                        {actionError}
                      </p>
                    )}
                    {selectedRental?.status === "Approved" ? (
                      <>
                        {!selectedRental.metadata?.receivedAt && (
                          <Button variant="secondary" onClick={handleReceive} disabled={actionLoading}>
                            Receive Instrument
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setShowDetails(false)}
                          disabled={actionLoading || !canReturnRental(selectedRental)}
                          title={!canReturnRental(selectedRental) ? "Receive the instrument first" : "Mark the instrument as returned"}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={handleReturn}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 size-4" />
                          )}
                          {canReturnRental(selectedRental) ? "Mark as Returned" : "Receive instrument first"}
                        </Button>
                      </>
                    ) : canReviewRental(selectedRental) ? (
                      <>
                        {cancellationMode ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCancellationMode(false);
                                setCancellationReason("");
                              }}
                              disabled={actionLoading}
                            >
                              Keep rental
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleReject}
                              disabled={
                                actionLoading ||
                                cancellationReason.trim().length < 3
                              }
                            >
                              {actionLoading && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              )}
                              Confirm cancellation
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setCancellationMode(true)}
                            disabled={actionLoading}
                          >
                            <X className="mr-2 size-4" />
                            Cancel rental
                          </Button>
                        )}

                        <Button
                          onClick={handleApprove}
                          disabled={actionLoading || cancellationMode}
                        >
                          {actionLoading ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 size-4" />
                          )}
                          Approve Rental
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

          <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Receive Instrument</DialogTitle>
                <DialogDescription>
                  Record the time the client receives the instrument and the deposit collected.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="receive-at" className="text-sm font-medium">Received at</label>
                  <div className="flex gap-2">
                    <input id="receive-at" type="datetime-local" value={receiveAt} onChange={(event) => setReceiveAt(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
                    <Button type="button" variant="outline" onClick={() => setReceiveAt(toDateTimeLocalValue())}>Now</Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="deposit-amount" className="text-sm font-medium">Deposit collected</label>
                  <input id="deposit-amount" type="number" min="0" step="0.01" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" />
                  <p className="text-xs text-muted-foreground">Enter the deposit amount actually collected. Any non-negative amount is accepted.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReceiveDialog(false)} disabled={actionLoading}>Cancel</Button>
                <Button onClick={handleConfirmReceive} disabled={actionLoading || !receiveAt || !Number.isFinite(Number(depositAmount)) || Number(depositAmount) < 0}>
                  {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Confirm receive
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Process instrument return</DialogTitle>
                <DialogDescription>
                  Confirm the actual return time and instrument condition before billing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Rental started</p>
                    <p className="font-medium">{formatRentalDate(selectedRental?.scheduledStart)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected return</p>
                    <p className="font-medium">{formatRentalDate(selectedRental?.scheduledEnd)}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="actual-return-time" className="text-sm font-medium">
                    Actual return time
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="actual-return-time"
                      type="datetime-local"
                      value={returnAt}
                      onChange={(event) => setReturnAt(event.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <Button type="button" variant="outline" onClick={() => setReturnAt(toDateTimeLocalValue())}>
                      Use current time
                    </Button>
                  </div>
                </div>

                <div>
                  <label htmlFor="return-condition" className="text-sm font-medium">
                    Instrument condition
                  </label>
                  <select
                    id="return-condition"
                    value={returnCondition}
                    onChange={(event) => setReturnCondition(event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {returnConditions.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="return-damage-fee" className="text-sm font-medium">
                    Damage fee
                  </label>
                  <div className="mt-2 flex items-center rounded-md border border-input bg-background">
                    <span className="px-3 text-sm text-muted-foreground">₱</span>
                    <input
                      id="return-damage-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={damageFee}
                      onChange={(event) => setDamageFee(event.target.value)}
                      className="h-10 w-full bg-transparent pr-3 text-sm outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter the assessed damage amount manually.
                  </p>
                </div>

                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Return charge summary</CardTitle>
                    <CardDescription>These charges will be added to Billing & Payments.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Excess time ({excessHours} hour{excessHours === 1 ? '' : 's'})</span>
                      <span>₱{excessCharge.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Damage charge</span>
                      <span>₱{damageCharge.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Additional amount</span>
                      <span>₱{(excessCharge + damageCharge).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReturnDialog(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmReturn} disabled={actionLoading || !returnAt || !selectedCondition || !Number.isFinite(Number(damageFee)) || Number(damageFee) < 0}>
                  {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Confirm return
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
