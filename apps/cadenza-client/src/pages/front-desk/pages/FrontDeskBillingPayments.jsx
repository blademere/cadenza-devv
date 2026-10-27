import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Printer,
  Search,
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
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { apiClient } from '@/core/api/apiClient';
import ThermalReceipt from '../components/ThermalReceipt';

const formatCurrency = (amount) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const unwrapList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : [];
};
const personName = (record) => {
  const person = record.customer?.person;
  return (
    [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
    record.student ||
    'Client'
  );
};
const paymentStatus = (paid, total) =>
  paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid';
const statusVariant = (status) =>
  status === 'Paid'
    ? 'default'
    : status === 'Partially Paid'
      ? 'secondary'
      : 'outline';

const formatSourceReference = (transaction) => {
  const prefix = transaction.type === 'Enrollment' ? 'ENR' : transaction.type === 'Instrument Rental' ? 'RNT' : 'RB';
  return `${prefix}-${String(transaction.sourceId || '').slice(0, 8).toUpperCase()}`;
};

const mapTransaction = (
  record,
  type,
  details,
  totalAmount,
  paidAmount,
  reference,
) => ({
  id: `${type.toUpperCase().replace(/\s/g, '-')}-${record.id}`,
  sourceId: record.id,
  person: personName(record),
  email: record.customer?.person?.email || record.studentEmail || '—',
  type,
  details,
  date: record.createdAt || record.scheduledStart,
  totalAmount: Number(totalAmount || 0),
  payments:
    paidAmount > 0
      ? [
          {
            id: `INITIAL-${record.id}`,
            amount: Number(paidAmount),
            method: record.metadata?.paymentMethod || 'Online',
            reference: reference || '—',
            processedAt:
              record.metadata?.paymentCompletedAt || record.createdAt,
          },
        ]
      : [],
  metadata: record.metadata || {},
  rentalStatus: ['Instrument Rental', 'Room Booking'].includes(type)
    ? record.status
    : null,
  returnedAt: ['Instrument Rental', 'Room Booking'].includes(type)
    ? record.returnedAt
    : null,
});

const mapRecords = (enrollments, bookings, rentals) =>
  [
    ...enrollments
      .filter((item) => item.status === 'APPROVED')
      .map((item) =>
        mapTransaction(
          item,
          'Enrollment',
          item.packageName || 'Enrollment package',
          item.price,
          item.metadata?.paymentStatus === 'PENDING_CONFIRMATION' ? 0 : (item.metadata?.initialPaymentAmount ?? item.metadata?.paymentAmount ?? 0),
          item.metadata?.paymentReference,
        ),
      ),
    ...bookings
      .filter((item) =>
        ['APPROVED', 'CHECKED_IN', 'COMPLETED'].includes(item.status),
      )
      .map((item) =>
        mapTransaction(
          item,
          'Room Booking',
          item.room?.name || 'Room booking',
          item.totalAmount,
          item.metadata?.paymentStatus === 'PENDING_CONFIRMATION' ? 0 : (item.metadata?.initialPaymentAmount ?? 0),
          item.metadata?.paymentReference,
        ),
      ),
    ...rentals
      .filter((item) => ['APPROVED', 'COMPLETED'].includes(item.status))
      .map((item) =>
        mapTransaction(
          item,
          'Instrument Rental',
          item.items
            ?.map((entry) =>
              [entry.instrument?.brand, entry.instrument?.model]
                .filter(Boolean)
                .join(' '),
            )
            .filter(Boolean)
            .join(', ') || 'Instrument rental',
          item.totalAmount,
          item.metadata?.paymentStatus === 'PENDING_CONFIRMATION' ? 0 : (item.metadata?.initialPaymentAmount ?? 0),
          item.metadata?.paymentReference,
        ),
      ),
  ].map((transaction) => ({
    ...transaction,
    status: paymentStatus(
      transaction.payments.reduce((sum, payment) => sum + payment.amount, 0),
      transaction.totalAmount,
    ),
  }));

const paidAmount = (transaction) =>
  transaction.payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
const moneyInCents = (amount) => Math.round(Number(amount || 0) * 100);
const remainingAmount = (transaction) =>
  Math.max(
    0,
    (moneyInCents(transaction.totalAmount) - moneyInCents(paidAmount(transaction))) / 100,
  );
const createPaymentAttemptKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
const canProcessTransaction = (transaction) =>
  !['Instrument Rental', 'Room Booking'].includes(transaction.type) ||
  transaction.rentalStatus === 'COMPLETED';

export default function BillingPayments() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountToPay, setAmountToPay] = useState('');
  const [processing, setProcessing] = useState(false);
  const paymentAttempt = useRef(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/enrollments'),
      apiClient.get('/room-bookings'),
      apiClient.get('/instrument-rentals'),
    ])
      .then(async (results) => {
        const [enrollments, bookings, rentals] = results.map((result) =>
          result.status === 'fulfilled' ? unwrapList(result.value) : [],
        );
        let history = [];
        try {
          history = unwrapList(await apiClient.get('/billing/payments/transactions'));
        } catch {
          setError('Unable to load the cashier payment history.');
        }
        const grouped = new Map();
        for (const payment of history) {
          const key = `${payment.transactionType}:${payment.sourceId}`;
          grouped.set(key, [...(grouped.get(key) || []), {
            id: payment.id, amount: Number(payment.amount), method: payment.method,
            reference: payment.reference, processedAt: payment.createdAt,
          }]);
        }
        setTransactions(mapRecords(enrollments, bookings, rentals).map((item) => {
          const kind = item.type === 'Enrollment' ? 'ENROLLMENT' : item.type === 'Room Booking' ? 'ROOM_BOOKING' : 'INSTRUMENT_RENTAL';
          const payments = [...item.payments, ...(grouped.get(`${kind}:${item.sourceId}`) || [])];
          return { ...item, payments, status: paymentStatus(payments.reduce((sum, p) => sum + Number(p.amount), 0), item.totalAmount) };
        }));
        if (results.every((result) => result.status === 'rejected'))
          setError('Unable to load billing records.');
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesStatus =
        statusFilter === 'All' || transaction.status === statusFilter;
      const matchesType =
        typeFilter === 'All' || transaction.type === typeFilter;
      const searchable = [
        transaction.id,
        transaction.sourceId,
        formatSourceReference(transaction),
        transaction.person,
        transaction.email,
        transaction.details,
        transaction.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        matchesStatus && matchesType && (!query || searchable.includes(query))
      );
    });
  }, [search, statusFilter, transactions, typeFilter]);
  const pageCount = Math.ceil(filteredTransactions.length / pageSize);
  const pagedTransactions = filteredTransactions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const paidCount = transactions.filter(
    (transaction) => transaction.status === 'Paid',
  ).length;
  const partialCount = transactions.filter(
    (transaction) => transaction.status === 'Partially Paid',
  ).length;
  const outstanding = transactions.reduce(
    (sum, transaction) => sum + remainingAmount(transaction),
    0,
  );

  const openPayment = (transaction) => {
    if (!canProcessTransaction(transaction)) {
      setError(
        transaction.type === 'Room Booking'
          ? 'Check out the room booking before issuing a receipt.'
          : 'Mark the instrument rental as returned before issuing a receipt.',
      );
      return;
    }
    setSelectedTransaction(transaction);
    setPaymentMethod('Cash');
    setPaymentReference('');
    setAmountToPay(String(remainingAmount(transaction)));
    setShowPaymentDialog(true);
  };

  const submitCashierPayment = async (amount, method, reference) => {
    if (!selectedTransaction || processing) return;
    if (!canProcessTransaction(selectedTransaction)) {
      setError('Complete the rental or room booking before recording payment.');
      return;
    }
    const amountText = String(amount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(amountText) || amount > remainingAmount(selectedTransaction)) {
      setError('Enter a valid payment amount no greater than the balance.');
      return;
    }
    if (method !== 'Cash' && reference.trim().length < 3) {
      setError('Enter the verified external payment reference.');
      return;
    }
    setProcessing(true);
    setError('');
    const signature = JSON.stringify([selectedTransaction.sourceId, selectedTransaction.type, amount, method, reference.trim()]);
    if (paymentAttempt.current?.signature !== signature) {
      paymentAttempt.current = { signature, key: createPaymentAttemptKey() };
    }
    const idempotencyKey = paymentAttempt.current.key;
    const receiptReference = method === 'Cash' ? `FD-${idempotencyKey}` : reference.trim();
    try {
      const response = await apiClient.post('/billing/payments/transactions', {
        type: selectedTransaction.type, id: selectedTransaction.sourceId,
        amount, method, reference: receiptReference, idempotencyKey,
      });
      // apiClient returns the API envelope unchanged: { success, data: { payment } }.
      const record = response.data?.payment;
      if (!record?.id) throw new Error('Payment could not be confirmed.');
      const payment = {
        id: record.id, amount: Number(record.amount), method: record.method,
        reference: record.reference, processedAt: record.createdAt,
      };
      const updated = {
        ...selectedTransaction,
        payments: [...selectedTransaction.payments, payment],
      };
      updated.status = paymentStatus(paidAmount(updated), updated.totalAmount);
      setTransactions((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedTransaction(updated);
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      paymentAttempt.current = null;
    } catch (requestError) {
      setError(requestError?.message || 'Unable to record this payment.');
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = () => submitCashierPayment(Number(amountToPay), paymentMethod, paymentReference);
  const markAsPaid = () => submitCashierPayment(remainingAmount(selectedTransaction), 'Cash', '');

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Billing & Payments</h1>
              <p className="text-muted-foreground">
                Front-desk cashier workspace for client receipts and payment
                continuation.
              </p>
            </div>
            <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
              Refresh
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Paid Transactions</CardDescription>
                <CardTitle className="text-2xl">{paidCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Fully paid client records
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Partial Payments</CardDescription>
                <CardTitle className="text-2xl">{partialCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Receipts with remaining balance
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Outstanding Balance</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(outstanding)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Remaining cashier balance
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle>Cashier Transactions</CardTitle>
                  <CardDescription>
                    Use the receipt action to record a continuation payment or
                    reprint a receipt.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-56 flex-1">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search transactions..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" />}>
                      {statusFilter === 'All' ? 'All Statuses' : statusFilter}
                      <ChevronDown className="ml-2 size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {['All', 'Unpaid', 'Partially Paid', 'Paid'].map(
                        (value) => (
                          <DropdownMenuItem
                            key={value}
                            onClick={() => setStatusFilter(value)}
                          >
                            {value === 'All' ? 'All Statuses' : value}
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" />}>
                      {typeFilter === 'All' ? 'All Types' : typeFilter}
                      <ChevronDown className="ml-2 size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {[
                        'All',
                        'Enrollment',
                        'Room Booking',
                        'Instrument Rental',
                      ].map((value) => (
                        <DropdownMenuItem
                          key={value}
                          onClick={() => setTypeFilter(value)}
                        >
                          {value === 'All' ? 'All Types' : value}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                      <TableHead>Transaction</TableHead>
                      <TableHead>Reference ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <Loader2 className="mx-auto animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : pagedTransactions.length ? (
                      pagedTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {transaction.id
                              .split('-')
                              .slice(-1)[0]
                              .slice(0, 8)
                              .toUpperCase()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatSourceReference(transaction)}</TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {transaction.person}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.type}</Badge>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {transaction.details}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(transaction.totalAmount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(paidAmount(transaction))}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(remainingAmount(transaction))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.status === 'Paid' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setShowReceiptDialog(true);
                                }}
                              >
                                <FileText className="mr-2 size-4" />
                                Receipt
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => openPayment(transaction)}
                              >
                                Continue payment
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                <span>{filteredTransactions.length} transactions</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {page} of {pageCount || 1}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pageCount || pageCount === 0}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Continue payment</DialogTitle>
              <DialogDescription>
                {selectedTransaction?.person} · {selectedTransaction?.type}
              </DialogDescription>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 rounded-lg border p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold">
                      {formatCurrency(selectedTransaction.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-semibold">
                      {formatCurrency(paidAmount(selectedTransaction))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-semibold">
                      {formatCurrency(remainingAmount(selectedTransaction))}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount received</label>
                  <Input
                    type="number"
                    min="0.01"
                    max={remainingAmount(selectedTransaction)}
                    value={amountToPay}
                    onChange={(event) => setAmountToPay(event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment method</label>
                  <select
                    value={paymentMethod}
                    onChange={(event) => {
                      setPaymentMethod(event.target.value);
                      setPaymentReference('');
                    }}
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option>Cash</option>
                    <option>GCash</option>
                    <option>Bank transfer</option>
                  </select>
                </div>
                {paymentMethod !== 'Cash' ? (
                  <div>
                    <label className="text-sm font-medium">
                      External payment reference
                    </label>
                    <Input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      placeholder="Enter GCash or bank reference"
                      maxLength={100}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Required for non-cash payments.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    A receipt reference will be generated automatically for cash
                    payments.
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="border border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
                disabled={
                  processing ||
                  !selectedTransaction ||
                  paymentMethod !== 'Cash' ||
                  moneyInCents(amountToPay) !== moneyInCents(remainingAmount(selectedTransaction))
                }
                onClick={markAsPaid}
              >
                <Check className="mr-2 size-4" />
                Paid
              </Button>
              <Button
                disabled={
                  processing ||
                  (paymentMethod !== 'Cash' &&
                    paymentReference.trim().length < 3)
                }
                onClick={processPayment}
              >
                {processing ? <Loader2 className="animate-spin" /> : <Check />}{' '}
                Issue receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
          <DialogContent className="sm:max-w-[520px]">
            {/* Legacy dialog markup replaced by the thermal receipt template. */}
            {/*
              <div className="space-y-5 rounded-lg border bg-background p-6 text-sm">
                <div className="flex items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Receipt for</p>
                    <p className="mt-1 font-semibold">{selectedTransaction.person}</p>
                    <p className="text-xs text-muted-foreground">{selectedTransaction.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Receipt no.</p>
                    <p className="mt-1 font-mono text-xs font-semibold">
                      {selectedTransaction.payments.at(-1)?.reference || selectedTransaction.id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date().toLocaleDateString('en-PH')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p className="mt-1 font-medium">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="mt-1 font-medium">{selectedTransaction.details}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border">
                  <div className="grid grid-cols-[1fr_auto] bg-muted/50 px-3 py-2 text-xs font-semibold">
                    <span>Payment details</span>
                    <span>Amount</span>
                  </div>
                  <div className="divide-y px-3">
                    {selectedTransaction.payments.map((payment) => (
                      <div key={payment.id} className="grid grid-cols-[1fr_auto] gap-4 py-3">
                        <div>
                          <p className="font-medium">{payment.method}</p>
                          <p className="text-xs text-muted-foreground">Reference: {payment.reference}</p>
                        </div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total amount</span><span>{formatCurrency(selectedTransaction.totalAmount)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Total paid</span><span>{formatCurrency(paidAmount(selectedTransaction))}</span></div>
                  <div className="flex justify-between text-base font-bold"><span>Balance due</span><span>{formatCurrency(remainingAmount(selectedTransaction))}</span></div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-muted-foreground">Cashier copy · Keep this receipt for your records.</span>
                  <Badge variant={statusVariant(selectedTransaction.status)}>{selectedTransaction.status}</Badge>
                </div>
              </div>
            */}
            <ThermalReceipt
              transaction={selectedTransaction}
              paidAmount={paidAmount}
              remainingAmount={remainingAmount}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReceiptDialog(false)}
              >
                Close
              </Button>
              <Button onClick={() => window.print()}>
                <Printer /> Print receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
