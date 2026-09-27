import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  DoorOpen,
  Loader2,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import BookingStatus from "../components/BookingStatus";

import { getRoomBookingById } from "../services/room-booking.service";

export default function RoomBookingDetails() {
  const navigate = useNavigate();

  const { id } = useParams();

  const [booking, setBooking] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBooking() {
      try {
        const data = await getRoomBookingById(id);

        setBooking(data);
      } catch (error) {
        console.error(error);

        setError("Unable to find this booking.");
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [id]);

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
          onClick={() => navigate("/client/room-bookings")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Room Bookings
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
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
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Booking #{booking.id}
            </p>

            <h1 className="mt-1 text-2xl font-semibold">{booking.roomName}</h1>
          </div>

          <BookingStatus status={booking.status} />
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <DoorOpen className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Room</p>

              <p className="font-medium">{booking.roomName}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Date</p>

              <p className="font-medium">{booking.date}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Time</p>

              <p className="font-medium">
                {booking.startTime} - {booking.endTime}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>

            <p className="mt-1 text-xl font-semibold">
              ₱{booking.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Booking Status</h2>

        <div className="mt-5 rounded-lg bg-muted/50 p-5">
          {booking.status === "PENDING" && (
            <>
              <h3 className="font-medium">Booking Under Review</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your room booking request has been submitted and is waiting for
                approval.
              </p>
            </>
          )}

          {booking.status === "APPROVED" && (
            <>
              <h3 className="font-medium">Booking Approved</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your band room booking has been approved.
              </p>
            </>
          )}

          {booking.status === "REJECTED" && (
            <>
              <h3 className="font-medium">Booking Rejected</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your room booking request was not approved.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
