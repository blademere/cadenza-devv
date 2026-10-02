import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  getAvailablePackages,
  getCompatibleInstructors,
  getInstructorAvailability,
} from '../services/enrollmentServices';

export default function NewEnrollment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const packageId = searchParams.get('package');
  const courseId = searchParams.get('course');

  const [instructors, setInstructors] = useState([]);
  const [availability, setAvailability] = useState([]);

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('');

  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');

  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const handlePaymentComplete = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== 'CADENZA_ENROLLMENT_PAYMENT_COMPLETED' ||
        !event.data?.enrollmentId
      ) {
        return;
      }

      setSubmitting(false);
      navigate(`/client/enrollments/${event.data.enrollmentId}`);
    };

    window.addEventListener('message', handlePaymentComplete);

    return () => {
      window.removeEventListener('message', handlePaymentComplete);
    };
  }, [navigate]);

  const selectedCourse = useMemo(
    () =>
      selectedPackage?.lessons?.find(
        (course) =>
          String(course.id || course.courseId) === String(courseId),
      ) || selectedPackage?.lessons?.[0],
    [selectedPackage, courseId],
  );

  const selectedCourseId =
    selectedCourse?.id || selectedCourse?.courseId || courseId;

  useEffect(() => {
    async function loadPackage() {
      if (!packageId) {
        setError('No enrollment package was selected.');
        setLoadingPackages(false);
        return;
      }

      try {
        setLoadingPackages(true);
        setError('');

        const data = await getAvailablePackages();

        const currentPackage = data.find(
          (item) => String(item.id) === String(packageId),
        );

        if (!currentPackage) {
          setError('The selected package is not available.');
          return;
        }

        setSelectedPackage(currentPackage);
      } catch (error) {
        console.error(error);
        setError('Unable to load the selected package.');
      } finally {
        setLoadingPackages(false);
      }
    }

    loadPackage();
  }, [packageId]);

  useEffect(() => {
    async function loadInstructors() {
      if (!selectedPackage?.id || !selectedCourseId) {
        setInstructors([]);
        setLoadingInstructors(false);
        return;
      }

      try {
        setLoadingInstructors(true);
        setError('');
        setSelectedInstructor('');
        setAvailability([]);
        setStartTime('');
        setPaymentPlan('');

        const data = await getCompatibleInstructors(
          selectedPackage.id,
          selectedCourseId,
        );

        setInstructors(data);
      } catch (error) {
        console.error(error);
        setError('Unable to load compatible instructors.');
      } finally {
        setLoadingInstructors(false);
      }
    }

    loadInstructors();
  }, [selectedPackage, selectedCourseId]);

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedPackage?.id || !selectedInstructor) {
        setAvailability([]);
        return;
      }

      try {
        setLoadingAvailability(true);
        setError('');

        const data = await getInstructorAvailability(
          selectedPackage.id,
          selectedInstructor,
          selectedCourseId,
        );

        setAvailability(data?.availability || []);
      } catch (error) {
        console.error(error);
        setAvailability([]);
        setError('Unable to load instructor availability.');
      } finally {
        setLoadingAvailability(false);
      }
    }

    loadAvailability();
  }, [selectedPackage, selectedInstructor, selectedCourseId]);

  const selectedInstructorData = useMemo(
    () =>
      instructors.find(
        (instructor) => String(instructor.id) === String(selectedInstructor),
      ),
    [instructors, selectedInstructor],
  );

  const selectedDayAvailability = useMemo(() => {
    if (!startDate) {
      return [];
    }

    const date = new Date(`${startDate}T00:00:00`);
    const javascriptDay = date.getDay();
    const dayOfWeek = javascriptDay === 0 ? 7 : javascriptDay;

    return availability.filter((item) => item.dayOfWeek === dayOfWeek);
  }, [startDate, availability]);

  useEffect(() => {
    if (!startDate || !availability.length || !selectedPackage) {
      setStartTime('');
      return;
    }

    const sessionDuration = Number(selectedPackage.sessionDurationMinutes);
    const availableRule = selectedDayAvailability.find(
      (rule) => rule.endMinute - rule.startMinute >= sessionDuration,
    );

    if (!availableRule) {
      setStartTime('');
      return;
    }

    const hours = Math.floor(availableRule.startMinute / 60);
    const minutes = availableRule.startMinute % 60;

    setStartTime(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    );
  }, [startDate, availability, selectedDayAvailability, selectedPackage]);

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;

    return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`;
  };

  const formatDay = (dayOfWeek) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
      new Date(2024, 0, dayOfWeek),
    );

  const getDateTime = () => {
    if (!startDate || !startTime) {
      return null;
    }

    return new Date(`${startDate}T${startTime}:00`);
  };

  const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedPackage) {
      setError('Please select a package.');
      return;
    }

    if (!selectedInstructor) {
      setError('Please select an instructor.');
      return;
    }

    if (!paymentPlan) {
      setError('Please select a payment option.');
      return;
    }

    if (!startDate || !startTime) {
      setError('Please select your preferred start date and time.');
      return;
    }

    const scheduledStart = getDateTime();

    if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) {
      setError('Invalid schedule.');
      return;
    }

    const sessionDuration = selectedPackage.sessionDurationMinutes;

    const dayOfWeek =
      scheduledStart.getDay() === 0 ? 7 : scheduledStart.getDay();

    const startMinute =
      scheduledStart.getHours() * 60 + scheduledStart.getMinutes();

    const endMinute = startMinute + sessionDuration;

    const withinAvailability = availability.some(
      (rule) =>
        rule.dayOfWeek === dayOfWeek &&
        rule.startMinute <= startMinute &&
        rule.endMinute >= endMinute,
    );

    if (!withinAvailability) {
      setError("The selected time is outside the instructor's availability.");
      return;
    }

    const sessions = Array.from(
      {
        length: selectedPackage.numberOfSessions,
      },
      (_, index) => {
        const sessionStart = new Date(scheduledStart);

        const weeks = Math.floor(index / selectedPackage.sessionsPerWeek);

        const sessionInWeek = index % selectedPackage.sessionsPerWeek;

        sessionStart.setDate(
          sessionStart.getDate() + weeks * 7 + sessionInWeek,
        );

        const sessionEnd = new Date(
          sessionStart.getTime() + sessionDuration * 60 * 1000,
        );

        return {
          instructorId: selectedInstructor,
          scheduledStart: formatLocalDateTime(sessionStart),
          scheduledEnd: formatLocalDateTime(sessionEnd),
        };
      },
    );

    try {
      setSubmitting(true);

      localStorage.setItem(
        'cadenza-pending-enrollment-checkout',
        JSON.stringify({
          package: selectedPackage,
          paymentPlan,
          lessonPackageId: selectedPackage.id,
          sessions,
          metadata: {
            courseId: selectedCourseId || null,
            paymentPlan,
          },
        }),
      );

      const paymentWindow = window.open(
        `${window.location.origin}/client/enrollments/payment`,
        '_blank',
      );

      if (!paymentWindow) {
        setError(
          'The payment tab was blocked. Please allow popups for this site and try again.',
        );
        setSubmitting(false);
      }
    } catch (error) {
      console.error(error);

      setError(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to create enrollment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPackages) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Loading enrollment package...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <div>
        <button
          type="button"
          onClick={() => navigate('/client/enrollments')}
          className="mb-4 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Enrollments
        </button>

        <h1 className="text-2xl font-semibold tracking-tight">
          New Enrollment
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Choose an instructor and schedule for your selected package.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {selectedPackage && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Course
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {selectedCourse?.name || 'Course'}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Package: {selectedPackage.name}
              </p>

            </div>

            <div className="text-left sm:text-right">
              <p className="text-xl font-semibold">
                ₱
                {Number(selectedPackage.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

              <p className="text-sm text-muted-foreground">
                {selectedPackage.numberOfSessions} sessions
              </p>

              <p className="text-sm text-muted-foreground">
                {selectedPackage.sessionDurationMinutes} minutes per session
              </p>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Choose Instructor</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Only instructors mapped to{' '}
              <span className="font-medium text-foreground">
                {selectedCourse?.name || 'this course'}
              </span>{' '}
              are shown.
            </p>
          </div>

          {loadingInstructors ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Loading compatible instructors...
              </p>
            </div>
          ) : instructors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No compatible instructors are currently available for this
                package.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {instructors.map((instructor) => {
                const selected = instructor.id === selectedInstructor;

                return (
                  <button
                    key={instructor.id}
                    type="button"
                    onClick={() => setSelectedInstructor(instructor.id)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{instructor.name}</p>

                        {instructor.email && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {instructor.email}
                          </p>
                        )}

                        {instructor.courses?.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Courses: {instructor.courses.map((course) => course.name).join(', ')}
                          </p>
                        )}
                      </div>

                      {selected && (
                        <span className="text-xs font-medium text-primary">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedInstructorData && (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Choose Schedule</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Select the preferred starting date and time for your lessons
                with{' '}
                <span className="font-medium text-foreground">
                  {selectedInstructorData.name}
                </span>
                .
              </p>
            </div>

            {loadingAvailability ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Loading instructor availability...
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {availability.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      This instructor does not have any availability configured
                      yet.
                    </p>
                  </div>
                )}

                {availability.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-sm font-medium">
                      Instructor&apos;s Registered Availability
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {availability.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <span className="font-medium">
                            {formatDay(rule.dayOfWeek)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatTime(rule.startMinute)} -{' '}
                            {formatTime(rule.endMinute)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>

                  <input
                    type="date"
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>

                {startDate && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    {selectedDayAvailability.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        The instructor is not available on this day.
                      </p>
                    ) : !startTime ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        The instructor&apos;s availability is shorter than the
                        selected session duration.
                      </p>
                    ) : null}
                  </div>
                )}

                {startDate && startTime && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium">Selected Schedule</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(
                        `${startDate}T${startTime}:00`,
                      ).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(
                        `${startDate}T${startTime}:00`,
                      ).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Each session lasts{' '}
                      {selectedPackage.sessionDurationMinutes} minutes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Payment Option</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your payment option before proceeding.
          </p>

          <div className="mt-4 grid gap-2">
            {[
              ['DOWN_PAYMENT', '50% down payment'],
              ['FULL_PAYMENT', 'Full payment'],
            ].map(([value, label]) => (
              <label
                key={value}
                className={`rounded-lg border p-3 text-sm font-medium ${
                  paymentPlan === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <input
                  type="radio"
                  name="enrollment-payment-plan"
                  value={value}
                  checked={paymentPlan === value}
                  onChange={(event) => setPaymentPlan(event.target.value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            The QR payment page will open in a separate tab.
          </p>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/client/enrollments')}
            className="h-10 rounded-md border border-border px-5 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              !selectedPackage ||
              !selectedInstructor ||
              !startDate ||
              !startTime ||
              !paymentPlan
            }
            className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Enrollment'}
          </button>
        </div>
      </form>
    </div>
  );
}
