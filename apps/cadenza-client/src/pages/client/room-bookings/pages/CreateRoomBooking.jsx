import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import BookingSummary from "../components/BookingSummary";
import roomBookingService from "../services/roomBookingsService";

export default function CreateRoomBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roomId = searchParams.get("room");

  const [room, setRoom] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAvailability() {
      if (!date || !startTime || !endTime) {
        setAvailableRooms([]);
        setRoom(null);
        return;
      }

      if (endTime <= startTime) {
        setAvailableRooms([]);
        setRoom(null);
        return;
      }

      try {
        setChecking(true);
        setError("");

        const scheduledStart = `${date}T${startTime}:00`;
        const scheduledEnd = `${date}T${endTime}:00`;

        const rooms =
          await roomBookingService.getAvailableRooms(
            scheduledStart,
            scheduledEnd,
          );

        const data = Array.isArray(rooms)
          ? rooms
          : [];

        setAvailableRooms(data);

        if (roomId) {
          const selectedRoom = data.find(
            (item) => item.id === roomId,
          );

          setRoom(selectedRoom || null);

          if (!selectedRoom) {
            setError(
              "The selected room is not available for the selected schedule.",
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to check room availability:",
          error,
        );

        setAvailableRooms([]);
        setRoom(null);

        setError(
          error?.message ||
            "Unable to check room availability.",
        );
      } finally {
        setChecking(false);
      }
    }

    checkAvailability();
  }, [
    date,
    startTime,
    endTime,
    roomId,
  ]);

  useEffect(() => {
    const handlePaymentComplete = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== "CADENZA_ROOM_PAYMENT_COMPLETED" ||
        !event.data?.bookingId
      ) {
        return;
      }

      setSubmitting(false);
      navigate(`/client/room-bookings/${event.data.bookingId}`);
    };

    window.addEventListener("message", handlePaymentComplete);
    return () => window.removeEventListener("message", handlePaymentComplete);
  }, [navigate]);

  useEffect(() => {
    if (!room) {
      setPaymentPlan("");
    }
  }, [room]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!room) {
      setError("Please select an available room.");
      return;
    }

    if (!paymentPlan) {
      setError("Please select a payment option.");
      return;
    }

    if (!date) {
      setError("Please select a booking date.");
      return;
    }

    if (!startTime || !endTime) {
      setError(
        "Please select a start and end time.",
      );
      return;
    }

    if (endTime <= startTime) {
      setError(
        "End time must be later than start time.",
      );
      return;
    }

    const isAvailable = availableRooms.some(
      (availableRoom) =>
        availableRoom.id === room.id,
    );

    if (!isAvailable) {
      setError(
        "The selected room is not available for the selected schedule.",
      );
      return;
    }

    try {
      setSubmitting(true);

      localStorage.setItem(
        "cadenza-pending-room-checkout",
        JSON.stringify({
          room,
          date,
          startTime,
          endTime,
          paymentPlan,
        }),
      );

      const paymentWindow = window.open(
        `${window.location.origin}/client/room-bookings/payment`,
        "_blank",
      );

      if (!paymentWindow) {
        setError(
          "The payment tab was blocked. Please allow popups for this site and try again.",
        );
      }
    } catch (error) {
      console.error(
        "Failed to create room booking:",
        error,
      );

      setError(
        error?.message ||
          "Unable to create your booking.",
      );
      setSubmitting(false);
    }
  };

  const roomName =
    room?.roomType ||
    room?.resource?.name ||
    "Band Room";

  const hourlyRate = Number(
    room?.rentalRate ?? 0,
  );

  const equipment = Array.isArray(
    room?.equipment,
  )
    ? room.equipment
    : [];

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <button
        type="button"
        onClick={() =>
          navigate("/client/room-bookings")
        }
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Room Bookings
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Book a Band Room
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Select your preferred date and time for
          your rehearsal.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[1fr_360px]"
      >
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">
              Booking Schedule
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="date"
                  className="text-sm font-medium"
                >
                  Date
                </label>

                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="startTime"
                  className="text-sm font-medium"
                >
                  Start Time
                </label>

                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(event.target.value)
                  }
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  className="text-sm font-medium"
                >
                  End Time
                </label>

                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(event) =>
                    setEndTime(event.target.value)
                  }
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {checking && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking room availability...
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">
              Available Rooms
            </h2>

            {!date ||
            !startTime ||
            !endTime ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Select a date, start time, and end time
                to see available rooms.
              </p>
            ) : checking ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available rooms...
              </div>
            ) : availableRooms.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No rooms are available for the
                selected schedule.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {availableRooms.map(
                  (availableRoom) => {
                    const name =
                      availableRoom.roomType ||
                      availableRoom.resource?.name ||
                      "Band Room";

                    const rate = Number(
                      availableRoom.rentalRate ?? 0,
                    );

                    const selected =
                      room?.id ===
                      availableRoom.id;

                    return (
                      <button
                        key={availableRoom.id}
                        type="button"
                        onClick={() => {
                          setRoom(
                            availableRoom,
                          );

                          navigate(
                            `/client/room-bookings/new?room=${availableRoom.id}`,
                            {
                              replace: true,
                            },
                          );
                        }}
                        className={`w-full rounded-lg border p-4 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">
                              {name}
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                              Capacity:{" "}
                              {
                                availableRoom.capacity
                              }
                            </p>
                          </div>

                          {rate > 0 && (
                            <p className="text-sm font-medium">
                              ₱
                              {rate.toLocaleString()}
                              /hr
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {room && (
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">
                Selected Room
              </h2>

              <div className="mt-5 rounded-lg bg-muted/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {roomName}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Capacity: {room.capacity}
                    </p>
                  </div>

                  {hourlyRate > 0 && (
                    <p className="shrink-0 text-lg font-semibold">
                      ₱
                      {hourlyRate.toLocaleString()}
                      /hr
                    </p>
                  )}
                </div>

                {equipment.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {equipment.map((item) => (
                      <span
                        key={item}
                        className="rounded-md bg-background px-2.5 py-1 text-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div>
          <div className="sticky top-6">
            <BookingSummary
              room={{
                ...(room || {}),
                name: roomName,
                hourlyRate,
              }}
              date={date}
              startTime={startTime}
              endTime={endTime}
            />

            <section
              aria-disabled={!room}
              className={`mt-4 rounded-xl border border-border bg-card p-5 transition-opacity ${
                room
                  ? ""
                  : "pointer-events-none opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Payment option</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {room
                  ? "Choose your payment option before proceeding."
                  : "Select an available room to choose a payment option."}
              </p>
              <div className="mt-4 grid gap-2">
                {[
                  ["DOWN_PAYMENT", "50% down payment"],
                  ["FULL_PAYMENT", "Full payment"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={`rounded-lg border p-3 text-sm font-medium ${
                      room ? "cursor-pointer" : "cursor-not-allowed"
                    } ${
                      paymentPlan === value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="room-payment-plan"
                      value={value}
                      checked={paymentPlan === value}
                      onChange={(event) => setPaymentPlan(event.target.value)}
                      disabled={!room}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The QR payment page will open in a separate tab.
              </p>
            </section>

            <button
              type="submit"
              disabled={
                submitting ||
                checking ||
                !room ||
                !date ||
                !startTime ||
                !endTime ||
                !paymentPlan
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {submitting
                ? "Loading..."
                : "Proceed Payment"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
