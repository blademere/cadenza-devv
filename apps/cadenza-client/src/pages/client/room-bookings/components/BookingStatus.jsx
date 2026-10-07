const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-700",
  FOR_APPROVAL: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

const statusLabels = {
  PENDING: "For Approval",
  FOR_APPROVAL: "For Approval",
  PAID: "For Approval",
  PARTIALLY_PAID: "For Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default function BookingStatus({ status }) {
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
