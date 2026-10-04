import { CalendarDays, Music, UserRound } from "lucide-react";

export default function EnrollmentSummary({
  packageData,
  instructor,
  startDate,
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Enrollment Summary</h2>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3">
          <Music className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">Package</p>

            <p className="text-sm font-medium">{packageData?.name || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <UserRound className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">Instructor</p>

            <p className="text-sm font-medium">
              {instructor?.name || "Not selected"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />

          <div>
            <p className="text-xs text-muted-foreground">
              Preferred Start Date
            </p>

            <p className="text-sm font-medium">{startDate || "Not selected"}</p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Enrollment Fee
            </span>

            <span className="text-lg font-semibold">
              ₱{packageData?.price?.toLocaleString() || "0"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
