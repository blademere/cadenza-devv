"use client";

import { useState } from "react";
import { Check, ChevronDown, FileIcon, Printer } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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

import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* =========================================================
   MOCK DATA
========================================================= */

const initialTransactions = [
  {
    id: "TXN-001",
    person: "Juan Dela Cruz",
    email: "juan@example.com",
    type: "Room Booking",
    details: "Practice Room 1",
    date: "Sep 10, 2026",
    totalAmount: 300,
    status: "Paid",
    payments: [
      {
        id: "PAY-001",
        amount: 300,
        method: "Cash",
        reference: "CASH-001",
        processedAt: "Sep 10, 2026 · 9:05 AM",
      },
    ],
  },

  {
    id: "TXN-002",
    person: "Maria Santos",
    email: "maria@example.com",
    type: "Instrument Rental",
    details: "Fender Acoustic Guitar",
    date: "Sep 11, 2026",
    totalAmount: 500,
    status: "Paid",
    payments: [
      {
        id: "PAY-002",
        amount: 500,
        method: "GCash",
        reference: "GC-20260911-002",
        processedAt: "Sep 11, 2026 · 10:15 AM",
      },
    ],
  },

  {
    id: "TXN-003",
    person: "Pedro Reyes",
    email: "pedro@example.com",
    type: "Room Booking",
    details: "Music Room",
    date: "Sep 12, 2026",
    totalAmount: 600,
    status: "Partially Paid",
    payments: [
      {
        id: "PAY-003",
        amount: 200,
        method: "Cash",
        reference: "CASH-003",
        processedAt: "Sep 12, 2026 · 8:15 AM",
      },
    ],
  },

  {
    id: "TXN-004",
    person: "Ana Garcia",
    email: "ana@example.com",
    type: "Enrollment",
    details: "Beginner Guitar Program",
    date: "Sep 13, 2026",
    totalAmount: 1000,
    status: "Paid",
    payments: [
      {
        id: "PAY-004",
        amount: 1000,
        method: "GCash",
        reference: "GC-20260913-004",
        processedAt: "Sep 13, 2026 · 2:20 PM",
      },
    ],
  },

  {
    id: "TXN-005",
    person: "Carlos Mendoza",
    email: "carlos@example.com",
    type: "Instrument Rental",
    details: "Yamaha Violin",
    date: "Sep 14, 2026",
    totalAmount: 1200,
    status: "Unpaid",
    payments: [],
  },

  {
    id: "TXN-006",
    person: "Sofia Martinez",
    email: "sofia@example.com",
    type: "Enrollment",
    details: "Intermediate Piano Program",
    date: "Sep 15, 2026",
    totalAmount: 3000,
    status: "Partially Paid",
    payments: [
      {
        id: "PAY-006",
        amount: 1000,
        method: "GCash",
        reference: "GC-20260915-006",
        processedAt: "Sep 15, 2026 · 9:30 AM",
      },
    ],
  },
];

/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (amount) => {
  return `₱${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getPaidAmount = (transaction) => {
  return transaction.payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
};

const getRemainingAmount = (transaction) => {
  return Math.max(transaction.totalAmount - getPaidAmount(transaction), 0);
};

const getStatusVariant = (status) => {
  if (status === "Paid") {
    return "default";
  }

  return "secondary";
};

/* =========================================================
   PAGE
========================================================= */

export default function BillingPayments() {
  const [transactions, setTransactions] = useState(initialTransactions);

  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [amountToPay, setAmountToPay] = useState("");

  /* =========================================================
     COUNTS
  ========================================================= */

  const paidCount = transactions.filter(
    (transaction) => transaction.status === "Paid",
  ).length;

  const partiallyPaidCount = transactions.filter(
    (transaction) => transaction.status === "Partially Paid",
  ).length;

  const unpaidCount = transactions.filter(
    (transaction) => transaction.status === "Unpaid",
  ).length;

  const roomBookingCount = transactions.filter(
    (transaction) => transaction.type === "Room Booking",
  ).length;

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredTransactions =
    statusFilter === "All"
      ? transactions
      : transactions.filter(
          (transaction) => transaction.status === statusFilter,
        );

  /* =========================================================
     PAYMENT
  ========================================================= */

  const handleContinuePayment = (transaction) => {
    const remainingAmount = getRemainingAmount(transaction);

    setSelectedTransaction(transaction);
    setPaymentMethod("Cash");
    setAmountToPay(String(remainingAmount));
    setShowPaymentDialog(true);
  };

  const handleProcessPayment = () => {
    if (!selectedTransaction) {
      return;
    }

    const paymentAmount = Number(amountToPay);
    const remainingAmount = getRemainingAmount(selectedTransaction);

    if (
      !paymentAmount ||
      paymentAmount <= 0 ||
      paymentAmount > remainingAmount
    ) {
      return;
    }

    const paymentNumber = selectedTransaction.payments.length + 1;

    const paymentId = `PAY-${selectedTransaction.id.replace(
      "TXN-",
      "",
    )}-${paymentNumber}`;

    const reference =
      paymentMethod === "Cash"
        ? `CASH-${selectedTransaction.id.replace("TXN-", "")}-${paymentNumber}`
        : `GC-${Date.now()}`;

    const processedAt = new Date().toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const newPayment = {
      id: paymentId,
      amount: paymentAmount,
      method: paymentMethod,
      reference,
      processedAt,
    };

    const updatedPayments = [...selectedTransaction.payments, newPayment];

    const updatedPaidAmount = updatedPayments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );

    const updatedRemainingAmount = Math.max(
      selectedTransaction.totalAmount - updatedPaidAmount,
      0,
    );

    let updatedStatus = "Partially Paid";

    if (updatedRemainingAmount === 0) {
      updatedStatus = "Paid";
    } else if (updatedPaidAmount === 0) {
      updatedStatus = "Unpaid";
    }

    const updatedTransaction = {
      ...selectedTransaction,
      payments: updatedPayments,
      status: updatedStatus,
    };

    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === selectedTransaction.id
          ? updatedTransaction
          : transaction,
      ),
    );

    setSelectedTransaction(updatedTransaction);
    setAmountToPay("");

    setShowPaymentDialog(false);

    setShowReceiptDialog(true);
  };

  /* =========================================================
     RECEIPT
  ========================================================= */

  const handleViewReceipt = (transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptDialog(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div>
            <h1 className="text-2xl font-semibold">Billing & Payments</h1>

            <p className="text-muted-foreground">
              Process payments and manage transaction records for students and
              clients.
            </p>
          </div>

          {/* =================================================
              SUMMARY CARDS
          ================================================= */}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Paid Transactions</CardDescription>

                <CardTitle className="text-2xl">{paidCount}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Fully paid transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Partially Paid</CardDescription>

                <CardTitle className="text-2xl">{partiallyPaidCount}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Transactions with remaining balance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unpaid Transactions</CardDescription>

                <CardTitle className="text-2xl">{unpaidCount}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-muted-foreground">
                  No payment received yet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Room Bookings</CardDescription>

                <CardTitle className="text-2xl">{roomBookingCount}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Booking transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* =================================================
              TRANSACTION TABLE
          ================================================= */}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Transaction Records</CardTitle>

                  <CardDescription>
                    Continue active payments or view completed receipts.
                  </CardDescription>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-9 min-w-[160px] items-center justify-between rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
                    {statusFilter === "All" ? "All Transactions" : statusFilter}

                    <ChevronDown className="ml-2 size-4" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setStatusFilter("All")}>
                      All Transactions
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setStatusFilter("Unpaid")}>
                      Unpaid
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Partially Paid")}
                    >
                      Partially Paid
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setStatusFilter("Paid")}>
                      Paid
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
                      <TableHead>Transaction ID</TableHead>

                      <TableHead>Student / Client</TableHead>

                      <TableHead>Service</TableHead>

                      <TableHead>Details</TableHead>

                      <TableHead>Total</TableHead>

                      <TableHead>Paid</TableHead>

                      <TableHead>Remaining</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="w-[160px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => {
                        const paidAmount = getPaidAmount(transaction);

                        const remainingAmount = getRemainingAmount(transaction);

                        return (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">
                              {transaction.id}
                            </TableCell>

                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {transaction.person}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                  {transaction.email}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline">
                                {transaction.type}
                              </Badge>
                            </TableCell>

                            <TableCell>{transaction.details}</TableCell>

                            <TableCell className="font-medium">
                              {formatCurrency(transaction.totalAmount)}
                            </TableCell>

                            <TableCell>{formatCurrency(paidAmount)}</TableCell>

                            <TableCell className="font-medium">
                              {formatCurrency(remainingAmount)}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={getStatusVariant(transaction.status)}
                              >
                                {transaction.status}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              {transaction.status === "Paid" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="View receipt"
                                  onClick={() => handleViewReceipt(transaction)}
                                >
                                  <FileIcon className="size-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleContinuePayment(transaction)
                                  }
                                >
                                  Continue Payment
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No transaction records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
      {/* =====================================================
          CONTINUE PAYMENT DIALOG
      ===================================================== */}
      ```jsx
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[420px]">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle>Continue Payment</DialogTitle>

                <DialogDescription>
                  {selectedTransaction.id} · {selectedTransaction.person}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer / Service */}

                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {selectedTransaction.person}
                      </p>

                      <p className="truncate text-sm text-muted-foreground">
                        {selectedTransaction.details}
                      </p>
                    </div>

                    <Badge
                      variant={getStatusVariant(selectedTransaction.status)}
                    >
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>

                {/* Amount Summary */}

                <div className="grid grid-cols-3 divide-x rounded-md border">
                  <div className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total</p>

                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(selectedTransaction.totalAmount)}
                    </p>
                  </div>

                  <div className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Paid</p>

                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(getPaidAmount(selectedTransaction))}
                    </p>
                  </div>

                  <div className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Remaining</p>

                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(getRemainingAmount(selectedTransaction))}
                    </p>
                  </div>
                </div>

                {/* Payment Method */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Payment Method
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentMethod === "Cash" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("Cash")}
                    >
                      Cash
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={
                        paymentMethod === "GCash" ? "default" : "outline"
                      }
                      onClick={() => setPaymentMethod("GCash")}
                    >
                      GCash
                    </Button>
                  </div>
                </div>

                {/* Amount */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Amount to Pay
                  </label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    max={getRemainingAmount(selectedTransaction)}
                    placeholder="Enter amount"
                    value={amountToPay}
                    onChange={(event) => setAmountToPay(event.target.value)}
                  />
                </div>

                {/* Balance Preview */}

                {Number(amountToPay) > 0 &&
                  Number(amountToPay) <=
                    getRemainingAmount(selectedTransaction) && (
                    <div className="rounded-md bg-muted/50 px-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Balance after payment
                        </span>

                        <span className="font-medium">
                          {formatCurrency(
                            Math.max(
                              getRemainingAmount(selectedTransaction) -
                                Number(amountToPay),
                              0,
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                {paymentMethod === "GCash" && (
                  <p className="text-xs text-muted-foreground">
                    Confirm that the GCash payment has been received before
                    processing.
                  </p>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                >
                  Cancel
                </Button>

                <Button
                  disabled={
                    !Number(amountToPay) ||
                    Number(amountToPay) <= 0 ||
                    Number(amountToPay) >
                      getRemainingAmount(selectedTransaction)
                  }
                  onClick={handleProcessPayment}
                >
                  <Check className="mr-2 size-4" />
                  Process Payment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      ```
      {/* =====================================================
          RECEIPT DIALOG
      ===================================================== */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-[380px]">
          {selectedTransaction && (
            <>
              <DialogHeader className="text-center">
                <DialogTitle className="text-lg">
                  Cadenza Music Center
                </DialogTitle>

                <DialogDescription>Payment Receipt</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Payment Status */}

                <div className="text-center">
                  <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-muted">
                    <Check className="size-5" />
                  </div>

                  <p className="text-sm font-semibold">
                    {selectedTransaction.status === "Paid"
                      ? "Payment Completed"
                      : "Payment Recorded"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {
                      selectedTransaction.payments[
                        selectedTransaction.payments.length - 1
                      ]?.processedAt
                    }
                  </p>
                </div>

                {/* Receipt Details */}

                <div className="rounded-md border">
                  <div className="space-y-2 p-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Receipt No.</span>

                      <span className="font-medium">
                        {selectedTransaction.id}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Customer</span>

                      <span className="font-medium">
                        {selectedTransaction.person}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Service</span>

                      <span className="text-right font-medium">
                        {selectedTransaction.type}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Details</span>

                      <span className="text-right font-medium">
                        {selectedTransaction.details}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Payment</span>

                      <span className="font-medium">
                        {
                          selectedTransaction.payments[
                            selectedTransaction.payments.length - 1
                          ]?.method
                        }
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Reference</span>

                      <span className="text-right font-medium">
                        {
                          selectedTransaction.payments[
                            selectedTransaction.payments.length - 1
                          ]?.reference
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount */}

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>

                    <span>
                      {formatCurrency(selectedTransaction.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Paid</span>

                    <span>
                      {formatCurrency(getPaidAmount(selectedTransaction))}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <span className="font-semibold">Remaining</span>

                    <span className="text-lg font-bold">
                      {formatCurrency(getRemainingAmount(selectedTransaction))}
                    </span>
                  </div>
                </div>

                {/* Status */}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>

                  <Badge variant={getStatusVariant(selectedTransaction.status)}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReceiptDialog(false)}
                >
                  Close
                </Button>

                <Button onClick={handlePrintReceipt}>
                  <Printer className="mr-2 size-4" />
                  Print
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
