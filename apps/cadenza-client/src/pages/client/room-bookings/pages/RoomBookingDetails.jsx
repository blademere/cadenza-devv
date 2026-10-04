import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  DoorOpen,
  Loader2,
} from "lucide-react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import BookingStatus from "../components/BookingStatus";
import roomBookingService from "../services/roomBookingsService";

export default function RoomBookingDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true);
        setError("");

        const data =
          await roomBookingService.getRoomBookingById(
            id,
          );

        setBooking(data);
      } catch (error) {
        console.error(error);

        setError(
          error?.message ||
            "Unable to find this booking.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [id]);

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this room booking?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelling(true);
      setError("");

      const updatedBooking =
        await roomBookingService.cancelRoomBooking(
          id,
          "Cancelled by customer.",
        );

      setBooking(updatedBooking);
    } catch (error) {
      console.error(error);

      setError(
        error?.message ||
          "Unable to cancel this booking.",
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading booking...
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
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

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">
            {error || "Room booking not found."}
          </p>
        </div>
      </div>
    );
  }

  const roomName =
    booking.room?.roomType ||
    booking.room?.name ||
    "Band Room";

  const start = new Date(
    booking.scheduledStart,
  );

  const end = new Date(
    booking.scheduledEnd,
  );

  const date = start.toLocaleDateString();

  const startTime = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endTime = end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalAmount = Number(
    booking.totalAmount || 0,
  );

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
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Booking #{booking.id}
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              {roomName}
            </h1>
          </div>

          <BookingStatus
            status={booking.status}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <DoorOpen className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Room
              </p>

              <p className="font-medium">
                {roomName}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Date
              </p>

              <p className="font-medium">
                {date}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Time
              </p>

              <p className="font-medium">
                {startTime} - {endTime}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div>
            <p className="text-xs text-muted-foreground">
              Total Amount
            </p>

            <p className="mt-1 text-xl font-semibold">
              ₱{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">
          Booking Status
        </h2>

        <div className="mt-5 rounded-lg bg-muted/50 p-5">
          {booking.status === "PENDING" && (
            <>
              <h3 className="font-medium">
                Booking Under Review
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your room booking request has been
                submitted and is waiting for approval.
              </p>
            </>
          )}

          {(booking.status === "PAID" ||
            booking.status === "PARTIALLY_PAID") && (
            <>
              <h3 className="font-medium">
                {booking.status === "PAID"
                  ? "Payment Received"
                  : "Down Payment Received"}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your band room booking has been paid and is ready for front desk processing.
              </p>
            </>
          )}

          {booking.status === "CONFIRMED" && (
            <>
              <h3 className="font-medium">
                Booking Confirmed
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your band room booking has been
                confirmed.
              </p>
            </>
          )}

          {booking.status === "COMPLETED" && (
            <>
              <h3 className="font-medium">
                Booking Completed
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                This room booking has been completed.
              </p>
            </>
          )}

          {booking.status === "CANCELLED" && (
            <>
              <h3 className="font-medium">
                Booking Cancelled
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                This room booking has been cancelled.
              </p>
            </>
          )}
        </div>

        {booking.status !== "CANCELLED" &&
          booking.status !== "COMPLETED" && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-4 rounded-md border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelling
                ? "Cancelling..."
                : "Cancel Booking"}
            </button>
          )}
      </div>
    </div>
  );
}
