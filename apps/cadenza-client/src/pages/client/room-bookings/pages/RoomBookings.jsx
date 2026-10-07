import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Loader2,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import roomBookingService from "../services/roomBookingsService";

export default function RoomBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await roomBookingService.getMyRoomBookings();

        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        setBookings(data);
      } catch (error) {
        console.error(
          "Failed to load room bookings:",
          error,
        );

        setBookings([]);

        setError(
          error?.message ||
            "Unable to load your room bookings.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );
  };

  const formatTime = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleTimeString(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      },
    );
  };

  const formatAmount = (value) => {
    const amount = Number(value ?? 0);

    return `₱${amount.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}`;
  };

  const getRoomName = (booking) => {
    return (
      booking?.room?.roomType ||
      booking?.room?.resource?.name ||
      "Band Room"
    );
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-500/10 text-green-600";

      case "PAID":
      case "PARTIALLY_PAID":
      case "FOR_APPROVAL":
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-600";

      case "COMPLETED":
        return "bg-blue-500/10 text-blue-600";

      case "CANCELLED":
        return "bg-red-500/10 text-red-600";

      default:
        return "bg-yellow-500/10 text-yellow-600";
    }
  };

  const getStatusLabel = (status) => {
    if (["PENDING", "FOR_APPROVAL", "PAID", "PARTIALLY_PAID"].includes(status)) {
      return "For Approval";
    }

    return status || "For Approval";
  };

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Room Bookings
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your band room bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/client/room-bookings/new")
          }
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Book a Band Room
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your room bookings...
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />

          <h2 className="mt-4 font-semibold">
            No Room Bookings
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            You do not have any room bookings yet.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/client/room-bookings/new")
            }
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Book a Band Room
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <button
              key={booking.id}
              type="button"
              onClick={() =>
                navigate(
                  `/client/room-bookings/${booking.id}`,
                )
              }
              className="w-full rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary hover:bg-muted/20"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold">
                    {getRoomName(booking)}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Booking #{booking.id}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                    booking.status,
                  )}`}
                >
                  {getStatusLabel(booking.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Date
                    </p>

                    <p className="text-sm font-medium">
                      {formatDate(
                        booking.scheduledStart,
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Time
                    </p>

                    <p className="text-sm font-medium">
                      {formatTime(
                        booking.scheduledStart,
                      )}{" "}
                      -{" "}
                      {formatTime(
                        booking.scheduledEnd,
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Amount
                  </p>

                  <p className="text-sm font-semibold">
                    {formatAmount(
                      booking.totalAmount,
                    )}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
