'use client';

import TransactionRefundPanel from '../components/TransactionRefundPanel';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileIcon,
  ChevronDown,
  Check,
  X,
  Loader2,
  RefreshCwIcon,
  AlertTriangle,
} from 'lucide-react';

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
  approveInstrumentRental,
  cancelInstrumentRental,
  getInstrumentRentals,
  getReturnConditions,
  receiveInstrumentRental,
  returnInstrumentRental,
} from '@/services/front-desk/instrument-rentalsService';

const formatRentalReference = (id) =>
  id ? `RNT-${id.slice(0, 8).toUpperCase()}` : '—';

const rentalIndicatorColor = (name) => {
  const colors = [
    'text-blue-600',
    'text-emerald-600',
    'text-violet-600',
    'text-orange-600',
    'text-pink-600',
    'text-cyan-600',
  ];
  const normalizedName = String(name || '');
  const colorIndex =
    [...normalizedName].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) % colors.length;

  return colors[colorIndex];
};

const formatRentalDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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
    id: 'RNT-001',
    student: 'Juan Dela Cruz',
    email: 'juan@example.com',
    phone: '09181234567',

    instrument: 'Yamaha Grand Piano',
    type: 'Piano',

    rentalDate: 'Sep 10, 2026',
    returnDate: 'Sep 17, 2026',

    rentalFee: '₱2,500',
    deposit: '₱1,000',
    totalAmount: '₱3,500',

    paymentStatus: 'Paid',
    paymentMethod: 'GCash',
    paymentReference: 'GC-20260910-001',
    paymentDate: 'Sep 9, 2026',

    status: 'Pending',
  },

  {
    id: 'RNT-002',
    student: 'Maria Santos',
    email: 'maria@example.com',
    phone: '09171234567',

    instrument: 'Fender Acoustic Guitar',
    type: 'Guitar',

    rentalDate: 'Sep 11, 2026',
    returnDate: 'Sep 18, 2026',

    rentalFee: '₱1,500',
    deposit: '₱500',
    totalAmount: '₱2,000',

    paymentStatus: 'Paid',
    paymentMethod: 'Cash',
    paymentReference: 'CASH-20260911-001',
    paymentDate: 'Sep 10, 2026',

    status: 'Approved',
  },

  {
    id: 'RNT-003',
    student: 'Pedro Reyes',
    email: 'pedro@example.com',
    phone: '09191234567',

    instrument: 'Yamaha Violin',
    type: 'Violin',

    rentalDate: 'Sep 12, 2026',
    returnDate: 'Sep 19, 2026',

    rentalFee: '₱1,200',
    deposit: '₱500',
    totalAmount: '₱1,700',

    paymentStatus: 'Pending',
    paymentMethod: 'GCash',
    paymentReference: 'GC-20260912-003',
    paymentDate: 'Sep 11, 2026',

    status: 'Pending',
  },

  {
    id: 'RNT-004',
    student: 'Ana Garcia',
    email: 'ana@example.com',
    phone: '09181239876',

    instrument: 'Fender Electric Guitar',
    type: 'Guitar',

    rentalDate: 'Sep 13, 2026',
    returnDate: 'Sep 20, 2026',

    rentalFee: '₱2,000',
    deposit: '₱1,000',
    totalAmount: '₱3,000',

    paymentStatus: 'Paid',
    paymentMethod: 'GCash',
    paymentReference: 'GC-20260913-004',
    paymentDate: 'Sep 12, 2026',

    status: 'Rejected',
  },
];

/* --------------------------------------------------
   Page
-------------------------------------------------- */

export default function RentalsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const [statusFilter, setStatusFilter] = useState('All');
  const [rentalPage, setRentalPage] = useState(1);
  const rentalPageSize = 10;

  const [selectedRental, setSelectedRental] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationMode, setCancellationMode] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveAt, setReceiveAt] = useState(toDateTimeLocalValue());
  const [depositAmount, setDepositAmount] = useState('0');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('');
  const [returnAt, setReturnAt] = useState(toDateTimeLocalValue());
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [damageFee, setDamageFee] = useState('0');
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
            .map((item) => item.instrument?.brand)
            .filter(Boolean)
            .join(', ');
          const instrumentItemNames = items
            .map((item) => item.instrument?.instrumentType?.name)
            .filter(Boolean)
            .join(', ');

          return {
            ...rental,
            student:
              [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
              'Client',
            email: person?.email || '—',
            phone: person?.phone || '—',
            instrument: instrumentNames || 'Instrument',
            type: instrumentItemNames || '—',
            rentalDate: rental.scheduledStart,
            returnDate: rental.scheduledEnd,
            rentalFee: rental.totalAmount,
            deposit: rental.refundableDeposit,
            totalAmount: rental.totalAmount,
            paymentStatus:
              payment.paymentStatus === 'PENDING_PROCEED'
                ? 'Pending QR payment'
                : payment.paymentStatus || 'Pending',
            paymentPlan:
              payment.paymentPlan === 'DOWN_PAYMENT'
                ? '50% Down Payment'
                : payment.paymentPlan === 'FULL_PAYMENT'
                  ? 'Full Payment'
                  : '—',
            paymentMethod:
              payment.paymentMethod === 'QR_PLACEHOLDER'
                ? 'QR Payment (Placeholder)'
                : payment.paymentMethod || '—',
            paymentReference:
              payment.paymentPlan === 'DOWN_PAYMENT'
                ? '50% down payment selected'
                : payment.paymentPlan === 'FULL_PAYMENT'
                  ? 'Full payment selected'
                  : '—',
            paymentReference: payment.paymentReference || '—',
            paymentDate: '—',
            status: isPendingRental(rental.status)
              ? 'Pending'
              : rental.status === 'APPROVED'
                ? 'Approved'
                : rental.status === 'COMPLETED'
                  ? 'Returned'
                  : rental.status === 'CANCELLED' ||
                      rental.status === 'REJECTED'
                    ? 'Rejected'
                    : rental.status,
          };
        });

        setRentals(mapped);
      } catch (error) {
        console.error('Failed to load rental requests:', error);
        setActionError(
          error?.response?.data?.message ||
            error?.message ||
            'Unable to load rental requests.',
        );
      }
    };

    loadRentals();
  }, [refreshKey]);

  useEffect(() => {
    getReturnConditions()
      .then((conditions) =>
        setReturnConditions(Array.isArray(conditions) ? conditions : []),
      )
      .catch((error) =>
        setActionError(error?.message || 'Unable to load return conditions.'),
      );
  }, []);

  /* --------------------------------------------------
     Filter
  -------------------------------------------------- */

  const filteredRentals =
    statusFilter === 'All'
      ? rentals
      : rentals.filter((rental) => rental.status === statusFilter);
  const rentalPageCount = Math.max(
    1,
    Math.ceil(filteredRentals.length / rentalPageSize),
  );
  const paginatedRentals = filteredRentals.slice(
    (rentalPage - 1) * rentalPageSize,
    rentalPage * rentalPageSize,
  );

  /* --------------------------------------------------
     View Details
  -------------------------------------------------- */

  const handleViewDetails = (rental) => {
    setSelectedRental(rental);
    setActionError('');
    setCancellationReason('');
    setCancellationMode(false);
    setReturnAt(toDateTimeLocalValue());
    setReceiveAt(toDateTimeLocalValue());
    setDepositAmount('0');
    setReturnCondition('GOOD');
    setDamageFee('0');
    setShowDetails(true);
  };

  /* --------------------------------------------------
     Approve
  -------------------------------------------------- */

  const handleApprove = async () => {
    if (!selectedRental) return;

    try {
      setActionLoading(true);
      setActionError('');
      const updated = await approveInstrumentRental(selectedRental.id);
      const next = { ...selectedRental, ...updated, status: 'Approved' };
      setRentals((current) =>
        current.map((rental) => (rental.id === next.id ? next : rental)),
      );
      setSelectedRental(next);
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to approve this rental.',
      );
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
      setActionError('');
      const updated = await cancelInstrumentRental(
        selectedRental.id,
        cancellationReason,
      );
      const next = { ...selectedRental, ...updated, status: 'Rejected' };
      setRentals((current) =>
        current.map((rental) => (rental.id === next.id ? next : rental)),
      );
      setSelectedRental(next);
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to cancel this rental.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const inUsedInstruments = rentals.filter(
    (rental) => rental.status === 'Approved' && Boolean(rental.metadata?.receivedAt),
  ).sort((a, b) => new Date(a.scheduledEnd) - new Date(b.scheduledEnd));
  const instrumentOverdue = (rental) =>
    Number.isFinite(new Date(rental.scheduledEnd).getTime()) &&
    new Date(rental.scheduledEnd).getTime() <= currentTime;

  const handleReturn = () => {
    setReturnAt(toDateTimeLocalValue());
    setReturnCondition('GOOD');
    setDamageFee('0');
    setShowReturnDialog(true);
  };

  const handleReceive = () => {
    setReceiveAt(toDateTimeLocalValue());
    setDepositAmount('0');
    setIdNumber('');
    setIdType('');
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
        idNumber,
        idType,
      });
      const next = { ...selectedRental, ...updated, status: 'Approved' };
      setRentals((current) =>
        current.map((rental) => (rental.id === next.id ? next : rental)),
      );
      setSelectedRental(next);
      setShowReceiveDialog(false);
      setShowDetails(false);
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to record the instrument handover.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedRental) return;
    if (returnCondition !== 'GOOD' && Number(damageFee) <= 0) {
      setActionError('Enter a damage fee greater than 0 for this condition.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError('');
      const updated = await returnInstrumentRental(selectedRental.id, {
        returnedAt: new Date(returnAt).toISOString(),
        condition: returnCondition,
        damageFee: Number(damageFee || 0),
      });
      const next = { ...selectedRental, ...updated, status: 'Returned' };
      setRentals((current) =>
        current.map((rental) => (rental.id === next.id ? next : rental)),
      );
      setSelectedRental(next);
      setShowReturnDialog(false);
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to mark this rental as returned.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const selectedCondition = returnConditions.find(
    (condition) => condition.value === returnCondition,
  );
  const conditionDescription = {
    GOOD: 'Returned in working condition with no assessed damage.',
    MINOR_DAMAGE: 'Usable, but requires minor repair or maintenance.',
    MAJOR_DAMAGE: 'Significant damage that requires major repair or replacement parts.',
    LOST: 'The instrument was not returned or cannot be located.',
  }[returnCondition];
  const expectedReturnAt = selectedRental?.scheduledEnd
    ? new Date(selectedRental.scheduledEnd)
    : null;
  const actualReturnAt = returnAt ? new Date(returnAt) : null;
  const lateMinutes =
    expectedReturnAt && actualReturnAt
      ? Math.max(
          0,
          Math.ceil((actualReturnAt - expectedReturnAt) / (1000 * 60)),
        )
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
    if (status === 'Approved') {
      return 'default';
    }

    if (status === 'Rejected') {
      return 'destructive';
    }

    return 'secondary';
  };
  const statusDotClass = (status) => {
    if (status === 'Approved') return 'bg-emerald-500';
    if (status === 'Returned') return 'bg-slate-500';
    if (status === 'Rejected') return 'bg-red-500';
    return 'bg-amber-500';
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Rentals</h1>

                <p className="text-muted-foreground">
                  Review and manage instrument rental requests.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRefreshKey((key) => key + 1)}
                >
                  <RefreshCwIcon className="mr-2 size-4" />
                  Refresh
                </Button>
                <Button onClick={() => navigate('/front-desk/rentals/walk-in')}>
                  New walk-in rental
                </Button>
              </div>
            </div>
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>In Used Instruments</CardTitle>
                  <CardDescription>Instruments handed over to clients and awaiting return processing.</CardDescription>
                </div>
                <Badge variant="secondary">{inUsedInstruments.length} in use</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {inUsedInstruments.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  No instruments are currently in use.
                </p>
              ) : (
                <div className="space-y-3">
                  {inUsedInstruments.map((rental) => {
                    const overdue = instrumentOverdue(rental);
                    return (
                      <div key={rental.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold">{rental.instrument}</p>
                          <p className="text-sm text-muted-foreground">{rental.student} · {formatRentalReference(rental.id)}</p>
                          <p className="text-sm text-muted-foreground">Expected return: {formatRentalDate(rental.scheduledEnd)}</p>
                          {overdue && (
                            <p role="alert" className="text-sm font-medium text-destructive">
                              Return time passed — process instrument return.
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant={overdue ? 'destructive' : 'secondary'}>
                            {overdue ? 'Return overdue' : 'In use'}
                          </Badge>
                          <Button size="sm" onClick={() => handleViewDetails(rental)}>
                            Process return
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
                      {statusFilter === 'All' ? 'All Rentals' : statusFilter}

                      <ChevronDown className="ml-2 size-4" />
                    </span>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setStatusFilter('All')}>
                      All Rentals
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter('Pending')}
                    >
                      Pending
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter('Approved')}
                    >
                      Approved
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter('Rejected')}
                    >
                      Rejected
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter('Returned')}
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
              {filteredRentals.some((rental) => isPendingRental(rental.status)) && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">Pending rental requests need review.</p>
                    <p className="text-muted-foreground">
                      Review the pending request before approving or cancelling it.
                    </p>
                  </div>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rental ID</TableHead>

                      <TableHead>Client</TableHead>

                      <TableHead>Instrument Name</TableHead>

                      <TableHead>Rental Period</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="w-[80px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRentals.length > 0 ? (
                      paginatedRentals.map((rental) => (
                        <TableRow key={rental.id}>
                          {/* Rental ID */}

                          <TableCell className="font-medium">
                            {formatRentalReference(rental.id)}
                          </TableCell>

                          {/* Client */}

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
                              <div
                                className={`font-medium ${rentalIndicatorColor(rental.instrument)}`}
                              >
                                {rental.type}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {rental.instrument}
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
                            <Badge variant={getStatusVariant(rental.status)} className="gap-1.5">
                              <span aria-hidden="true" className={`size-1.5 rounded-full ${statusDotClass(rental.status)}`} />
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
                                  ? 'Review rental'
                                  : 'View rental details'
                              }
                              onClick={() => handleViewDetails(rental)}
                            >
                              {isPendingRental(rental.status) ? (
                                <span className="text-xs font-medium">
                                  Review
                                </span>
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
              {rentalPageCount > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {rentalPage} of {rentalPageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={rentalPage === 1}
                      onClick={() => setRentalPage((page) => page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={rentalPage === rentalPageCount}
                      onClick={() => setRentalPage((page) => page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* ---------------------------------------------
              Rental Details Dialog
          --------------------------------------------- */}
          <Dialog
            open={showDetails}
            onOpenChange={setShowDetails}
            disablePointerDismissal
          >
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
                    {/* Client & Instrument */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Client
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
                            selectedRental.paymentStatus === 'Paid'
                              ? 'default'
                              : 'secondary'
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
                              ₱{Number(selectedRental.metadata?.depositAmount ?? 0).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
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
                              ID Type
                            </p>
                            <p className="font-medium">
                              {selectedRental.metadata?.idType || 'Not recorded'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              ID Number
                            </p>
                            <p className="font-medium">
                              {selectedRental.metadata?.idNumber || 'Not recorded'}
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
                              {selectedRental.paymentPlan || '—'}
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
                          ).toLocaleString()}
                          . Billing continuation will be handled later.
                        </p>
                      </div>
                    )}
                    {selectedRental.metadata?.excessHours > 0 && (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Late return charge</span>
                          <span>
                            ₱
                            {Number(
                              selectedRental.metadata.excessCharge || 0,
                            ).toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedRental.metadata.excessHours} excess hour(s)
                          at ₱
                          {Number(
                            selectedRental.metadata.excessHourlyRate || 0,
                          ).toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          per hour.
                        </p>
                      </div>
                    )}
                    {selectedRental.metadata?.depositAmount != null && selectedRental.metadata?.returnStatus === 'RETURNED' && (
                      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
                        <p className="text-sm font-medium">Deposit settlement</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between"><span>Deposit collected</span><span>₱{Number(selectedRental.metadata.depositAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between"><span>Applied to charges</span><span>₱{Number(selectedRental.metadata.depositAppliedAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between font-semibold"><span>Deposit to return</span><span>₱{Number(selectedRental.metadata.depositRefundAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                          {Number(selectedRental.metadata.additionalAmountDue || 0) > 0 && <div className="flex justify-between font-semibold text-destructive"><span>Additional damage balance</span><span>₱{Number(selectedRental.metadata.additionalAmountDue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">The deposit is tracked separately from rental payments and must be returned or applied according to this settlement.</p>
                      </div>
                    )}
                    {['Rejected', 'CANCELLED', 'REJECTED'].includes(selectedRental.status) && (
                      <TransactionRefundPanel
                        type="INSTRUMENT_RENTAL"
                        transactionId={selectedRental.id}
                        onRefundRecorded={(quote) => {
                          setSelectedRental((current) => current ? {
                            ...current,
                            paymentStatus: 'REFUNDED',
                            metadata: { ...current.metadata, refundStatus: 'RECORDED', refundAmount: quote.refundedAmount, paymentStatus: 'REFUNDED', netPaidAmount: 0 },
                          } : current);
                          setRentals((current) => current.map((item) => item.id === selectedRental.id ? {
                            ...item, paymentStatus: 'REFUNDED',
                            metadata: { ...item.metadata, refundStatus: 'RECORDED', refundAmount: quote.refundedAmount, paymentStatus: 'REFUNDED' },
                          } : item));
                        }}
                      />
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
                    {selectedRental?.status === 'Approved' ? (
                      selectedRental.metadata?.receivedAt ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setShowDetails(false)}
                            disabled={actionLoading}
                          >
                            Close
                          </Button>
                          <Button onClick={handleReturn} disabled={actionLoading}>
                            {actionLoading ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 size-4" />
                            )}
                            Mark as Returned
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={handleReceive}
                            disabled={actionLoading}
                          >
                            Release Instrument
                          </Button>
                        </>
                      )
                    ) : canReviewRental(selectedRental) ? (
                      <>
                        {cancellationMode ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCancellationMode(false);
                                setCancellationReason('');
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

          <Dialog
            open={showReceiveDialog}
            onOpenChange={setShowReceiveDialog}
            disablePointerDismissal
          >
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Receive Instrument</DialogTitle>
                <DialogDescription>
                  Record the time the client receives the instrument and the
                  deposit collected.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="receive-at" className="text-sm font-medium">
                    Received at
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="receive-at"
                      type="datetime-local"
                      value={receiveAt}
                      onChange={(event) => setReceiveAt(event.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReceiveAt(toDateTimeLocalValue())}
                    >
                      Now
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="id-type" className="text-sm font-medium">
                    Type of ID
                  </label>
                  <input
                    id="id-type"
                    type="text"
                    value={idType}
                    onChange={(event) => setIdType(event.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="e.g. Driver's license"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="id-number" className="text-sm font-medium">
                    ID number
                  </label>
                  <input
                    id="id-number"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    value={idNumber}
                    onChange={(event) =>
                      setIdNumber(event.target.value.replace(/\D/g, '').slice(0, 15))
                    }
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="Enter ID number"
                  />
                  <p className="text-xs text-muted-foreground">
                    Numbers only, maximum 15 digits.
                  </p>
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="deposit-amount"
                    className="text-sm font-medium"
                  >
                    Deposit collected
                  </label>
                  <input
                    id="deposit-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(event.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the deposit amount actually collected. Any
                    non-negative amount is accepted.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowReceiveDialog(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReceive}
                  disabled={
                    actionLoading ||
                    !receiveAt ||
                    !idType.trim() ||
                    !/^\d{1,15}$/.test(idNumber) ||
                    !Number.isFinite(Number(depositAmount)) ||
                    Number(depositAmount) < 0
                  }
                >
                  {actionLoading && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Confirm receive
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={showReturnDialog}
            onOpenChange={setShowReturnDialog}
            disablePointerDismissal
          >
            <DialogContent className="max-h-[90vh] max-w-[min(720px,calc(100vw-2rem))] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Process instrument return</DialogTitle>
                <DialogDescription>
                  Confirm the actual return time and instrument condition before
                  billing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Rental started
                    </p>
                    <p className="break-words font-medium">
                      {formatRentalDate(selectedRental?.scheduledStart)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Expected return
                    </p>
                    <p className="break-words font-medium">
                      {formatRentalDate(selectedRental?.scheduledEnd)}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="actual-return-time"
                    className="text-sm font-medium"
                  >
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReturnAt(toDateTimeLocalValue())}
                    >
                      Use current time
                    </Button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="return-condition"
                    className="text-sm font-medium"
                  >
                    Instrument condition
                  </label>
                  <select
                    id="return-condition"
                    value={returnCondition}
                    onChange={(event) => {
                      setReturnCondition(event.target.value);
                      setDamageFee('0');
                    }}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {returnConditions.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                  {selectedCondition && (
                    <div className="mt-3 grid gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <p className="font-medium">{selectedCondition.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {conditionDescription}
                        </p>
                      </div>
                      {returnCondition !== 'GOOD' && (
                        <div className="text-left sm:text-right">
                          <label htmlFor="return-damage-fee" className="text-xs text-muted-foreground">
                            Damage fee
                          </label>
                          <div className="mt-1 flex items-center rounded-md border border-input bg-background">
                            <span className="px-2 text-sm text-muted-foreground">₱</span>
                            <input
                              id="return-damage-fee"
                              type="text"
                              inputMode="decimal"
                              value={damageFee}
                              onChange={(event) => setDamageFee(event.target.value)}
                              className="h-9 w-28 bg-transparent pr-2 text-right text-sm outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Return charge summary
                    </CardTitle>
                    <CardDescription>
                      These charges will be added to Billing & Payments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1">
                      <span className="min-w-0">
                        Excess time ({excessHours} hour
                        {excessHours === 1 ? '' : 's'})
                      </span>
                      <span className="break-all text-right">
                        ₱
                        {excessCharge.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1">
                      <span className="min-w-0">Damage charge</span>
                      <span className="break-all text-right">
                        ₱
                        {damageCharge.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 border-t pt-2 font-semibold">
                      <span className="min-w-0">Additional amount</span>
                      <span className="break-all text-right">
                        ₱
                        {(excessCharge + damageCharge).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowReturnDialog(false)}
                  disabled={actionLoading}
                >
                  Close
                </Button>
                <Button
                  onClick={handleConfirmReturn}
                  disabled={
                    actionLoading ||
                    !returnAt ||
                    !selectedCondition ||
                    !Number.isFinite(Number(damageFee)) ||
                    Number(damageFee) < 0 ||
                    (returnCondition !== 'GOOD' && Number(damageFee) <= 0)
                  }
                >
                  {actionLoading && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
