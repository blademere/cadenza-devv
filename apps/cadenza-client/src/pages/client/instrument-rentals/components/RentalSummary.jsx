import { Music2 } from 'lucide-react'

export default function RentalSummary({
  instrument,
  scheduledStart,
  scheduledEnd,
  rentalHours = 0,
  billableHours = 0,
  hourlyRate,
  totalAmount = 0,
}) {
  const instrumentList = Array.isArray(instrument)
    ? instrument
    : instrument
      ? [instrument]
      : []
  const description =
    instrumentList
      .map((item) =>
        [item?.brand, item?.model].filter(Boolean).join(' ') || 'Instrument',
      )
      .join(', ') ||
    'Instrument'

  const rentalRate = instrumentList.reduce(
    (total, item) => total + Number(item?.rentalRate || 0),
    0,
  )
  const calculatedHourlyRate = Number(hourlyRate || rentalRate / 8)

  return (
    <div className="h-fit rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Instrument</h2>

      <div className="mt-5 space-y-3">
        {instrumentList.map((item) => (
          <div key={item.id || item.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Music2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">
                {item.name || [item.brand, item.model].filter(Boolean).join(' ') || 'Instrument'}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.brand || item.model ? [item.brand, item.model].filter(Boolean).join(' ') : 'Instrument'}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium">
              â‚±{Number(item.rentalRate || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">Base rental rate</p>
        <p className="mt-1 text-lg font-semibold">
          ₱{rentalRate.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            / 8 hours minimum
          </span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Hourly rate: ₱{calculatedHourlyRate.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      {billableHours > 0 && (
        <div className="mt-5 border-t border-border pt-5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Duration</span>
            <span>{rentalHours.toFixed(2)} hours</span>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-muted-foreground">Billable hours</span>
            <span>{billableHours} hours</span>
          </div>
          <div className="mt-3 flex justify-between gap-4 border-t pt-3 font-semibold">
            <span>Estimated total</span>
            <span>
              ₱{Number(totalAmount).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
