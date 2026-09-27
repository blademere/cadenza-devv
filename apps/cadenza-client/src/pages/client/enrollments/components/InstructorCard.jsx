import { Check, Star } from "lucide-react";

export default function InstructorCard({ instructor, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(instructor)}
      className={`w-full rounded-xl border p-5 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {instructor.name
            .split(" ")
            .map((name) => name[0])
            .join("")
            .slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{instructor.name}</h3>

              <p className="text-sm text-muted-foreground">
                {instructor.specialization} Instructor
              </p>
            </div>

            {selected && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {instructor.rating}
            </span>

            <span>{instructor.experience} experience</span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {instructor.level}
          </p>
        </div>
      </div>
    </button>
  );
}
