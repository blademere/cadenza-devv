import { CalendarDays, Users } from "lucide-react";

export default function RoomCard({ room, onBook }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{room.name}</h3>

            <p className="mt-1 text-sm text-muted-foreground">{room.type}</p>
          </div>

          <div className="rounded-md bg-muted px-3 py-1 text-xs font-medium">
            ₱{room.hourlyRate.toLocaleString()}/hr
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{room.description}</p>
      </div>

      <div className="mt-5 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Up to {room.capacity} people
        </span>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Equipment
        </p>

        <div className="flex flex-wrap gap-2">
          {room.equipment.map((item) => (
            <span
              key={item}
              className="rounded-md bg-muted px-2.5 py-1 text-xs"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onBook(room)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <CalendarDays className="h-4 w-4" />
        Book Room
      </button>
    </div>
  );
}
