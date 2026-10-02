import { Music2 } from 'lucide-react'

export default function InstrumentCard({ instrument, onRent, selected }) {
  const name =
    instrument.name ||
    [instrument.brand, instrument.model].filter(Boolean).join(' ') || 'Instrument'

  const description =
    [instrument.brand, instrument.model].filter(Boolean).join(' ') || 'Instrument'

  const rentalRate = Number(instrument.rentalRate || 0)
  const hasRentalRate =
    instrument.rentalRate !== null &&
    instrument.rentalRate !== undefined &&
    Number.isFinite(rentalRate) &&
    rentalRate > 0

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Music2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            hasRentalRate
              ? 'bg-green-500/10 text-green-600'
              : 'bg-amber-500/10 text-amber-600'
          }`}
        >
          {hasRentalRate ? 'Available' : 'Rate not set'}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Rental Price</p>
          <p className="mt-1 text-lg font-semibold">
            ₱{rentalRate.toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / 8 hours minimum
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRent(instrument)}
          disabled={!hasRentalRate}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
            selected
              ? 'bg-green-600 text-white'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {!hasRentalRate
            ? 'Unavailable'
            : selected
              ? 'Added'
              : 'Add to rental'}
        </button>
      </div>
    </div>
  )
}
