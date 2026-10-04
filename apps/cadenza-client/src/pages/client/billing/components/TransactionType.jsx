import { BookOpen, DoorOpen, Guitar } from "lucide-react";

const typeConfig = {
  ENROLLMENT: {
    label: "Enrollment",
    icon: BookOpen,
  },

  ROOM_BOOKING: {
    label: "Room Booking",
    icon: DoorOpen,
  },

  INSTRUMENT_RENTAL: {
    label: "Instrument Rental",
    icon: Guitar,
  },
};

export default function TransactionType({ type }) {
  const config = typeConfig[type];

  if (!config) {
    return <span className="text-sm text-muted-foreground">{type}</span>;
  }

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4" />
      </div>

      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
