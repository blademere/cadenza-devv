import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Guitar, Loader2 } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import RentalStatus from "../components/RentalStatus";

import { getInstrumentRentalById } from "../services/instrument-rental.service";

export default function InstrumentRentalDetails() {
  const navigate = useNavigate();

  const { id } = useParams();

  const [rental, setRental] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRental() {
      try {
        const data = await getInstrumentRentalById(id);

        setRental(data);
      } catch (error) {
        console.error(error);

        setError("Unable to find this rental.");
      } finally {
        setLoading(false);
      }
    }

    loadRental();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading rental...
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() => navigate("/client/instrument-rentals")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Instrument Rentals
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
        onClick={() => navigate("/client/instrument-rentals")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Instrument Rentals
      </button>

      {/* Header */}
      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rental #{rental.id}
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              {rental.instrumentName}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {rental.brand} {rental.model}
            </p>
          </div>

          <RentalStatus status={rental.status} />
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Guitar className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Instrument</p>

              <p className="font-medium">{rental.instrumentName}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Rental Period</p>

              <p className="font-medium">
                {rental.startDate} - {rental.endDate}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>

            <p className="mt-1 text-xl font-semibold">{rental.quantity}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>

            <p className="mt-1 text-xl font-semibold">
              ₱{rental.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Rental Status</h2>

        <div className="mt-5 rounded-lg bg-muted/50 p-5">
          {rental.status === "PENDING" && (
            <>
              <h3 className="font-medium">Rental Request Under Review</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your instrument rental request has been submitted and is waiting
                for staff approval.
              </p>
            </>
          )}

          {rental.status === "APPROVED" && (
            <>
              <h3 className="font-medium">Rental Approved</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your instrument rental has been approved.
              </p>
            </>
          )}

          {rental.status === "REJECTED" && (
            <>
              <h3 className="font-medium">Rental Request Rejected</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your instrument rental request was not approved.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
