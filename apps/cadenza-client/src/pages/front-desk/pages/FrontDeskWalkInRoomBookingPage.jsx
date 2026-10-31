import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
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
import { getRooms } from '@/services/admin/roomsService';
import { createWalkInRoomBooking } from '@/services/front-desk/room-bookingsService';
import {
  getHoursForDate,
  getOperatingHours,
} from '@/services/operatingHoursService';

const localDate = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const addDays = (dateKey, amount) => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const dateKeyFromDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const calendarDaysForMonth = (month) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
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

const displayTime = (value) => {
  const [hour, minute] = value.split(':').map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
};

const fieldClass =
  'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const namePattern = /^[A-Z][a-zA-ZÀ-ÿ\s'-]*$/;

const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

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
    return 'Enter a valid email address, e.g. customer@example.com.';
  }

  return '';
};
// The input stores only the 10 digits after +63.
// Accept pasted formats such as 09171234567 and +639171234567.
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

const capitalizeFirstLetter = (value) => {
  if (!value) return value;

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const validateField = (key, value) => {
  const trimmed = String(value ?? '').trim();

  if (key === 'firstName' || key === 'lastName') {
    const label = key === 'firstName' ? 'First name' : 'Last name';

    if (!trimmed) {
      return `${label} is required.`;
    }

    if (!namePattern.test(trimmed)) {
      return 'Start with a capital letter. Use letters, spaces, hyphens, or apostrophes only.';
    }
  }

  if (key === 'phone') {
    if (!trimmed) {
      return 'Phone number is required.';
    }

    if (!/^9\d{9}$/.test(trimmed)) {
      return 'Enter a valid Philippine mobile number with 10 digits after +63.';
    }
  }

  if (key === 'email') {
    // Email is optional.
    if (!trimmed) {
      return '';
    }

    if (trimmed.length > 254 || !emailPattern.test(trimmed)) {
      return 'Enter a valid email address, e.g. customer@example.com.';
    }

    const username = trimmed.split('@')[0];

    if (username.length > 64) {
      return 'The email username must not exceed 64 characters.';
    }
  }

  return '';
};

export default function FrontDeskWalkInRoomBookingPage() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [operatingHours, setOperatingHours] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    roomId: '',
    date: addDays(localDate(), 1),
    startTime: '',
    endTime: '',
    paymentMethod: 'CASH',
    paymentReference: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({
    type: '',
    text: '',
  });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialDate = new Date(`${addDays(localDate(), 1)}T12:00:00`);
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  useEffect(() => {
    const loadSupportingData = async (background = false) => {
      try {
        const [roomData, hours] = await Promise.all([
          getRooms(),
          getOperatingHours(),
        ]);

        setRooms(
          (Array.isArray(roomData) ? roomData : []).filter(
            (room) =>
              room.status === 'AVAILABLE' && Number(room.rentalRate) > 0,
          ),
        );
        setOperatingHours(hours);
      } catch (error) {
        if (!background) {
          setMessage({
            type: 'error',
            text:
              error?.response?.data?.message ||
              error?.message ||
              'Unable to load walk-in booking settings.',
          });
        }
      } finally {
        if (!background) setLoading(false);
      }
    };

    loadSupportingData();
    const refreshTimer = window.setInterval(
      () => loadSupportingData(true),
      15000,
    );

    return () => window.clearInterval(refreshTimer);
  }, []);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === 'email') {
      setErrors((current) => ({
        ...current,
        email: validateEmail(value),
      }));
      return;
    }

    if (['firstName', 'lastName', 'phone'].includes(key)) {
      setErrors((current) => ({
        ...current,
        [key]: '',
      }));
    }
  };

  const validateOnBlur = (key) => {
    setErrors((current) => ({
      ...current,
      [key]: validateField(key, form[key]),
    }));
  };

  const today = localDate();

  const calendarDays = useMemo(
    () => calendarDaysForMonth(calendarMonth),
    [calendarMonth],
  );

  const selectDate = (dateKey) => {
    if (dateKey < today) return;

    update('date', dateKey);
    update('startTime', '');
    update('endTime', '');
  };

  const selectedHours = getHoursForDate(operatingHours, form.date);

  const open = selectedHours?.startTime || '08:00';
  const close = selectedHours?.endTime || '17:00';

  const currentCutoff =
    form.date === today
      ? (Math.floor(
          (new Date().getHours() * 60 + new Date().getMinutes()) / 30,
        ) +
          1) *
        30
      : 0;

  const startTimes = selectedHours?.isClosed
    ? []
    : timeOptions.filter(
        (time) =>
          minutes(time) >= Math.max(minutes(open), currentCutoff) &&
          minutes(time) <= minutes(close) - 60,
      );

  const endTimes = selectedHours?.isClosed
    ? []
    : timeOptions.filter(
        (time) =>
          minutes(time) >= minutes(form.startTime || open) + 60 &&
          minutes(time) <= minutes(close),
      );

  const selectedRoom = rooms.find(
    (room) => String(room.id) === String(form.roomId),
  );

  const amount = useMemo(() => {
    if (!selectedRoom || !form.startTime || !form.endTime) {
      return 0;
    }

    const duration = minutes(form.endTime) - minutes(form.startTime);

    const rentalDurationHours = Number(selectedRoom.rentalDurationHours || 2);

    if (duration <= 0 || rentalDurationHours <= 0) {
      return 0;
    }

    return (
      Number(selectedRoom.rentalRate) *
      Math.ceil(duration / 60 / rentalDurationHours)
    );
  }, [form.endTime, form.startTime, selectedRoom]);

  const submit = async (event) => {
    event.preventDefault();

    setMessage({
      type: '',
      text: '',
    });

    const nextErrors = {};

    ['firstName', 'lastName', 'phone', 'email'].forEach((key) => {
      const error = validateField(key, form[key]);

      if (error) {
        nextErrors[key] = error;
      }
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setMessage({
        type: 'error',
        text: 'Please correct the highlighted customer information.',
      });

      return;
    }

    if (!form.roomId) {
      setMessage({
        type: 'error',
        text: 'Please select a room.',
      });

      return;
    }

    if (
      selectedHours?.isClosed ||
      !startTimes.includes(form.startTime) ||
      !endTimes.includes(form.endTime)
    ) {
      setMessage({
        type: 'error',
        text: 'Select a time inside the registered operating hours. The current 30-minute slot is unavailable.',
      });

      return;
    }

    try {
      setSaving(true);

      await createWalkInRoomBooking({
        customer: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: `+63${form.phone}`,
          email: form.email.trim(),
        },
        roomId: form.roomId,
        // The form values are Manila wall-clock time. Include the business
        // timezone so the API does not reinterpret them in the browser/server
        // timezone before checking operating hours.
        scheduledStart: `${form.date}T${form.startTime}:00+08:00`,
        scheduledEnd: `${form.date}T${form.endTime}:00+08:00`,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference.trim() || undefined,
      });

      setMessage({
        type: 'success',
        text: 'Walk-in room booking created and approved.',
      });

      setErrors({});

      setForm((current) => ({
        ...current,
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        roomId: '',
        startTime: '',
        endTime: '',
      }));
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error?.response?.data?.message ||
          error?.message ||
          'Unable to create walk-in room booking.',
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

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/front-desk/room-bookings')}
            >
              <ArrowLeft />
            </Button>

            <div>
              <h1 className="text-2xl font-semibold">Walk-in Room Booking</h1>

              <p className="text-muted-foreground">
                Record a customer without creating an account.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
            <Card className="w-full lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="size-4" />
                  Choose booking date
                </CardTitle>
                <CardDescription>
                  Select a date without changing the booking steps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() =>
                      setCalendarMonth((current) =>
                        new Date(current.getFullYear(), current.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <p className="text-sm font-semibold">
                    {calendarMonth.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Next month"
                    onClick={() =>
                      setCalendarMonth((current) =>
                        new Date(current.getFullYear(), current.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-7 text-center text-xs text-muted-foreground">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <span key={`${day}-${index}`} className="py-2 font-medium">
                      {day}
                    </span>
                  ))}
                  {calendarDays.map((date) => {
                    const dateKey = dateKeyFromDate(date);
                    const isPast = dateKey < today;
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                    const isSelected = dateKey === form.date;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        disabled={isPast}
                        onClick={() => selectDate(dateKey)}
                        className={`mx-auto flex size-8 items-center justify-center rounded-full text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : isPast || !isCurrentMonth
                              ? 'text-muted-foreground/40'
                              : 'hover:bg-muted'
                        }`}
                        aria-label={`Choose ${date.toLocaleDateString('en-US', {
                          dateStyle: 'full',
                        })}`}
                        aria-pressed={isSelected}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{new Date(`${form.date}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer and booking details</CardTitle>

                <CardDescription>
                  Only registered operating-hour slots are available. The booking
                  is approved after server-side validation.
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
                      maxLength={100}
                      className={`${fieldClass} ${
                        errors.firstName ? 'border-destructive' : ''
                      }`}
                      value={form.firstName}
                      onChange={(event) =>
                        update(
                          'firstName',
                          capitalizeFirstLetter(event.target.value),
                        )
                      }
                      onBlur={() => validateOnBlur('firstName')}
                      aria-invalid={Boolean(errors.firstName)}
                    />
                    {errors.firstName && (
                      <span className="mt-1 block text-xs text-destructive">
                        {errors.firstName}
                      </span>
                    )}
                  </label>

                  <label className="text-sm">
                    Last name
                    <input
                      required
                      autoComplete="family-name"
                      maxLength={100}
                      className={`${fieldClass} ${
                        errors.lastName ? 'border-destructive' : ''
                      }`}
                      value={form.lastName}
                      onChange={(event) =>
                        update(
                          'lastName',
                          capitalizeFirstLetter(event.target.value),
                        )
                      }
                      onBlur={() => validateOnBlur('lastName')}
                      aria-invalid={Boolean(errors.lastName)}
                    />
                    {errors.lastName && (
                      <span className="mt-1 block text-xs text-destructive">
                        {errors.lastName}
                      </span>
                    )}
                  </label>

                  <label className="text-sm">
                    Phone
                    <div
                      className={`mt-1 flex h-10 w-full overflow-hidden rounded-md border bg-background ${
                        errors.phone ? 'border-destructive' : 'border-input'
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
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                        value={form.phone}
                        maxLength={10}
                        onChange={(event) =>
                          update(
                            'phone',
                            normalizePhilippinePhone(event.target.value),
                          )
                        }
                        onBlur={() => validateOnBlur('phone')}
                        aria-invalid={Boolean(errors.phone)}
                      />
                    </div>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Enter 10 digits after +63. Example: 9171234567.
                    </span>
                    {errors.phone && (
                      <span className="mt-1 block text-xs text-destructive">
                        {errors.phone}
                      </span>
                    )}
                  </label>

                  <label className="text-sm">
                    Email (optional)
                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="customer@example.com"
                      className={`${fieldClass} ${
                        errors.email
                          ? 'border-destructive focus-visible:ring-destructive'
                          : form.email.trim()
                            ? 'border-emerald-500'
                            : ''
                      }`}
                      value={form.email}
                      onChange={(event) => {
                        const value = event.target.value;

                        setForm((current) => ({
                          ...current,
                          email: value,
                        }));

                        setErrors((current) => ({
                          ...current,
                          email: validateEmail(value),
                        }));
                      }}
                      onBlur={() => {
                        const normalizedEmail = form.email.trim();

                        setForm((current) => ({
                          ...current,
                          email: normalizedEmail,
                        }));

                        setErrors((current) => ({
                          ...current,
                          email: validateEmail(normalizedEmail),
                        }));
                      }}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby="email-validation-message"
                    />
                    <span
                      id="email-validation-message"
                      className={`mt-1 block text-xs ${
                        errors.email
                          ? 'text-destructive'
                          : form.email.trim() && !validateEmail(form.email)
                            ? 'text-emerald-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {errors.email ||
                        (form.email.trim() && !validateEmail(form.email)
                          ? 'Valid email format.'
                          : 'Enter a valid email address if provided.')}
                    </span>
                  </label>

                  <label className="text-sm">
                    Room
                    <select
                      required
                      className={fieldClass}
                      value={form.roomId}
                      onChange={(event) => update('roomId', event.target.value)}
                    >
                      <option value="">
                        {loading ? 'Loading rooms...' : 'Select a room'}
                      </option>

                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.roomName || room.roomType} — ₱
                          {Number(room.rentalRate).toLocaleString()}
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

                  {form.paymentMethod === 'GCASH' && (
                    <label className="text-sm">
                      Scan to Pay reference
                      <input
                        required
                        className={fieldClass}
                        value={form.paymentReference}
                        onChange={(event) => update('paymentReference', event.target.value)}
                        placeholder="Enter the GCash reference number"
                        maxLength={100}
                      />
                    </label>
                  )}

                  <label className="text-sm">
                    Start time
                    <select
                      required
                      className={fieldClass}
                      value={form.startTime}
                      onChange={(event) => {
                        update('startTime', event.target.value);
                        update('endTime', '');
                      }}
                    >
                      <option value="">
                        {selectedHours?.isClosed
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

                  <label className="text-sm">
                    End time
                    <select
                      required
                      className={`${fieldClass} disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:text-muted-foreground`}
                      value={form.endTime}
                      disabled={!form.startTime || selectedHours?.isClosed}
                      onChange={(event) =>
                        update('endTime', event.target.value)
                      }
                    >
                      <option value="">Select end</option>

                      {endTimes.map((time) => (
                        <option key={time} value={time}>
                          {displayTime(time)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {amount > 0 && (
                  <p className="rounded-md bg-muted p-3 text-sm">
                    Total: <strong>₱{amount.toLocaleString()}</strong>
                  </p>
                )}

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
                  Create walk-in booking
                </Button>
              </form>
            </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
