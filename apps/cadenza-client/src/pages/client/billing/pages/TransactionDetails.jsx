import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  Receipt,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import TransactionStatus from "../components/TransactionStatus";
import TransactionType from "../components/TransactionType";
import { getTransactionById } from "../services/billing.service";

export default function TransactionDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [transaction, setTransaction] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTransaction() {
      try {
        setLoading(true);

        const data = await getTransactionById(id);

        setTransaction(data);
      } catch (error) {
        console.error(error);
        setError("Unable to load the transaction.");
      } finally {
        setLoading(false);
      }
    }

    loadTransaction();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading transaction...
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() => navigate("/client/billing")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing & Payments
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">
            {error || "Transaction not found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/client/billing")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Billing & Payments
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Receipt className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Transaction Details
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {transaction.referenceNumber}
              </p>
            </div>
          </div>
        </div>

        <TransactionStatus status={transaction.paymentStatus} />
      </div>

      {/* Transaction Information */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />

          <h2 className="text-lg font-semibold">Transaction Information</h2>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Transaction ID</p>

            <p className="mt-1 text-sm font-medium">{transaction.id}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Reference Number</p>

            <p className="mt-1 text-sm font-medium">
              {transaction.referenceNumber}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Transaction Type</p>

            <div className="mt-1">
              <TransactionType type={transaction.type} />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Transaction Date</p>

            <div className="mt-1 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />

              <p className="text-sm font-medium">
                {transaction.transactionDate}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Payment Method</p>

            <div className="mt-1 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />

              <p className="text-sm font-medium">{transaction.paymentMethod}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Paid At</p>

            <p className="mt-1 text-sm font-medium">{transaction.paidAt}</p>
          </div>
        </div>
      </section>

      {/* Service */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Service Information</h2>

        <div className="mt-5 rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Service</p>

          <p className="mt-1 font-semibold">{transaction.serviceName}</p>

          <p className="mt-2 text-sm text-muted-foreground">
            {transaction.serviceDescription}
          </p>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Related Record</p>

            <p className="mt-1 text-sm font-medium">{transaction.serviceId}</p>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Payment Information</h2>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Description</span>

            <span className="text-sm font-medium">
              {transaction.description}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Payment Method
            </span>

            <span className="text-sm font-medium">
              {transaction.paymentMethod}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>

            <TransactionStatus status={transaction.paymentStatus} />
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Amount
              </span>

              <span className="text-2xl font-semibold">
                ₱{transaction.amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Notes */}
      {transaction.notes && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Notes</h2>

          <p className="mt-3 text-sm text-muted-foreground">
            {transaction.notes}
          </p>
        </section>
      )}

      {/* Read-only notice */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          This transaction is view-only. Transaction information cannot be
          modified from the client portal.
        </p>
      </div>
    </div>
  );
}
