import { CalendarDays, Clock, DoorOpen } from "lucide-react";

export default function BookingSummary({ room, date, startTime, endTime }) {
  const calculateDuration = () => {
    if (!startTime || !endTime) {
      return 0;
    }

    const start = new Date(`2000-01-01T${startTime}`);

    const end = new Date(`2000-01-01T${endTime}`);

    const hours = (end - start) / (1000 * 60 * 60);

    return hours > 0 ? hours : 0;
  };

  const duration = calculateDuration();

  const total = duration * (room?.hourlyRate || 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Booking Summary</h2>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">Room</p>

            <p className="text-sm font-medium">{room?.name || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">Date</p>

            <p className="text-sm font-medium">{date || "Not selected"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">Time</p>

            <p className="text-sm font-medium">
              {startTime && endTime
                ? `${startTime} - ${endTime}`
                : "Not selected"}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>

            <span className="text-sm font-medium">
              {duration > 0
                ? `${duration} hour${duration !== 1 ? "s" : ""}`
                : "—"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>

            <span className="text-lg font-semibold">
              ₱{total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
