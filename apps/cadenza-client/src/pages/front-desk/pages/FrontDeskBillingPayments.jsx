import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, FileText, Loader2, Printer } from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { apiClient } from '@/core/api/apiClient';
import ThermalReceipt from '../components/ThermalReceipt';

const formatCurrency = (amount) => `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const unwrapList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : [];
};
const personName = (record) => {
  const person = record.customer?.person;
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Client';
};
const paymentStatus = (paid, total) => paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid';
const statusVariant = (status) => status === 'Paid' ? 'default' : status === 'Partially Paid' ? 'secondary' : 'outline';

const mapTransaction = (record, type, details, totalAmount, paidAmount, reference) => ({
  id: `${type.toUpperCase().replace(/\s/g, '-')}-${record.id}`,
  sourceId: record.id,
  person: personName(record),
  email: record.customer?.person?.email || '—',
  type,
  details,
  date: record.createdAt || record.scheduledStart,
  totalAmount: Number(totalAmount || 0),
  payments: paidAmount > 0 ? [{ id: `INITIAL-${record.id}`, amount: Number(paidAmount), method: record.metadata?.paymentMethod || 'Online', reference: reference || '—', processedAt: record.metadata?.paymentCompletedAt || record.createdAt }] : [],
  metadata: record.metadata || {},
});

const mapRecords = (enrollments, bookings, rentals) => [
  ...enrollments.map((item) => mapTransaction(item, 'Enrollment', item.packageName || 'Enrollment package', item.price, item.metadata?.paymentAmount || (item.metadata?.paymentPlan === 'FULL_PAYMENT' ? item.price : 0), item.metadata?.paymentReference)),
  ...bookings.map((item) => mapTransaction(item, 'Room Booking', item.room?.name || 'Room booking', item.totalAmount, item.metadata?.initialPaymentAmount || 0, item.metadata?.paymentReference)),
  ...rentals.map((item) => mapTransaction(item, 'Instrument Rental', item.items?.map((entry) => [entry.instrument?.brand, entry.instrument?.model].filter(Boolean).join(' ')).filter(Boolean).join(', ') || 'Instrument rental', item.totalAmount, item.metadata?.initialPaymentAmount || 0, item.metadata?.paymentReference)),
].map((transaction) => ({ ...transaction, status: paymentStatus(transaction.payments.reduce((sum, payment) => sum + payment.amount, 0), transaction.totalAmount) }));

const paidAmount = (transaction) => transaction.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
const remainingAmount = (transaction) => Math.max(transaction.totalAmount - paidAmount(transaction), 0);

export default function BillingPayments() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountToPay, setAmountToPay] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/enrollments'),
      apiClient.get('/room-bookings'),
      apiClient.get('/instrument-rentals'),
    ])
      .then((results) => {
        const [enrollments, bookings, rentals] = results.map((result) => result.status === 'fulfilled' ? unwrapList(result.value) : []);
        setTransactions(mapRecords(enrollments, bookings, rentals));
        if (results.every((result) => result.status === 'rejected')) setError('Unable to load billing records.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = useMemo(() => statusFilter === 'All' ? transactions : transactions.filter((transaction) => transaction.status === statusFilter), [statusFilter, transactions]);
  const paidCount = transactions.filter((transaction) => transaction.status === 'Paid').length;
  const partialCount = transactions.filter((transaction) => transaction.status === 'Partially Paid').length;
  const outstanding = transactions.reduce((sum, transaction) => sum + remainingAmount(transaction), 0);

  const openPayment = (transaction) => {
    setSelectedTransaction(transaction);
    setPaymentMethod('Cash');
    setPaymentReference('');
    setAmountToPay(String(remainingAmount(transaction)));
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    if (!selectedTransaction || processing) return;
    const amount = Number(amountToPay);
    if (!amount || amount <= 0 || amount > remainingAmount(selectedTransaction)) {
      setError('Enter a valid payment amount before issuing the receipt.');
      return;
    }
    if (paymentMethod !== 'Cash' && paymentReference.trim().length < 3) {
      setError('Enter the payment reference for this non-cash payment.');
      return;
    }
    setProcessing(true);
    const receiptReference = paymentMethod === 'Cash'
      ? `FD-${selectedTransaction.type.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`
      : paymentReference.trim();
    const payment = { id: `PAY-${Date.now()}`, amount, method: paymentMethod, reference: receiptReference, processedAt: new Date().toISOString() };
    const updated = { ...selectedTransaction, payments: [...selectedTransaction.payments, payment] };
    updated.status = paymentStatus(paidAmount(updated), updated.totalAmount);
    setTransactions((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedTransaction(updated);
    setShowPaymentDialog(false);
    setShowReceiptDialog(true);
    setProcessing(false);
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div><h1 className="text-2xl font-semibold">Billing & Payments</h1><p className="text-muted-foreground">Front-desk cashier workspace for client receipts and payment continuation.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardDescription>Paid Transactions</CardDescription><CardTitle className="text-2xl">{paidCount}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Fully paid client records</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Partial Payments</CardDescription><CardTitle className="text-2xl">{partialCount}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Receipts with remaining balance</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Outstanding Balance</CardDescription><CardTitle className="text-2xl">{formatCurrency(outstanding)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Remaining cashier balance</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>Cashier Transactions</CardTitle><CardDescription>Use the receipt action to record a continuation payment or reprint a receipt.</CardDescription></div><DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" />}>{statusFilter === 'All' ? 'All Transactions' : statusFilter}<ChevronDown className="ml-2 size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end">{['All', 'Unpaid', 'Partially Paid', 'Paid'].map((status) => <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>{status === 'All' ? 'All Transactions' : status}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div></CardHeader>
            <CardContent>{error && <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Transaction</TableHead><TableHead>Client</TableHead><TableHead>Service</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow> : filteredTransactions.length ? filteredTransactions.map((transaction) => <TableRow key={transaction.id}><TableCell className="font-medium">{transaction.id.split('-').slice(-1)[0].slice(0, 8).toUpperCase()}</TableCell><TableCell><div className="font-medium">{transaction.person}</div><div className="text-sm text-muted-foreground">{transaction.email}</div></TableCell><TableCell><Badge variant="outline">{transaction.type}</Badge><div className="mt-1 text-sm text-muted-foreground">{transaction.details}</div></TableCell><TableCell>{formatCurrency(transaction.totalAmount)}</TableCell><TableCell>{formatCurrency(paidAmount(transaction))}</TableCell><TableCell className="font-medium">{formatCurrency(remainingAmount(transaction))}</TableCell><TableCell><Badge variant={statusVariant(transaction.status)}>{transaction.status}</Badge></TableCell><TableCell className="text-right">{transaction.status === 'Paid' ? <Button variant="ghost" size="sm" onClick={() => { setSelectedTransaction(transaction); setShowReceiptDialog(true); }}><FileText className="mr-2 size-4" />Receipt</Button> : <Button size="sm" onClick={() => openPayment(transaction)}>Continue payment</Button>}</TableCell></TableRow>) : <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No transactions found.</TableCell></TableRow>}</TableBody></Table></div></CardContent>
          </Card>
        </main>
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}><DialogContent><DialogHeader><DialogTitle>Continue payment</DialogTitle><DialogDescription>{selectedTransaction?.person} · {selectedTransaction?.type}</DialogDescription></DialogHeader>{selectedTransaction && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 rounded-lg border p-4"><div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(selectedTransaction.totalAmount)}</p></div><div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-semibold">{formatCurrency(remainingAmount(selectedTransaction))}</p></div></div><div><label className="text-sm font-medium">Amount received</label><Input type="number" min="0.01" max={remainingAmount(selectedTransaction)} value={amountToPay} onChange={(event) => setAmountToPay(event.target.value)} className="mt-2" /></div><div><label className="text-sm font-medium">Payment method</label><select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); setPaymentReference(''); }} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"><option>Cash</option><option>GCash</option><option>Bank transfer</option></select></div>{paymentMethod !== 'Cash' ? <div><label className="text-sm font-medium">External payment reference</label><Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Enter GCash or bank reference" maxLength={100} className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">Required for non-cash payments.</p></div> : <p className="text-xs text-muted-foreground">A receipt reference will be generated automatically for cash payments.</p>}</div>}<DialogFooter><Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button><Button disabled={processing || (paymentMethod !== 'Cash' && paymentReference.trim().length < 3)} onClick={processPayment}>{processing ? <Loader2 className="animate-spin" /> : <Check />} Issue receipt</Button></DialogFooter></DialogContent></Dialog>
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
              <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Close</Button>
              <Button onClick={() => window.print()}><Printer /> Print receipt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
