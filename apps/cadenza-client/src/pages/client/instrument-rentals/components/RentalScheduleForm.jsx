import { Loader2 } from 'lucide-react';

export default function RentalScheduleForm({
  scheduledStart,
  scheduledEnd,
  setScheduledStart,
  setScheduledEnd,
  availability,
  checkingAvailability,
  onCheckAvailability,
  onSubmit,
  submitting,
  rentalHours,
  billableHours,
  hourlyRate,
  totalAmount,
}) {
  const isAvailable = availability?.available === true;

  const isUnavailable = availability?.available === false;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Rental Schedule</h2>

      <p className="mt-1 text-sm text-muted-foreground">
        Select when you want to use the instrument.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="scheduled-start" className="text-sm font-medium">
            Start Date & Time
          </label>

          <input
            id="scheduled-start"
            type="datetime-local"
            value={scheduledStart}
            onChange={(event) => {
              setScheduledStart(event.target.value);
            }}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {rentalHours > 0 && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Rental duration</span>
              <span className="font-medium">
                {rentalHours.toFixed(2)} hours
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Billable hours</span>
              <span className="font-medium">{billableHours} hours</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Hourly rate</span>
              <span className="font-medium">
                ₱{hourlyRate.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="mt-3 flex justify-between gap-4 border-t pt-3">
              <span className="font-medium">Estimated total</span>
              <span className="font-semibold">
                ₱{totalAmount.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="scheduled-end" className="text-sm font-medium">
            End Date & Time
          </label>

          <input
            id="scheduled-end"
            type="datetime-local"
            value={scheduledEnd}
            onChange={(event) => {
              setScheduledEnd(event.target.value);
            }}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isAvailable && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <p className="text-sm font-medium text-green-600">
              Instrument is available for this schedule.
            </p>

            {availability.message && (
              <p className="mt-1 text-sm text-muted-foreground">
                {availability.message}
              </p>
            )}
          </div>
        )}

        {isUnavailable && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Instrument is unavailable for this schedule.
            </p>

            {availability.message && (
              <p className="mt-1 text-sm text-muted-foreground">
                {availability.message}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onCheckAvailability}
          disabled={checkingAvailability || !scheduledStart || !scheduledEnd}
          className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkingAvailability ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking Availability...
            </span>
          ) : (
            'Check Availability'
          )}
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || checkingAvailability || !isAvailable}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Rental...
            </span>
          ) : (
            'Rent Instrument'
          )}
        </button>
      </div>
    </div>
  );
}
