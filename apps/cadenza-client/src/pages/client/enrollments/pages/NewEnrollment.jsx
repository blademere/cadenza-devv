import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  getAvailablePackages,
  getEnrollmentOptions,
  getInstructorAvailability,
  validateEnrollmentSchedule,
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
  const [, setStartTime] = useState('');
  const [selectedAvailabilityIds, setSelectedAvailabilityIds] = useState([]);

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
        setSelectedAvailabilityIds([]);
        setPaymentPlan('');

        const data = await getEnrollmentOptions(
          selectedPackage.id,
          selectedCourseId,
        );

        setInstructors(data);
      } catch (error) {
        console.error(error);
        setError(
          error?.message || 'Unable to load compatible instructors.',
        );
      } finally {
        setLoadingInstructors(false);
      }
    }

    loadInstructors();
  }, [selectedPackage, selectedCourseId]);

  const selectedInstructorData = useMemo(
    () =>
      instructors.find(
        (instructor) => String(instructor.id) === String(selectedInstructor),
      ),
    [instructors, selectedInstructor],
  );

  useEffect(() => {
    setAvailability(selectedInstructorData?.availability || []);
    setSelectedAvailabilityIds([]);
    setStartDate('');
    setStartTime('');
  }, [selectedInstructorData]);

  // Once the student chooses a start date, refresh the selected instructor's
  // slots for that exact date. The API removes slots occupied by an active
  // enrollment or instructor block, so booked times cannot be selected again.
  useEffect(() => {
    if (
      !startDate ||
      !selectedPackage?.id ||
      !selectedInstructor ||
      !selectedCourseId
    ) {
      return undefined;
    }

    let cancelled = false;

    async function refreshAvailabilityForDate() {
      try {
        setLoadingAvailability(true);
        const result = await getInstructorAvailability(
          selectedPackage.id,
          selectedInstructor,
          selectedCourseId,
          startDate,
        );

        if (cancelled) {
          return;
        }

        const availableRules = Array.isArray(result?.availability)
          ? result.availability
          : [];

        setAvailability(availableRules);
        setSelectedAvailabilityIds((current) =>
          current.filter((id) => availableRules.some((rule) => rule.id === id)),
        );
      } catch (error) {
        if (!cancelled) {
          setError(error?.message || 'Unable to refresh instructor availability.');
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    }

    refreshAvailabilityForDate();

    return () => {
      cancelled = true;
    };
  }, [
    startDate,
    selectedPackage?.id,
    selectedInstructor,
    selectedCourseId,
  ]);

  // Keep the order in which the student selected the weekly schedule.
  // The first selected rule is the first day of the enrollment cycle.
  const selectedAvailability = selectedAvailabilityIds
    .map((id) => availability.find((rule) => rule.id === id))
    .filter(Boolean);

  const getDayOfWeekFromDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    const javascriptDay = date.getDay();
    return javascriptDay === 0 ? 7 : javascriptDay;
  };

  const startDayOfWeek = startDate
    ? getDayOfWeekFromDate(startDate)
    : null;
  const firstSelectedRule = selectedAvailability[0];
  const selectedStartRule =
    firstSelectedRule?.dayOfWeek === startDayOfWeek
      ? firstSelectedRule
      : null;
  const resolvedStartTime = selectedStartRule
    ? `${String(Math.floor(selectedStartRule.startMinute / 60)).padStart(
        2,
        '0',
      )}:${String(selectedStartRule.startMinute % 60).padStart(2, '0')}`
    : '';

  const handleInstructorSelect = (instructor) => {
    setSelectedInstructor(instructor.id);
    setAvailability(instructor.availability || []);
    setSelectedAvailabilityIds([]);
    setStartDate('');
    setStartTime('');
    setError('');
  };

  const toggleAvailability = (rule) => {
    const isSelected = selectedAvailabilityIds.includes(rule.id);

    setSelectedAvailabilityIds((current) => {
      if (isSelected) {
        return current.filter((id) => id !== rule.id);
      }

      const requiredCount = Number(selectedPackage?.sessionsPerWeek);
      const selectedDays = availability
        .filter((item) => current.includes(item.id))
        .map((item) => item.dayOfWeek);

      if (
        current.length >= requiredCount ||
        selectedDays.includes(rule.dayOfWeek)
      ) {
        return current;
      }

      return [...current, rule.id];
    });

    if (isSelected && rule.dayOfWeek === startDayOfWeek) {
      setStartTime('');
    } else if (!isSelected && rule.dayOfWeek === startDayOfWeek) {
      const hours = Math.floor(rule.startMinute / 60);
      const minutes = rule.startMinute % 60;
      setStartTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      );
    }
  };

  const handleStartDateChange = (value) => {
    if (!value) {
      setStartDate('');
      setStartTime('');
      setError('');
      return;
    }

    const dayOfWeek = getDayOfWeekFromDate(value);
    const firstRule = firstSelectedRule;

    if (!firstRule || firstRule.dayOfWeek !== dayOfWeek) {
      setStartDate(value);
      setStartTime('');
      setError(
        firstRule
          ? `The start date must be a ${formatDay(firstRule.dayOfWeek)} because that is the first day in your selected weekly schedule.`
          : 'Select your weekly schedule before choosing a start date.',
      );
      return;
    }

    setStartDate(value);
    setError('');

    const hours = Math.floor(firstRule.startMinute / 60);
    const minutes = firstRule.startMinute % 60;
    setStartTime(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    );
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;

    return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`;
  };

  const formatDay = (dayOfWeek) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
      // Availability uses ISO-style weekdays: Monday = 1, Sunday = 7.
      new Date(2024, 0, dayOfWeek),
    );

  const getDateTime = () => {
    if (!startDate || !resolvedStartTime) {
      return null;
    }

    return new Date(`${startDate}T${resolvedStartTime}:00`);
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

    if (!startDate) {
      setError('Please select a start date.');
      return;
    }

    if (selectedAvailability.length === 0) {
      setError('Please choose your weekly schedule.');
      return;
    }

    if (!resolvedStartTime) {
      setError(
        `The start date must be a ${formatDay(firstSelectedRule.dayOfWeek)} because it must match the first schedule you selected.`,
      );
      return;
    }

    const scheduledStart = getDateTime();

    if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) {
      setError('Invalid schedule.');
      return;
    }

    const sessionDuration = selectedPackage.sessionDurationMinutes;
    const sessionsPerWeek = Number(selectedPackage.sessionsPerWeek);

    if (!Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1) {
      setError(
        'This package does not have a valid Times per Week configuration.',
      );
      return;
    }

    const totalSessions = Number(selectedPackage.numberOfSessions);

    if (!Number.isInteger(totalSessions) || totalSessions < sessionsPerWeek) {
      setError(
        'This package must have at least enough sessions for one complete week.',
      );
      return;
    }

    if (selectedAvailability.length !== sessionsPerWeek) {
      setError(
        `Please choose exactly ${sessionsPerWeek} available time(s) per week for this package.`,
      );
      return;
    }

    if (!selectedStartRule) {
      setError(
        `The start date must be ${firstSelectedRule ? formatDay(firstSelectedRule.dayOfWeek) : 'the first selected schedule day'} because it starts the weekly schedule.`,
      );
      return;
    }

    const dayOfWeek = firstSelectedRule.dayOfWeek;
    const weeklyRules = [...selectedAvailability]
      .sort((first, second) => first.dayOfWeek - second.dayOfWeek)
      .filter((rule, index, rules) =>
        rules.findIndex((item) => item.dayOfWeek === rule.dayOfWeek) === index,
      );

    const selectedRuleIndex = weeklyRules.findIndex(
      (rule) => rule.dayOfWeek === dayOfWeek,
    );
    const orderedWeeklyRules = [
      ...weeklyRules.slice(selectedRuleIndex),
      ...weeklyRules.slice(0, selectedRuleIndex),
    ];
    const selectedWeeklyRules = orderedWeeklyRules.slice(0, sessionsPerWeek);

    let sessions;

    try {
      sessions = Array.from(
        { length: totalSessions },
        (_, index) => {
        const week = Math.floor(index / sessionsPerWeek);
        const rule = selectedWeeklyRules[index % sessionsPerWeek];
        const dayOffset =
          (rule.dayOfWeek - dayOfWeek + 7) % 7;
        const sessionStart = new Date(scheduledStart);

        sessionStart.setDate(
          sessionStart.getDate() + week * 7 + dayOffset,
        );
        if (index > 0) {
          sessionStart.setHours(
            Math.floor(rule.startMinute / 60),
            rule.startMinute % 60,
            0,
            0,
          );
        }

        const sessionEnd = new Date(
          sessionStart.getTime() + sessionDuration * 60 * 1000,
        );

        if (
          sessionStart.getHours() * 60 + sessionStart.getMinutes() <
            rule.startMinute ||
          sessionEnd.getHours() * 60 + sessionEnd.getMinutes() >
            rule.endMinute
        ) {
          throw new Error(
            `The generated ${formatDay(rule.dayOfWeek)} session is outside the instructor's availability.`,
          );
        }

        return {
          instructorId: selectedInstructor,
          scheduledStart: sessionStart,
          scheduledEnd: sessionEnd,
        };
        },
      );
    } catch (error) {
      setError(error.message || 'Unable to create the requested schedule.');
      return;
    }

    const sessionsByWeek = sessions.reduce((counts, session) => {
      const week = Math.floor(
        (session.scheduledStart.getTime() - scheduledStart.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      counts[week] = (counts[week] || 0) + 1;
      return counts;
    }, {});

    if (Object.values(sessionsByWeek).some((count, index, counts) => {
      const isFinalWeek = index === counts.length - 1;
      return count > sessionsPerWeek || (!isFinalWeek && count !== sessionsPerWeek);
    })) {
      setError(
        `This schedule must contain exactly ${sessionsPerWeek} session(s) per complete week.`,
      );
      return;
    }

    const formattedSessions = sessions.map((session) => ({
      ...session,
      scheduledStart: formatLocalDateTime(session.scheduledStart),
      scheduledEnd: formatLocalDateTime(session.scheduledEnd),
    }));

    try {
      setSubmitting(true);

      await validateEnrollmentSchedule({
        lessonPackageId: selectedPackage.id,
        sessions: formattedSessions,
        metadata: {
          courseId: selectedCourseId || null,
        },
      });

      localStorage.setItem(
        'cadenza-pending-enrollment-checkout',
        JSON.stringify({
          package: selectedPackage,
          paymentPlan,
          lessonPackageId: selectedPackage.id,
          sessions: formattedSessions,
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

              <p className="text-sm font-medium text-foreground">
                {selectedPackage.sessionsPerWeek} session(s) per week required
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
              with enough available days for {selectedPackage?.sessionsPerWeek}{' '}
              session(s) per week are shown.
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
                No instructors match this course and package schedule. An
                instructor must be active, mapped to this course, and have at
                least {selectedPackage?.sessionsPerWeek || 1} active schedule
                day(s) long enough for each lesson.
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
                    onClick={() => handleInstructorSelect(instructor)}
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
                      Choose {selectedPackage.sessionsPerWeek} time(s) per week
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Select the days and times you want to attend. You have
                      selected {selectedAvailability.length} of{' '}
                      {selectedPackage.sessionsPerWeek}.
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {availability.map((rule) => (
                        (() => {
                          const isSelected =
                            selectedAvailabilityIds.includes(rule.id);
                          const hasAnotherTimeOnDay = selectedAvailability.some(
                            (selectedRule) =>
                              selectedRule.dayOfWeek === rule.dayOfWeek &&
                              selectedRule.id !== rule.id,
                          );

                          return (
                        <button
                          type="button"
                          key={rule.id}
                          onClick={() => toggleAvailability(rule)}
                          disabled={
                            !isSelected &&
                            (selectedAvailability.length >=
                              Number(selectedPackage.sessionsPerWeek) ||
                              hasAnotherTimeOnDay)
                          }
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-background hover:bg-accent'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="font-medium">
                            {formatDay(rule.dayOfWeek)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatTime(rule.startMinute)} -{' '}
                            {formatTime(rule.endMinute)}
                          </span>
                        </button>
                          );
                        })()
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
                    onChange={(event) =>
                      handleStartDateChange(event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>

                {startDate && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    {!selectedStartRule ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Select a start date on{' '}
                        {firstSelectedRule
                          ? formatDay(firstSelectedRule.dayOfWeek)
                          : 'the first selected schedule day'}{' '}
                        so the first class starts at that day&apos;s available
                        time.
                      </p>
                    ) : !resolvedStartTime ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        The instructor&apos;s availability is shorter than the
                        selected session duration.
                      </p>
                    ) : null}
                  </div>
                )}

                {startDate && resolvedStartTime && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium">Selected Schedule</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(
                        `${startDate}T${resolvedStartTime}:00`,
                      ).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(
                        `${startDate}T${resolvedStartTime}:00`,
                      ).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Each session lasts{' '}
                      {selectedPackage.sessionDurationMinutes} minutes.
                    </p>

                    <p className="mt-1 text-xs font-medium text-primary">
                      The schedule will include exactly{' '}
                      {selectedPackage.sessionsPerWeek} session(s) per week.
                    </p>
                  </div>
                )}
            </div>
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
