import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useNavigate, useSearchParams } from "react-router-dom";

import BookingSummary from "../components/BookingSummary";

import {
  getRoomById,
  createRoomBooking,
} from "../services/room-booking.service";

export default function CreateRoomBooking() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const roomId = searchParams.get("room");

  const [room, setRoom] = useState(null);

  const [date, setDate] = useState("");

  const [startTime, setStartTime] = useState("");

  const [endTime, setEndTime] = useState("");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRoom() {
      if (!roomId) {
        setError("No room was selected.");

        setLoading(false);

        return;
      }

      try {
        const data = await getRoomById(roomId);

        setRoom(data);
      } catch (error) {
        console.error(error);

        setError("Unable to load the selected room.");
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [roomId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!date) {
      setError("Please select a booking date.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Please select a start and end time.");
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    try {
      setSubmitting(true);

      const booking = await createRoomBooking({
        roomId: room.id,
        roomName: room.name,
        hourlyRate: room.hourlyRate,
        date,
        startTime,
        endTime,
        notes,
      });

      navigate(`/client/room-bookings/${booking.id}`);
    } catch (error) {
      console.error(error);

      setError("Unable to create your booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading room...
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() => navigate("/client/room-bookings")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Room Bookings
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">
            {error || "Room not found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/client/room-bookings")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Room Bookings
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Book a Band Room
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Select your preferred date and time for your rehearsal.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[1fr_360px]"
      >
        <div className="space-y-6">
          {/* Selected room */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Selected Room</h2>

            <div className="mt-5 rounded-lg bg-muted/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{room.name}</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {room.description}
                  </p>
                </div>

                <p className="shrink-0 text-lg font-semibold">
                  ₱{room.hourlyRate.toLocaleString()}
                  /hr
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {room.equipment.map((item) => (
                  <span
                    key={item}
                    className="rounded-md bg-background px-2.5 py-1 text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Date */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Booking Schedule</h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="date" className="text-sm font-medium">
                  Date
                </label>

                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="startTime" className="text-sm font-medium">
                  Start Time
                </label>

                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="endTime" className="text-sm font-medium">
                  End Time
                </label>

                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Additional Information</h2>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Add any additional requests..."
              className="mt-4 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </section>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-6">
            <BookingSummary
              room={room}
              date={date}
              startTime={startTime}
              endTime={endTime}
            />

            <button
              type="submit"
              disabled={submitting || !date || !startTime || !endTime}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}

              {submitting ? "Submitting..." : "Submit Booking"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
