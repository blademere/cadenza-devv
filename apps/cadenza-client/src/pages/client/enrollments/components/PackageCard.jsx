import { Check, Music } from "lucide-react";

export default function PackageCard({ packageData, enrolled, onEnroll }) {
  return (
    <div className="flex min-h-[280px] flex-col rounded-xl border border-border bg-card p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Music className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Course
          </p>

          <h3 className="mt-1 text-xl font-semibold">
            {packageData.courseName ||
              packageData.lessons?.map((lesson) => lesson.name).join(", ") ||
              "Course"}
          </h3>

        </div>
      </div>

      <div className="mt-6">
        <p className="text-2xl font-semibold">
          ₱{packageData.price.toLocaleString()}
        </p>

        <p className="text-sm text-muted-foreground">
          per {packageData.duration}
        </p>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <p>
            Sessions:{' '}
            <span className="font-medium text-foreground">
              {packageData.numberOfSessions}
            </span>
          </p>

          <p>
            Duration:{' '}
            <span className="font-medium text-foreground">
              {packageData.sessionDurationMinutes} minutes
            </span>
          </p>

          <p>
            Times per week:{' '}
            <span className="font-medium text-foreground">
              {packageData.sessionsPerWeek ?? 'Not set'}
              {packageData.sessionsPerWeek != null ? 'x' : ''}
            </span>
          </p>
        </div>
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
