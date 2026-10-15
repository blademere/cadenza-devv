import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  Loader2Icon,
  ShoppingCartIcon,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getHoursForDate, getOperatingHours } from '@/services/operatingHoursService';

import {
  checkInstrumentAvailability,
  getInstrument,
} from '../services/instrument-rental.service';

const MINIMUM_RENTAL_HOURS = 8;

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getName = (instrument) =>
  instrument?.name ||
  [instrument?.brand, instrument?.model].filter(Boolean).join(' ') ||
  'Instrument';

const getDurationHours = (schedule) => {
  if (!schedule?.start || !schedule?.end) return 0;

  const start = new Date(schedule.start);
  const end = new Date(schedule.end);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0;
  }

  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

const getEstimate = (instrument, schedule, operationalDurationHours = null) => {
  const durationHours = operationalDurationHours ?? getDurationHours(schedule);

  const billableHours = durationHours
    ? Math.max(MINIMUM_RENTAL_HOURS, Math.ceil(durationHours))
    : 0;

  const hourlyRate =
    Number(instrument?.rentalRate || 0) / MINIMUM_RENTAL_HOURS;

  return {
    durationHours,
    billableHours,
    hourlyRate,
    total: hourlyRate * billableHours,
  };
};

const getTimeOptions = () =>
  Array.from({ length: 48 }, (_, index) => {
    const hours = Math.floor(index / 2);
    const minutes = index % 2 === 0 ? '00' : '30';

    const value = `${String(hours).padStart(2, '0')}:${minutes}`;

    const displayHour = hours % 12 || 12;
    const period = hours < 12 ? 'AM' : 'PM';

    return {
      value,
      label: `${displayHour}:${minutes} ${period}`,
    };
  });

const combineDateTime = (date, time) => {
  if (!date || !time) return '';

  return `${date}T${time}`;
};

const getToday = () => new Date().toISOString().split('T')[0];

export default function CreateInstrumentRental() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const instrumentIds = useMemo(
    () =>
      (searchParams.get('instruments') ||
        searchParams.get('instrument') ||
        '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    [searchParams],
  );

  const timeOptions = useMemo(() => getTimeOptions(), []);

  const getDateKey = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getOperationalDurationHours = (schedule) => {
    if (!schedule?.start || !schedule?.end) return 0;
    const start = new Date(schedule.start);
    const end = new Date(schedule.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

    let totalMinutes = 0;
    const day = new Date(start);
    day.setHours(0, 0, 0, 0);
    const lastDay = new Date(end);
    lastDay.setHours(0, 0, 0, 0);
    for (let index = 0; index < 370 && day <= lastDay; index += 1) {
      const hours = getHoursForDate(operatingHours, day);
      if (hours && !hours.isClosed) {
        const opening = new Date(day);
        const closing = new Date(day);
        const [openHour, openMinute] = hours.startTime.split(':').map(Number);
        const [closeHour, closeMinute] = hours.endTime.split(':').map(Number);
        opening.setHours(openHour, openMinute, 0, 0);
        closing.setHours(closeHour, closeMinute, 0, 0);
        const overlapStart = Math.max(start.getTime(), opening.getTime());
        const overlapEnd = Math.min(end.getTime(), closing.getTime());
        if (overlapEnd > overlapStart) totalMinutes += (overlapEnd - overlapStart) / (1000 * 60);
      }
      day.setDate(day.getDate() + 1);
    }
    return totalMinutes / 60;
  };

  const getDateTimeOptions = (date, isStart, minimumTime = null) => {
    const hours = getHoursForDate(operatingHours, date || new Date());
    if (hours?.isClosed) return [];
    const open = hours?.startTime || '08:00';
    const close = hours?.endTime || '17:00';
    const toMinutes = (value) => value.split(':').map(Number).reduce((total, part, index) => total + part * (index ? 1 : 60), 0);
    let minimum = Math.max(toMinutes(open), minimumTime ? toMinutes(minimumTime) : 0);
    if (isStart && date === getDateKey()) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      // Always block the current half-hour slot. At 9:00 or 9:29, the first
      // available start is 9:30; at 9:30, it is 10:00.
      minimum = Math.max(minimum, (Math.floor(currentMinutes / 30) + 1) * 30);
    }
    const latestStart = toMinutes(close) - 30;
    return timeOptions.filter((option) => toMinutes(option.value) >= minimum && toMinutes(option.value) <= (isStart ? latestStart : toMinutes(close)));
  };

  const getEightHourReturn = (date, time) => {
    let cursor = new Date(`${date}T${time}:00`);
    let remainingMinutes = MINIMUM_RENTAL_HOURS * 60;

    for (let index = 0; index < 370 && remainingMinutes > 0; index += 1) {
      const hours = getHoursForDate(operatingHours, cursor);
      if (!hours || hours.isClosed) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
        continue;
      }
      const opening = new Date(cursor);
      const closing = new Date(cursor);
      const [openHour, openMinute] = hours.startTime.split(':').map(Number);
      const [closeHour, closeMinute] = hours.endTime.split(':').map(Number);
      opening.setHours(openHour, openMinute, 0, 0);
      closing.setHours(closeHour, closeMinute, 0, 0);
      if (cursor < opening) cursor = opening;
      if (cursor >= closing) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
        continue;
      }
      const availableMinutes = Math.floor((closing.getTime() - cursor.getTime()) / (1000 * 60));
      const consumedMinutes = Math.min(availableMinutes, remainingMinutes);
      cursor = new Date(cursor.getTime() + consumedMinutes * 60 * 1000);
      remainingMinutes -= consumedMinutes;
      if (remainingMinutes > 0) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
      }
    }

    return { date: getDateKey(cursor), time: `${String(cursor.getHours()).padStart(2, '0')}:${String(cursor.getMinutes()).padStart(2, '0')}` };
  };

  const isDateBlocked = (date) => {
    if (!date) return false;
    const hours = getHoursForDate(operatingHours, date);
    if (hours?.isClosed) return true;
    if (date !== getDateKey()) return false;
    const now = new Date();
    const [hour, minute] = (hours?.endTime || '17:00').split(':').map(Number);
    const closing = new Date(now); closing.setHours(hour, minute, 0, 0);
    return now >= closing;
  };

  const isRentalStartWithinHours = (schedule) => {
    const start = new Date(schedule.start);
    const hours = getHoursForDate(operatingHours, schedule.rentalDate);
    if (!schedule.start || Number.isNaN(start.getTime()) || hours?.isClosed) return false;
    const [openHour, openMinute] = (hours?.startTime || '08:00').split(':').map(Number);
    const [closeHour, closeMinute] = (hours?.endTime || '17:00').split(':').map(Number);
    const opening = new Date(start); opening.setHours(openHour, openMinute, 0, 0);
    const closing = new Date(start); closing.setHours(closeHour, closeMinute, 0, 0);
    return start >= opening && start < closing;
  };

  const [instruments, setInstruments] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [availability, setAvailability] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [operatingHours, setOperatingHours] = useState(null);

  useEffect(() => {
    getOperatingHours().then(setOperatingHours).catch(() => setOperatingHours(null));
  }, []);

  useEffect(() => {
    const loadInstruments = async () => {
      if (!instrumentIds.length) {
        setError('No instruments were selected.');
        setLoading(false);
        return;
      }

      try {
        const data = await Promise.all(
          instrumentIds.map((id) => getInstrument(id)),
        );

        setInstruments(data);

        setSchedules(
          Object.fromEntries(
            data.map((instrument) => [
              instrument.id,
              {
                rentalDate: '',
                startTime: '',
                returnDate: '',
                endTime: '',
                start: '',
                end: '',
              },
            ]),
          ),
        );
      } catch (requestError) {
        setError(
          requestError?.message ||
            'Unable to load the selected instruments.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadInstruments();
  }, [instrumentIds.join(',')]);

  useEffect(() => {
    const handlePaymentComplete = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== 'CADENZA_RENTAL_PAYMENT_COMPLETED' ||
        !event.data?.rentalId
      ) {
        return;
      }

      setSubmitting(false);

      navigate(
        `/client/instrument-rentals/${event.data.rentalId}`,
      );
    };

    window.addEventListener('message', handlePaymentComplete);

    return () => {
      window.removeEventListener(
        'message',
        handlePaymentComplete,
      );
    };
  }, [navigate]);

  const updateSchedule = (id, field, value) => {
    setSchedules((current) => {
      const currentSchedule = current[id] || {};

      const updatedSchedule = {
        ...currentSchedule,
        [field]: value,
      };

      if (field === 'rentalDate' && updatedSchedule.returnDate && updatedSchedule.returnDate < value) {
        updatedSchedule.returnDate = '';
        updatedSchedule.endTime = '';
      }

      const rentalDate =
        field === 'rentalDate'
          ? value
          : updatedSchedule.rentalDate;

      const startTime =
        field === 'startTime'
          ? value
          : updatedSchedule.startTime;

      const returnDate =
        field === 'returnDate'
          ? value
          : updatedSchedule.returnDate;

      const endTime =
        field === 'endTime'
          ? value
          : updatedSchedule.endTime;

      return {
        ...current,
        [id]: {
          ...updatedSchedule,
          start: combineDateTime(
            rentalDate,
            startTime,
          ),
          end: combineDateTime(
            returnDate,
            endTime,
          ),
        },
      };
    });

    setAvailability((current) => ({
      ...current,
      [id]: null,
    }));

    setError('');
  };

  const handleRentalDateChange = (id, field, value) => {
    const currentSchedule = schedules[id] || {};
    if (field === 'returnDate' && currentSchedule.rentalDate && value < currentSchedule.rentalDate) {
      updateSchedule(id, field, '');
      return;
    }
    if (isDateBlocked(value)) {
      updateSchedule(id, field, '');
      return;
    }
    updateSchedule(id, field, value);
    if (field === 'rentalDate' && currentSchedule.startTime) {
      const automaticReturn = getEightHourReturn(value, currentSchedule.startTime);
      updateSchedule(id, 'returnDate', automaticReturn.date);
      updateSchedule(id, 'endTime', automaticReturn.time);
    }
  };

  const handleRentalStartTimeChange = (id, value) => {
    updateSchedule(id, 'startTime', value);
    const schedule = schedules[id] || {};
    if (schedule.rentalDate && value) {
      const automaticReturn = getEightHourReturn(schedule.rentalDate, value);
      updateSchedule(id, 'returnDate', automaticReturn.date);
      updateSchedule(id, 'endTime', automaticReturn.time);
    }
  };

  const checkAvailability = async (instrument) => {
    const schedule = schedules[instrument.id];

    if (
      !schedule?.rentalDate ||
      !schedule?.startTime ||
      !schedule?.returnDate ||
      !schedule?.endTime
    ) {
      setError(
        `Please select the rental date, start time, return date, and return time for ${getName(
          instrument,
        )}.`,
      );

      return false;
    }

    const durationHours = getOperationalDurationHours(schedule);

    if (!isRentalStartWithinHours(schedule)) {
      setError(`${getName(instrument)} must be scheduled within the facility operating hours.`);
      return false;
    }

    if (durationHours < MINIMUM_RENTAL_HOURS) {
      setError(
        `${getName(
          instrument,
        )} requires a minimum rental period of 8 hours.`,
      );

      return false;
    }

    try {
      setCheckingId(instrument.id);
      setError('');

      const data = await checkInstrumentAvailability({
        scheduledStart: new Date(
          schedule.start,
        ).toISOString(),

        scheduledEnd: new Date(
          schedule.end,
        ).toISOString(),
      });

      const isAvailable = Array.isArray(data)
        ? data.some(
            (item) => item.id === instrument.id,
          )
        : data?.id === instrument.id;

      setAvailability((current) => ({
        ...current,
        [instrument.id]: isAvailable,
      }));

      if (!isAvailable) {
        setError(
          `${getName(
            instrument,
          )} is not available for this schedule.`,
        );
      }

      return isAvailable;
    } catch (requestError) {
      setAvailability((current) => ({
        ...current,
        [instrument.id]: false,
      }));

      setError(
        requestError?.message ||
          `Unable to check ${getName(
            instrument,
          )} availability.`,
      );

      return false;
    } finally {
      setCheckingId(null);
    }
  };

  const submitRentals = async () => {
    setError('');

    if (!paymentPlan) {
      setError('Please select a payment option.');
      return;
    }

    for (const instrument of instruments) {
      const schedule = schedules[instrument.id];

      if (
        !schedule?.rentalDate ||
        !schedule?.startTime ||
        !schedule?.returnDate ||
        !schedule?.endTime
      ) {
        setError(
          `Please complete the rental and return schedule for ${getName(
            instrument,
          )}.`,
        );

        return;
      }

      const durationHours = getOperationalDurationHours(schedule);

      if (!isRentalStartWithinHours(schedule)) {
        setError(`${getName(instrument)} must be scheduled within the facility operating hours.`);
        return;
      }

      if (durationHours < MINIMUM_RENTAL_HOURS) {
        setError(
          `${getName(
            instrument,
          )} must have a rental period of at least 8 hours.`,
        );

        return;
      }

      if (availability[instrument.id] !== true) {
        const isAvailable =
          await checkAvailability(instrument);

        if (!isAvailable) return;
      }
    }

    try {
      setSubmitting(true);

      localStorage.setItem(
        'cadenza-pending-rental-checkout',
        JSON.stringify({
          paymentPlan,

          items: instruments.map(
            (instrument) => ({
              instrument,

              schedule:
                schedules[instrument.id],
            }),
          ),
        }),
      );

      const paymentWindow = window.open(
        `${window.location.origin}/client/instrument-rentals/payment`,
        '_blank',
      );

      if (!paymentWindow) {
        setError(
          'The payment tab was blocked. Please allow popups for this site and try again.',
        );

        setSubmitting(false);
      }
    } catch (requestError) {
      setError(
        requestError?.errors?.length
          ? requestError.errors
              .map(
                (item) =>
                  item.message ||
                  item.path,
              )
              .join(' ')
          : requestError?.message ||
              'Unable to create the rental requests.',
      );

      setSubmitting(false);
    }
  };

  const totalEstimate = instruments.reduce(
    (total, instrument) =>
      total +
      getEstimate(
        instrument,
        schedules[instrument.id],
        getOperationalDurationHours(schedules[instrument.id]),
      ).total,
    0,
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="h-5 w-5 animate-spin" />
        Loading cart...
      </div>
    );
  }

  if (!instruments.length) {
    return (
      <div className="space-y-6 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/client/instrument-rentals',
            )
          }
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Instrument Rentals
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {error ||
            'No instruments were selected.'}
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6 lg:px-6">
      <button
        type="button"
        onClick={() =>
          navigate(
            '/client/instrument-rentals',
          )
        }
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Instrument Rentals
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShoppingCartIcon className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Rental Cart
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Set a separate rental and return schedule for each selected instrument.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3 text-sm shadow-sm">
          <span className="text-muted-foreground">
            Items in cart
          </span>

          <span className="ml-3 font-semibold">
            {instruments.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {instruments.map((instrument) => {
            const schedule =
              schedules[instrument.id] || {};

            const estimate =
              getEstimate(
                instrument,
                schedule,
                getOperationalDurationHours(schedule),
              );

            const isAvailable =
              availability[
                instrument.id
              ] === true;
            const startOptions = getDateTimeOptions(schedule.rentalDate, true);
            const automaticReturn = schedule.rentalDate && schedule.startTime
              ? getEightHourReturn(schedule.rentalDate, schedule.startTime)
              : null;
            const minimumReturnTime = automaticReturn && schedule.returnDate === automaticReturn.date
              ? automaticReturn.time
              : null;
            const endOptions = getDateTimeOptions(schedule.returnDate, false, minimumReturnTime);

            return (
              <section
                key={instrument.id}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-primary">
                      Rental item
                    </p>

                    <h2 className="mt-1 text-lg font-semibold">
                      {getName(instrument)}
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      {[
                        instrument.brand,
                        instrument.model,
                      ]
                        .filter(Boolean)
                        .join(' ') ||
                        'Instrument'}
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted px-3 py-2 text-right text-sm">
                    <p className="text-xs text-muted-foreground">
                      Base rate
                    </p>

                    <p className="font-semibold">
                      {formatCurrency(
                        instrument.rentalRate,
                      )}{' '}
                      / 8 hours
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`rentalDate-${instrument.id}`}
                      className="text-sm font-medium"
                    >
                      Rental Date
                    </label>

                    <input
                      id={`rentalDate-${instrument.id}`}
                      type="date"
                      value={
                        schedule.rentalDate ||
                        ''
                      }
                        onChange={(event) =>
                        handleRentalDateChange(
                          instrument.id,
                          'rentalDate',
                          event.target.value,
                        )
                      }
                      min={getToday()}
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`startTime-${instrument.id}`}
                      className="text-sm font-medium"
                    >
                      Start Time
                    </label>

                    <select
                      id={`startTime-${instrument.id}`}
                      value={
                        schedule.startTime ||
                        ''
                      }
                      onChange={(event) =>
                        handleRentalStartTimeChange(
                          instrument.id,
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">
                        Select start time
                      </option>

                      {startOptions.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`returnDate-${instrument.id}`}
                      className="text-sm font-medium"
                    >
                      Return Date
                    </label>

                    <input
                      id={`returnDate-${instrument.id}`}
                      type="date"
                      value={
                        schedule.returnDate ||
                        ''
                      }
                      onChange={(event) =>
                        handleRentalDateChange(
                          instrument.id,
                          'returnDate',
                          event.target.value,
                        )
                      }
                      min={
                        schedule.rentalDate ||
                        getToday()
                      }
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`endTime-${instrument.id}`}
                      className="text-sm font-medium"
                    >
                      Return Time
                    </label>

                    <select
                      id={`endTime-${instrument.id}`}
                      value={
                        schedule.endTime ||
                        ''
                      }
                      onChange={(event) =>
                        updateSchedule(
                          instrument.id,
                          'endTime',
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">
                        Select return time
                      </option>

                      {endOptions.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    <span>
                      Duration:{' '}
                      {estimate.durationHours
                        ? `${estimate.durationHours.toFixed(
                            2,
                          )} hours`
                        : '—'}
                    </span>

                    <span>
                      Billable:{' '}
                      {estimate.billableHours
                        ? `${estimate.billableHours} hours`
                        : '—'}
                    </span>

                    <span>
                      Estimate:{' '}
                      {formatCurrency(
                        estimate.total,
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      checkAvailability(
                        instrument,
                      )
                    }
                    disabled={
                      checkingId ===
                      instrument.id
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-3 py-2 font-medium hover:bg-accent disabled:opacity-60"
                  >
                    {checkingId ===
                    instrument.id ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    ) : isAvailable ? (
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <CalendarDaysIcon className="h-4 w-4" />
                    )}

                    {isAvailable
                      ? 'Available'
                      : 'Check availability'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <aside className="h-fit rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-primary" />

            <h2 className="font-semibold">
              Order summary
            </h2>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            {instruments.map(
              (instrument) => (
                <div
                  key={instrument.id}
                  className="flex justify-between gap-4"
                >
                  <span className="truncate text-muted-foreground">
                    {getName(
                      instrument,
                    )}
                  </span>

                  <span className="shrink-0 font-medium">
                    {formatCurrency(
                      getEstimate(
                        instrument,
                        schedules[
                          instrument.id
                        ],
                        getOperationalDurationHours(schedules[instrument.id]),
                      ).total,
                    )}
                  </span>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 flex justify-between border-t pt-4 font-semibold">
            <span>
              Estimated total
            </span>

            <span>
              {formatCurrency(
                totalEstimate,
              )}
            </span>
          </div>

          <div className="mt-6 border-t pt-5">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-primary" />

              <h3 className="font-semibold">
                Payment option
              </h3>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Select a payment option to
              continue.
            </p>

            <div className="mt-4 grid gap-2">
              {[
                {
                  value:
                    'DOWN_PAYMENT',
                  title:
                    '50% down payment',
                  description:
                    'Pay the remaining balance before pickup.',
                  amount:
                    totalEstimate *
                    0.5,
                },
                {
                  value:
                    'FULL_PAYMENT',
                  title:
                    'Full payment',
                  description:
                    'Pay the complete rental amount now.',
                  amount:
                    totalEstimate,
                },
              ].map(
                (option) => (
                  <label
                    key={
                      option.value
                    }
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      paymentPlan ===
                      option.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-plan"
                      value={
                        option.value
                      }
                      checked={
                        paymentPlan ===
                        option.value
                      }
                      onChange={(
                        event,
                      ) =>
                        setPaymentPlan(
                          event
                            .target
                            .value,
                        )
                      }
                      className="sr-only"
                    />

                    <span className="flex justify-between gap-3 text-sm">
                      <span>
                        <span className="block font-medium">
                          {
                            option.title
                          }
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {
                            option.description
                          }
                        </span>
                      </span>

                      <span className="font-semibold">
                        {formatCurrency(
                          option.amount,
                        )}
                      </span>
                    </span>
                  </label>
                ),
              )}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              The payment QR will appear
              on the next step.
            </p>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Each instrument must have at
            least an 8-hour rental period.
          </p>

          <button
            type="button"
            onClick={submitRentals}
            disabled={
              submitting ||
              checkingId !== null ||
              !paymentPlan
            }
            aria-busy={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            )}

            {submitting
              ? 'Loading...'
              : 'Proceed Payment'}
          </button>
        </aside>
      </div>
    </main>
  );
}
