const statusStyles = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  PARTIALLY_PAID: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

const statusLabels = {
  PAID: "Paid",
  PENDING: "Pending",
  PENDING_VERIFICATION: "Pending Verification",
  PARTIALLY_PAID: "Partially Paid",
  REJECTED: "Rejected",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export default function TransactionStatus({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        statusStyles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
