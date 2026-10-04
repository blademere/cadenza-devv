import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import RentalStatus from '../components/RentalStatus';
import RentalSummary from '../components/RentalSummary';

import { getInstrumentRental } from '../services/instrument-rental.service';

export default function InstrumentRentalDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [rental, setRental] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRental() {
      try {
        const data = await getInstrumentRental(id);

        setRental(data);
      } catch (error) {
        console.error(error);
        setError('Unable to load rental details.');
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
      <div className="space-y-6 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() => navigate('/client/instrument-rentals')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Instrument Rentals
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-destructive">
            {error || 'Rental not found.'}
          </p>
        </div>
      </div>
    );
  }

  const instrumentItems = Array.isArray(rental.items)
    ? rental.items
        .map((item) => item.instrument || item)
        .filter(Boolean)
    : [];

  const instrument = instrumentItems.length
    ? instrumentItems
    : {
        id: rental.instrumentId,
        name: rental.instrumentName,
        brand: rental.brand,
        model: rental.model,
        rentalRate: rental.rentalRate,
        rentalRateType: rental.rentalRateType,
      };

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <button
        type="button"
        onClick={() => navigate('/client/instrument-rentals')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Instrument Rentals
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Rental Details
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            View your instrument rental information.
          </p>
        </div>

        <RentalStatus status={rental.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Rental Information</h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Rental ID</p>

              <p className="mt-1 text-sm font-medium">{rental.id}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Start</p>

              <p className="mt-1 text-sm font-medium">
                {rental.scheduledStart || rental.startDate}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">End</p>

              <p className="mt-1 text-sm font-medium">
                {rental.scheduledEnd || rental.endDate}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>

              <p className="mt-1 text-lg font-semibold">
                ₱{Number(rental.totalAmount || 0).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Payment Plan</p>
              <p className="mt-1 text-sm font-medium">
                {rental.metadata?.paymentPlan === 'DOWN_PAYMENT'
                  ? '50% Down Payment'
                  : 'Full Payment'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Payment recorded through the QR payment step.
              </p>
            </div>
          </div>
        </div>

        <RentalSummary
          instrument={instrument}
          scheduledStart={rental.scheduledStart || rental.startDate}
          scheduledEnd={rental.scheduledEnd || rental.endDate}
        />
      </div>
    </div>
  );
}
