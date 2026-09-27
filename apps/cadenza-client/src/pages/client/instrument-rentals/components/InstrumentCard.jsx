import { Guitar, Package } from "lucide-react";

export default function InstrumentCard({ instrument, onRent }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Guitar className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{instrument.name}</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {instrument.brand} {instrument.model}
          </p>
        </div>

        <span className="rounded-md bg-muted px-2.5 py-1 text-xs">
          {instrument.condition}
        </span>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {instrument.description}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Daily Rate</p>

          <p className="mt-1 font-semibold">
            ₱{instrument.dailyRate.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Weekly Rate</p>

          <p className="mt-1 font-semibold">
            ₱{instrument.weeklyRate.toLocaleString()}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRent(instrument)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Package className="h-4 w-4" />
        Rent Instrument
      </button>
    </div>
  );
}
