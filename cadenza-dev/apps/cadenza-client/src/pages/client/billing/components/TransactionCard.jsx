import { ChevronRight } from "lucide-react";
import TransactionStatus from "./TransactionStatus";
import TransactionType from "./TransactionType";

export default function TransactionCard({ transaction, onView }) {
  return (
    <button
      type="button"
      onClick={() => onView(transaction)}
      className="w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <TransactionType type={transaction.type} />

          <div>
            <h3 className="font-semibold">{transaction.description}</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {transaction.referenceNumber}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {transaction.transactionDate}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-5 sm:justify-end">
          <div className="text-right">
            <p className="font-semibold">
              ₱{transaction.amount.toLocaleString()}
            </p>

            <div className="mt-1">
              <TransactionStatus status={transaction.paymentStatus} />
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
