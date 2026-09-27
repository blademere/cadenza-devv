import { CalendarDays, Guitar } from "lucide-react";

export default function RentalSummary({
  instrument,
  startDate,
  endDate,
  quantity,
}) {
  const calculateDays = () => {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(`${startDate}T00:00:00`);

    const end = new Date(`${endDate}T00:00:00`);

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    return days > 0 ? days : 0;
  };

  const days = calculateDays();

  const total = days * (instrument?.dailyRate || 0) * (quantity || 1);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Rental Summary</h2>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3">
          <Guitar className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">Instrument</p>

            <p className="text-sm font-medium">{instrument?.name || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">Rental Period</p>

            <p className="text-sm font-medium">
              {startDate && endDate
                ? `${startDate} - ${endDate}`
                : "Not selected"}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quantity</span>

            <span className="text-sm font-medium">{quantity || 1}</span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>

            <span className="text-sm font-medium">
              {days > 0 ? `${days} day${days !== 1 ? "s" : ""}` : "—"}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Estimated Total
            </span>

            <span className="text-lg font-semibold">
              ₱{total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
