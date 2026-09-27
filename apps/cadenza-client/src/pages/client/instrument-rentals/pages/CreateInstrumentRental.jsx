import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import InstrumentCard from "../components/InstrumentCard";
import RentalStatus from "../components/RentalStatus";

import {
  getAvailableInstruments,
  getMyInstrumentRentals,
} from "../services/instrument-rental.service";

export default function InstrumentRentals() {
  const navigate = useNavigate();

  const [instruments, setInstruments] = useState([]);

  const [rentals, setRentals] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [availableInstruments, myRentals] = await Promise.all([
          getAvailableInstruments(),
          getMyInstrumentRentals(),
        ]);

        setInstruments(availableInstruments);

        setRentals(myRentals);
      } catch (error) {
        console.error(error);

        setError("Unable to load instrument rental information.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleRent = (instrument) => {
    navigate(`/client/instrument-rentals/new?instrument=${instrument.id}`);
  };

  const handleViewRental = (rental) => {
    navigate(`/client/instrument-rentals/${rental.id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading instruments...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Instrument Rentals
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Rent an instrument for your practice, rehearsal, or performance.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Available Instruments */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Available Instruments</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose an instrument and select your rental period.
          </p>
        </div>

        {instruments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No instruments are currently available for rental.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {instruments.map((instrument) => (
              <InstrumentCard
                key={instrument.id}
                instrument={instrument}
                onRent={handleRent}
              />
            ))}
          </div>
        )}
      </section>

      {/* My Rentals */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">My Rentals</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            View your current and previous instrument rentals.
          </p>
        </div>

        {rentals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You don't have any instrument rentals yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rentals.map((rental) => (
              <button
                key={rental.id}
                type="button"
                onClick={() => handleViewRental(rental)}
                className="w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold">{rental.instrumentName}</h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {rental.brand} {rental.model}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {rental.startDate} - {rental.endDate}
                    </p>

                    <p className="mt-2 text-sm font-medium">
                      ₱{rental.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <RentalStatus status={rental.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
