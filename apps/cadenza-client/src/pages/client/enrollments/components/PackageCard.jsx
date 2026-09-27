import { Check, Music } from "lucide-react";

export default function PackageCard({ packageData, enrolled, onEnroll }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Music className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{packageData.name}</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {packageData.description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-2xl font-semibold">
          ₱{packageData.price.toLocaleString()}
        </p>

        <p className="text-sm text-muted-foreground">
          per {packageData.duration}
        </p>
      </div>

      <div className="mt-6">
        {enrolled ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium">
            <Check className="h-4 w-4" />
            Currently Enrolled
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onEnroll(packageData)}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Enroll Now
          </button>
        )}
      </div>
    </div>
  );
}
