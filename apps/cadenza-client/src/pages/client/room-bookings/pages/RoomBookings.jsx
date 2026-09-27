import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import RoomCard from "../components/RoomCard";
import BookingStatus from "../components/BookingStatus";

import {
  getAvailableRooms,
  getMyRoomBookings,
} from "../services/room-booking.service";

export default function RoomBookings() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [availableRooms, myBookings] = await Promise.all([
          getAvailableRooms(),
          getMyRoomBookings(),
        ]);

        setRooms(availableRooms);
        setBookings(myBookings);
      } catch (error) {
        console.error(error);

        setError("Unable to load room booking information.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleBookRoom = (room) => {
    navigate(`/client/room-bookings/new?room=${room.id}`);
  };

  const handleViewBooking = (booking) => {
    navigate(`/client/room-bookings/${booking.id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading rooms...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Room Bookings</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Book a band room for your rehearsal or practice session.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Available Rooms */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Available Band Rooms</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Select a room and choose your preferred schedule.
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No band rooms are currently available.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onBook={handleBookRoom} />
            ))}
          </div>
        )}
      </section>

      {/* My Bookings */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">My Bookings</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            View your band room reservations.
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You don't have any room bookings yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => handleViewBooking(booking)}
                className="w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold">{booking.roomName}</h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.date} • {booking.startTime} - {booking.endTime}
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      ₱{booking.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <BookingStatus status={booking.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
