const statusStyles = {
  PENDING: 'bg-yellow-500/10 text-yellow-600',
  APPROVED: 'bg-green-500/10 text-green-600',
  ACTIVE: 'bg-blue-500/10 text-blue-600',
  COMPLETED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-red-500/10 text-red-600',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export default function RentalStatus({ status }) {
  const normalizedStatus = String(status || 'PENDING').toUpperCase();

  const className =
    statusStyles[normalizedStatus] || 'bg-muted text-muted-foreground';

  const label = normalizedStatus
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
