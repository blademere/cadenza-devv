
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { getInstruments } from '@/services/admin/instrumentsService';
import { createWalkInRental } from '@/services/front-desk/instrument-rentalsService';
import {
  getHoursForDate,
  getOperatingHours,
} from '@/services/operatingHoursService';

const localDate = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const timeOptions = Array.from(
  { length: 48 },
  (_, index) =>
    `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
);

const minutes = (value) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const addDays = (dateKey, amount) => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};
const earliestRentalDate = (today) => addDays(today, 1);
const latestRentalDate = (today) => addDays(today, 5);

const minimumReturn = (config, dateKey, startTime) => {
  if (!dateKey || !startTime) return null;
  let date = dateKey;
  let time = minutes(startTime);
  let remaining = 8 * 60;

  for (let index = 0; index < 370 && remaining > 0; index += 1) {
    const hours = getHoursForDate(config, date);
    if (!hours || hours.isClosed) {
      date = addDays(date, 1);
      time = 0;
      continue;
    }

    const opening = minutes(hours.startTime);
    const closing = minutes(hours.endTime);
    const cursor = Math.max(time, opening);
    if (cursor < closing) {
      const available = closing - cursor;
      if (remaining <= available) {
        const end = cursor + remaining;
        return {
          date,
          time: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
        };
      }
      remaining -= available;
    }

    date = addDays(date, 1);
    time = 0;
  }

  return null;
};

const displayTime = (value) => {
  const [hour, minute] = value.split(':').map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
};

const fieldClass =
  'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring';

const namePattern =
  /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*(?:[ ]+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*)*$/;

const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

const phonePattern = /^9\d{9}$/;

const normalizePhilippinePhone = (value) => {
  let digits = String(value ?? '').replace(/\D/g, '');

  if (digits.startsWith('63')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
};

const validateEmail = (value) => {
  const email = String(value ?? '').trim();

  // Email is optional.
  if (!email) return '';

  if (email.length > 254) {
    return 'Email must not exceed 254 characters.';
  }

  const parts = email.split('@');

  if (parts.length !== 2) {
    return 'Enter a valid email address.';
  }

  if (parts[0].length > 64) {
    return 'The email username must not exceed 64 characters.';
  }

  if (!emailPattern.test(email)) {
    return 'Enter a valid email address, e.g. name@example.com.';
  }

  return '';
};

const validateField = (key, value) => {
  const trimmed = String(value ?? '').trim();

  if (key === 'firstName' || key === 'lastName') {
    if (!trimmed) {
      return 'This field is required.';
    }

    if (!namePattern.test(trimmed)) {
      return 'Capitalize the first letter of each name and use letters only.';
    }
  }

  if (key === 'phone') {
    if (!trimmed) {
      return 'Phone number is required.';
    }

    if (!phonePattern.test(trimmed)) {
      return 'Enter 10 digits starting with 9.';
    }
  }

  if (key === 'email') {
    return validateEmail(trimmed);
  }

  return '';
};

const getInputClass = (error, valid) =>
  `${fieldClass} ${
    error
      ? 'border-destructive focus-visible:ring-destructive'
      : valid
        ? 'border-emerald-500 focus-visible:ring-emerald-500'
        : ''
  }`;

export default function FrontDeskWalkInRentalPage() {
  const navigate = useNavigate();

  const [instruments, setInstruments] = useState([]);
  const [operatingHours, setOperatingHours] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    instrumentId: '',
    date: earliestRentalDate(localDate()),
    returnDate: localDate(),
    startTime: '',
    endTime: '',
    paymentMethod: 'CASH',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    Promise.all([getInstruments(), getOperatingHours()])
      .then(([instrumentData, hours]) => {
        setInstruments(
          (Array.isArray(instrumentData) ? instrumentData : []).filter(
            (instrument) =>
              instrument.status === 'AVAILABLE' &&
              Number(instrument.rentalRate) > 0,
          ),
        );

        setOperatingHours(hours);
      })
      .catch((error) =>
        setMessage({
          type: 'error',
          text:
            error?.response?.data?.message ||
            error?.message ||
            'Unable to load rental settings.',
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));

    if (['firstName', 'lastName', 'phone', 'email'].includes(key)) {
      setTouched((current) => ({
        ...current,
        [key]: true,
      }));

      setFieldErrors((current) => ({
        ...current,
        [key]: validateField(key, value),
      }));
    }

    setMessage((current) =>
      current.type === 'error' &&
      current.text ===
        'Please correct the highlighted customer details before continuing.'
        ? { type: '', text: '' }
        : current,
    );
  };

  const validateOnBlur = (key) => {
    setTouched((current) => ({
      ...current,
      [key]: true,
    }));

    setFieldErrors((current) => ({
      ...current,
      [key]: validateField(key, form[key]),
    }));

    if (key === 'email') {
      setForm((current) => ({
        ...current,
        email: current.email.trim(),
      }));
    }
  };

  const capitalizeName = (value) =>
    value.replace(
      /(^|[\s'-])([a-zà-öø-ÿ])/g,
      (_, separator, letter) => separator + letter.toLocaleUpperCase(),
    );

  const today = localDate();

  const startHours = getHoursForDate(operatingHours, form.date);
  const returnHours = getHoursForDate(operatingHours, form.returnDate);

  const currentCutoff =
    form.date === today
      ? (Math.floor(
          (new Date().getHours() * 60 + new Date().getMinutes()) / 30,
        ) +
          1) *
        30
      : 0;

  const startTimes = startHours?.isClosed
    ? []
    : timeOptions.filter(
        (time) =>
          minutes(time) >=
            Math.max(
              minutes(startHours?.startTime || '08:00'),
              currentCutoff,
            ) && minutes(time) < minutes(startHours?.endTime || '17:00'),
      );

  const endTimes = returnHours?.isClosed
    ? []
    : timeOptions.filter(
        (time) =>
          minutes(time) >= minutes(returnHours?.startTime || '08:00') &&
          minutes(time) <= minutes(returnHours?.endTime || '17:00') &&
          (() => {
            const minimum = minimumReturn(operatingHours, form.date, form.startTime);
            return !minimum || form.returnDate > minimum.date ||
              (form.returnDate === minimum.date && time >= minimum.time);
          })(),
      );

  const setStartTime = (value) => {
    const minimum = minimumReturn(operatingHours, form.date, value);
    setForm((current) => ({
      ...current,
      startTime: value,
      ...(minimum
        ? { returnDate: minimum.date, endTime: minimum.time }
        : { endTime: '' }),
    }));
  };

  const operationalHoursBetween = () => {
    if (!form.startTime || !form.endTime || !form.date || !form.returnDate) {
      return 0;
    }

    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.returnDate}T${form.endTime}:00`);

    if (end <= start) return 0;

    let total = 0;

    const day = new Date(start);
    day.setHours(0, 0, 0, 0);

    const last = new Date(end);
    last.setHours(0, 0, 0, 0);

    for (let index = 0; index < 370 && day <= last; index += 1) {
      const hours = getHoursForDate(operatingHours, day);

      if (hours && !hours.isClosed) {
        const opening = new Date(day);
        const closing = new Date(day);

        const [oh, om] = hours.startTime.split(':').map(Number);
        const [ch, cm] = hours.endTime.split(':').map(Number);

        opening.setHours(oh, om, 0, 0);
        closing.setHours(ch, cm, 0, 0);

        total +=
          Math.max(
            0,
            Math.min(end.getTime(), closing.getTime()) -
              Math.max(start.getTime(), opening.getTime()),
          ) / 3600000;
      }

      day.setDate(day.getDate() + 1);
    }

    return total;
  };

  const selectedInstrument = instruments.find(
    (instrument) => instrument.id === form.instrumentId,
  );
  const rentalHours = operationalHoursBetween();
  const billableHours = Math.max(8, Math.ceil(rentalHours));
  const rentalAmount = selectedInstrument
    ? (Number(selectedInstrument.rentalRate) / 8) * billableHours
    : 0;

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    const nextErrors = {
      firstName: validateField('firstName', form.firstName),
      lastName: validateField('lastName', form.lastName),
      phone: validateField('phone', form.phone),
      email: validateField('email', form.email),
    };

    setFieldErrors(nextErrors);
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setMessage({
        type: 'error',
        text: 'Please correct the highlighted customer details before continuing.',
      });
      return;
    }

    if (!form.instrumentId) {
      setMessage({
        type: 'error',
        text: 'Please select an available instrument.',
      });
      return;
    }

    if (form.returnDate < form.date) {
      setMessage({
        type: 'error',
        text: 'Return date cannot be earlier than the rental date.',
      });
      return;
    }

    if (
      startHours?.isClosed ||
      returnHours?.isClosed ||
      !startTimes.includes(form.startTime) ||
      !endTimes.includes(form.endTime)
    ) {
      setMessage({
        type: 'error',
        text: 'Select start and return times inside the registered operating hours.',
      });
      return;
    }

    if (operationalHoursBetween() < 8) {
      setMessage({
        type: 'error',
        text: 'Instrument rentals must contain at least 8 registered operating hours.',
      });
      return;
    }

    try {
      setSaving(true);

      await createWalkInRental({
        customer: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: `+63${normalizePhilippinePhone(form.phone)}`,
          email: form.email.trim(),
        },
        rentalType: 'INDIVIDUAL',
        instrumentId: form.instrumentId,
        scheduledStart: `${form.date}T${form.startTime}:00+08:00`,
        scheduledEnd: `${form.returnDate}T${form.endTime}:00+08:00`,
        paymentMethod: form.paymentMethod,
      });

      setFieldErrors({});
      setTouched({});

      setMessage({
        type: 'success',
        text: 'Walk-in rental created and approved.',
      });

      setForm((current) => ({
        ...current,
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        instrumentId: '',
        startTime: '',
        endTime: '',
      }));
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error?.response?.data?.message ||
          error?.message ||
          'Unable to create walk-in rental.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/front-desk/rentals')}
            >
              <ArrowLeft />
            </Button>

            <div>
              <h1 className="text-2xl font-semibold">
                Walk-in Instrument Rental
              </h1>
              <p className="text-muted-foreground">
                Record a customer without creating an account.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer and rental details</CardTitle>
              <CardDescription>
                Only registered operating hours count toward the 8-hour
                minimum. Closed dates and past time slots are blocked.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={submit} className="space-y-5" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    First name

                    <input
                      required
                      autoComplete="given-name"
                      maxLength={60}
                      className={getInputClass(
                        touched.firstName && fieldErrors.firstName,
                        touched.firstName &&
                          !fieldErrors.firstName &&
                          Boolean(form.firstName.trim()),
                      )}
                      value={form.firstName}
                      aria-invalid={Boolean(
                        touched.firstName && fieldErrors.firstName,
                      )}
                      onBlur={() => validateOnBlur('firstName')}
                      onChange={(event) =>
                        update(
                          'firstName',
                          capitalizeName(event.target.value),
                        )
                      }
                    />

                    {touched.firstName && fieldErrors.firstName && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </label>

                  <label className="text-sm">
                    Last name

                    <input
                      required
                      autoComplete="family-name"
                      maxLength={60}
                      className={getInputClass(
                        touched.lastName && fieldErrors.lastName,
                        touched.lastName &&
                          !fieldErrors.lastName &&
                          Boolean(form.lastName.trim()),
                      )}
                      value={form.lastName}
                      aria-invalid={Boolean(
                        touched.lastName && fieldErrors.lastName,
                      )}
                      onBlur={() => validateOnBlur('lastName')}
                      onChange={(event) =>
                        update('lastName', capitalizeName(event.target.value))
                      }
                    />

                    {touched.lastName && fieldErrors.lastName && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </label>

                  <label className="text-sm">
                    Phone (Philippines)

                    <div
                      className={`mt-1 flex h-10 w-full overflow-hidden rounded-md border bg-background ${
                        touched.phone && fieldErrors.phone
                          ? 'border-destructive'
                          : touched.phone &&
                              !fieldErrors.phone &&
                              phonePattern.test(
                                normalizePhilippinePhone(form.phone),
                              )
                            ? 'border-emerald-500'
                            : 'border-input'
                      }`}
                    >
                      <span className="flex items-center border-r bg-muted px-3 text-sm text-muted-foreground">
                        +63
                      </span>

                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="9XXXXXXXXX"
                        maxLength={10}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                        value={form.phone}
                        onChange={(event) =>
                          update(
                            'phone',
                            normalizePhilippinePhone(event.target.value),
                          )
                        }
                        onBlur={() => validateOnBlur('phone')}
                        aria-invalid={Boolean(
                          touched.phone && fieldErrors.phone,
                        )}
                        aria-describedby="phone-error"
                      />
                    </div>

                    <span className="mt-1 block text-xs text-muted-foreground">
                      Enter 10 digits after +63. Example: 9171234567.
                    </span>

                    {touched.phone && fieldErrors.phone && (
                      <span
                        id="phone-error"
                        className="mt-1 block text-xs text-destructive"
                      >
                        {fieldErrors.phone}
                      </span>
                    )}
                  </label>

                  <label className="text-sm">
                    Email (optional)

                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="name@example.com"
                      className={getInputClass(
                        touched.email && fieldErrors.email,
                        touched.email &&
                          !fieldErrors.email &&
                          Boolean(form.email.trim()),
                      )}
                      value={form.email}
                      onChange={(event) =>
                        update('email', event.target.value)
                      }
                      onBlur={() => validateOnBlur('email')}
                      aria-invalid={Boolean(
                        touched.email && fieldErrors.email,
                      )}
                      aria-describedby="email-error"
                    />

                    {touched.email && fieldErrors.email ? (
                      <p
                        id="email-error"
                        className="mt-1 text-xs text-destructive"
                      >
                        {fieldErrors.email}
                      </p>
                    ) : (
                      <p
                        className={`mt-1 text-xs ${
                          touched.email && form.email.trim()
                            ? 'text-emerald-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {form.email.trim() && !validateEmail(form.email)
                          ? 'Valid email format.'
                          : 'Enter a valid email address if provided.'}
                      </p>
                    )}
                  </label>

                  <label className="text-sm sm:col-span-2">
                    Instrument

                    <select
                      required
                      className={fieldClass}
                      value={form.instrumentId}
                      disabled={loading}
                      onChange={(event) =>
                        update('instrumentId', event.target.value)
                      }
                    >
                      <option value="">
                        {loading
                          ? 'Loading instruments...'
                          : 'Select an instrument'}
                      </option>

                      {instruments.map((instrument) => (
                        <option key={instrument.id} value={instrument.id}>
                          {[instrument.brand, instrument.model]
                            .filter(Boolean)
                            .join(' ') || 'Instrument'}{' '}
                          — ₱{Number(instrument.rentalRate).toLocaleString()}
                        </option>
                      ))}
                    </select>

                    {!loading && instruments.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        No available instruments with a rental rate were found.
                      </p>
                    )}
                  </label>

                  <label className="text-sm">
                    Rental date

                    <input
                      required
                      min={earliestRentalDate(today)}
                      max={latestRentalDate(today)}
                      type="date"
                      className={fieldClass}
                      value={form.date}
                      onChange={(event) => {
                        const nextDate = event.target.value;

                        update('date', nextDate < earliestRentalDate(today) || nextDate > latestRentalDate(today) ? earliestRentalDate(today) : nextDate);
                        update('startTime', '');
                        update('endTime', '');

                        if (form.returnDate < nextDate) {
                          update('returnDate', nextDate);
                        }
                      }}
                    />
                  </label>

                  <label className="text-sm">
                    Return date

                    <input
                      required
                      min={form.date}
                      type="date"
                      className={fieldClass}
                      value={form.returnDate}
                      onChange={(event) => {
                        update('returnDate', event.target.value);
                        update('endTime', '');
                      }}
                    />
                  </label>

                  <label className="text-sm">
                    Start time

                    <select
                      required
                      className={fieldClass}
                      value={form.startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    >
                      <option value="">
                        {startHours?.isClosed
                          ? 'Facility closed'
                          : 'Select start'}
                      </option>

                      {startTimes.map((time) => (
                        <option key={time} value={time}>
                          {displayTime(time)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.instrumentId && form.startTime && form.endTime && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm sm:col-span-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Rental amount</span>
                        <span className="text-lg font-semibold">₱{rentalAmount.toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rentalHours.toFixed(1)} operating hours · minimum 8 hours
                      </p>
                    </div>
                  )}

                  <label className="text-sm">
                    Return time

                    <select
                      required
                      className={fieldClass}
                      value={form.endTime}
                      onChange={(event) =>
                        update('endTime', event.target.value)
                      }
                    >
                      <option value="">
                        {returnHours?.isClosed
                          ? 'Facility closed'
                          : 'Select return'}
                      </option>

                      {endTimes.map((time) => (
                        <option key={time} value={time}>
                          {displayTime(time)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    Payment method

                    <select
                      className={fieldClass}
                      value={form.paymentMethod}
                      onChange={(event) =>
                        update('paymentMethod', event.target.value)
                      }
                    >
                      <option value="CASH">Cash</option>
                      <option value="GCASH">GCash</option>
                      <option value="CARD">Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                </div>

                {message.text && (
                  <p
                    role="alert"
                    className={`rounded-md p-3 text-sm ${
                      message.type === 'error'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-emerald-500/10 text-emerald-700'
                    }`}
                  >
                    {message.text}
                  </p>
                )}

                <Button type="submit" disabled={saving || loading}>
                  {saving && <Loader2 className="animate-spin" />}
                  {saving ? 'Creating rental...' : 'Create walk-in rental'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
